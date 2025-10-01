import request from 'supertest';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import archiver from 'archiver';
import { logServerInfo } from '../src/lib/serverLog';
import {
  errorHandler,
  apiNotFoundHandler,
} from '../src/middleware/errorHandler';

// Load environment variables
import * as dotenv from 'dotenv';
dotenv.config();

// Create test app (similar to main app but for testing)
const createTestApp = () => {
  const app = express();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 200 * 1024 * 1024 },
  }); // 200MB

  app.use(cors());
  app.use(express.json({ limit: "5mb" }));
  app.use(express.urlencoded({ extended: true }));

  // Custom JSON error handler to catch malformed JSON
  app.use((error: any, req: any, res: any, next: any) => {
    if (
      error instanceof SyntaxError &&
      (error as any).status === 400 &&
      "body" in error
    ) {
      // This is a JSON parsing error
      return res.status(400).json({
        ok: false,
        error: "Invalid JSON format",
      });
    }
    next(error);
  });

  // Health
  app.get("/api/health", (_req: any, res: any) => {
    res.json({ ok: true, mock: true, serverTime: new Date().toISOString() });
  });

  // Mock captions
  app.post("/api/captions", (req: any, res: any) => {
    // Ensure content type is JSON
    if (!req.is("application/json")) {
      return res.status(400).json({
        ok: false,
        error: "Content-Type must be application/json",
      });
    }

    const { transcript, tone = "default", maxLen = 120 } = req.body ?? {};

    // Input validation
    if (
      !transcript ||
      typeof transcript !== "string" ||
      transcript.trim().length === 0
    ) {
      return res.status(400).json({
        ok: false,
        error: "transcript is required and must be a non-empty string",
      });
    }

    if (typeof maxLen !== "number" || maxLen < 10 || maxLen > 500) {
      return res.status(400).json({
        ok: false,
        error: "maxLen must be a number between 10 and 500",
      });
    }

    if (
      typeof tone !== "string" ||
      !["default", "professional", "casual", "funny"].includes(tone)
    ) {
      return res.status(400).json({
        ok: false,
        error: "tone must be one of: default, professional, casual, funny",
      });
    }

    const base = transcript
      .slice(0, Math.max(20, Math.min(maxLen, 180)))
      .replace(/\s+/g, " ")
      .trim();

    res.json({
      ok: true,
      captions: {
        tweet: `MOCK: ${base}${base.length > 0 ? "." : ""}`,
        instagram: `MOCK: ${base} #forge #creators`,
        youtube: `MOCK: ${base} — generated with Forge`,
      },
    });
  });

  // Client log sink
  app.post("/api/log", (req: any, res: any) => {
    const { name, meta = {} } = req.body ?? {};

    // Input validation
    if (!name || typeof name !== "string") {
      return res.status(400).json({
        ok: false,
        error: "Missing or invalid required field: name (must be a string)",
      });
    }

    if (name.length > 100) {
      return res.status(400).json({
        ok: false,
        error: "name field is too long (max 100 characters)",
      });
    }

    if (meta && typeof meta !== "object") {
      return res.status(400).json({
        ok: false,
        error: "meta field must be an object",
      });
    }

    // Log with timestamp and structured format
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [log-event] ${name}`, meta);

    res.json({ ok: true });
  });

  // Export captions bundle as a ZIP of text files
  app.post(
    "/api/exportZip",
    (req: any, res: any, next: any) => {
      // Ensure content type is JSON
      if (!req.is("application/json")) {
        return res.status(400).json({
          ok: false,
          error: "Content-Type must be application/json",
        });
      }

      const { transcript, tweet, instagram, youtube, captions } = req.body ?? {};

      // Input validation
      if (
        !transcript &&
        !tweet &&
        !instagram &&
        !youtube &&
        (!captions || Object.keys(captions).length === 0)
      ) {
        return res.status(400).json({
          ok: false,
          error: "At least one content field is required",
        });
      }

      // Validate data types
      if (transcript && typeof transcript !== "string") {
        return res.status(400).json({
          ok: false,
          error: "transcript must be a string",
        });
      }

      if (tweet && typeof tweet !== "string") {
        return res.status(400).json({
          ok: false,
          error: "tweet must be a string",
        });
      }

      if (instagram && typeof instagram !== "string") {
        return res.status(400).json({
          ok: false,
          error: "instagram must be a string",
        });
      }

      if (youtube && typeof youtube !== "string") {
        return res.status(400).json({
          ok: false,
          error: "youtube must be a string",
        });
      }

      if (captions && typeof captions !== "object") {
        return res.status(400).json({
          ok: false,
          error: "captions must be an object",
        });
      }

      try {
        res.setHeader("Content-Type", "application/zip");
        res.setHeader(
          "Content-Disposition",
          'attachment; filename="forge_export.zip"'
        );

        const zip = archiver("zip", { zlib: { level: 9 } });
        zip.on("error", next);
        zip.pipe(res);

        // Add transcript if provided
        if (transcript) {
          zip.append(transcript, { name: "transcript.txt" });
        }

        // Add caption files
        if (tweet) {
          zip.append(tweet, { name: "tweet.txt" });
        }
        if (instagram) {
          zip.append(instagram, { name: "instagram.txt" });
        }
        if (youtube) {
          zip.append(youtube, { name: "youtube.txt" });
        }

        // Add any additional captions from the captions object
        if (captions && typeof captions === "object") {
          Object.entries(captions).forEach(([key, value]) => {
            if (value && typeof value === "string") {
              zip.append(value, { name: `${key}.txt` });
            }
          });
        }

        zip.finalize();
      } catch (err) {
        next(err as Error);
      }
    }
  );

  // 404 for /api/*
  app.use("/api", apiNotFoundHandler);

  // Error handler
  app.use(errorHandler);

  return app;
};

describe('API Endpoint Consistency Tests', () => {
  let app: express.Application;

  beforeAll(() => {
    app = createTestApp();
  });

  describe('GET /api/health', () => {
    it('should return { ok: true } with server info', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('ok', true);
      expect(response.body).toHaveProperty('mock', true);
      expect(response.body).toHaveProperty('serverTime');
      expect(typeof response.body.serverTime).toBe('string');
    });
  });

  describe('POST /api/captions', () => {
    it('should return { ok: true } with captions on valid request', async () => {
      const response = await request(app)
        .post('/api/captions')
        .send({
          transcript: 'This is a test transcript for caption generation',
          tone: 'professional',
          maxLen: 120
        })
        .expect(200);

      expect(response.body).toHaveProperty('ok', true);
      expect(response.body).toHaveProperty('captions');
      expect(response.body.captions).toHaveProperty('tweet');
      expect(response.body.captions).toHaveProperty('instagram');
      expect(response.body.captions).toHaveProperty('youtube');
    });

    it('should return { ok: false, error: "..." } on missing transcript', async () => {
      const response = await request(app)
        .post('/api/captions')
        .send({
          tone: 'professional',
          maxLen: 120
        })
        .expect(400);

      expect(response.body).toHaveProperty('ok', false);
      expect(response.body).toHaveProperty('error');
      expect(typeof response.body.error).toBe('string');
    });

    it('should return { ok: false, error: "..." } on invalid content type', async () => {
      const response = await request(app)
        .post('/api/captions')
        .set('Content-Type', 'text/plain')
        .send('invalid data')
        .expect(400);

      expect(response.body).toHaveProperty('ok', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Content-Type must be application/json');
    });

    it('should return { ok: false, error: "..." } on invalid tone', async () => {
      const response = await request(app)
        .post('/api/captions')
        .send({
          transcript: 'Test transcript',
          tone: 'invalid-tone',
          maxLen: 120
        })
        .expect(400);

      expect(response.body).toHaveProperty('ok', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('tone must be one of');
    });

    it('should return { ok: false, error: "..." } on invalid maxLen', async () => {
      const response = await request(app)
        .post('/api/captions')
        .send({
          transcript: 'Test transcript',
          tone: 'professional',
          maxLen: 5 // Too small
        })
        .expect(400);

      expect(response.body).toHaveProperty('ok', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('maxLen must be a number between 10 and 500');
    });
  });

  describe('POST /api/log', () => {
    it('should return { ok: true } on valid request', async () => {
      const response = await request(app)
        .post('/api/log')
        .send({
          name: 'test-event',
          meta: { key: 'value' }
        })
        .expect(200);

      expect(response.body).toHaveProperty('ok', true);
    });

    it('should return { ok: false, error: "..." } on missing name', async () => {
      const response = await request(app)
        .post('/api/log')
        .send({
          meta: { key: 'value' }
        })
        .expect(400);

      expect(response.body).toHaveProperty('ok', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Missing or invalid required field: name');
    });

    it('should return { ok: false, error: "..." } on invalid name type', async () => {
      const response = await request(app)
        .post('/api/log')
        .send({
          name: 123,
          meta: { key: 'value' }
        })
        .expect(400);

      expect(response.body).toHaveProperty('ok', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Missing or invalid required field: name');
    });

    it('should return { ok: false, error: "..." } on name too long', async () => {
      const longName = 'a'.repeat(101);
      const response = await request(app)
        .post('/api/log')
        .send({
          name: longName,
          meta: { key: 'value' }
        })
        .expect(400);

      expect(response.body).toHaveProperty('ok', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('name field is too long');
    });

    it('should return { ok: false, error: "..." } on invalid meta type', async () => {
      const response = await request(app)
        .post('/api/log')
        .send({
          name: 'test-event',
          meta: 'invalid-meta'
        })
        .expect(400);

      expect(response.body).toHaveProperty('ok', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('meta field must be an object');
    });
  });

  describe('POST /api/exportZip', () => {
    it('should return ZIP file on valid request', async () => {
      const response = await request(app)
        .post('/api/exportZip')
        .send({
          transcript: 'Test transcript content',
          tweet: 'Test tweet content',
          instagram: 'Test Instagram content',
          youtube: 'Test YouTube content'
        })
        .expect(200);

      expect(response.headers['content-type']).toContain('application/zip');
      expect(response.headers['content-disposition']).toContain('attachment; filename="forge_export.zip"');
    });

    it('should return { ok: false, error: "..." } on missing content', async () => {
      const response = await request(app)
        .post('/api/exportZip')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('ok', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('At least one content field is required');
    });

    it('should return { ok: false, error: "..." } on invalid content type', async () => {
      const response = await request(app)
        .post('/api/exportZip')
        .set('Content-Type', 'text/plain')
        .send('invalid data')
        .expect(400);

      expect(response.body).toHaveProperty('ok', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Content-Type must be application/json');
    });

    it('should return { ok: false, error: "..." } on invalid transcript type', async () => {
      const response = await request(app)
        .post('/api/exportZip')
        .send({
          transcript: 123, // Should be string
          tweet: 'Test tweet'
        })
        .expect(400);

      expect(response.body).toHaveProperty('ok', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('transcript must be a string');
    });

    it('should return { ok: false, error: "..." } on invalid captions type', async () => {
      const response = await request(app)
        .post('/api/exportZip')
        .send({
          transcript: 'Test transcript',
          captions: 'invalid-captions' // Should be object
        })
        .expect(400);

      expect(response.body).toHaveProperty('ok', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('captions must be an object');
    });
  });

  describe('Error handling', () => {
    it('should return { ok: false, error: "..." } for 404 API routes', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .expect(404);

      expect(response.body).toHaveProperty('ok', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('API endpoint not found');
    });

    it('should return { ok: false, error: "..." } for malformed JSON', async () => {
      const response = await request(app)
        .post('/api/captions')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      expect(response.body).toHaveProperty('ok', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid JSON format');
    });
  });

  describe('API Response Format Consistency', () => {
    it('should return consistent response format for all endpoints', async () => {
      // Test health endpoint
      const healthResponse = await request(app).get('/api/health');
      expect(healthResponse.body).toHaveProperty('ok', true);

      // Test captions endpoint with valid data
      const captionsResponse = await request(app)
        .post('/api/captions')
        .send({ transcript: 'Test transcript' });
      expect(captionsResponse.body).toHaveProperty('ok', true);

      // Test log endpoint with valid data
      const logResponse = await request(app)
        .post('/api/log')
        .send({ name: 'test-event' });
      expect(logResponse.body).toHaveProperty('ok', true);

      // Test exportZip endpoint with valid data
      const exportResponse = await request(app)
        .post('/api/exportZip')
        .send({ transcript: 'Test content' });
      expect(exportResponse.status).toBe(200); // ZIP response, not JSON
    });

    it('should return consistent error format for all endpoints', async () => {
      // Test captions endpoint with invalid data
      const captionsResponse = await request(app)
        .post('/api/captions')
        .send({});
      expect(captionsResponse.body).toHaveProperty('ok', false);
      expect(captionsResponse.body).toHaveProperty('error');

      // Test log endpoint with invalid data
      const logResponse = await request(app)
        .post('/api/log')
        .send({});
      expect(logResponse.body).toHaveProperty('ok', false);
      expect(logResponse.body).toHaveProperty('error');

      // Test exportZip endpoint with invalid data
      const exportResponse = await request(app)
        .post('/api/exportZip')
        .send({});
      expect(exportResponse.body).toHaveProperty('ok', false);
      expect(exportResponse.body).toHaveProperty('error');
    });
  });
});
