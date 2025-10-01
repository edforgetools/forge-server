import request from "supertest";
import express from "express";
import cors from "cors";
import multer from "multer";
import archiver from "archiver";
import { logServerInfo } from "../src/lib/serverLog";
import {
  errorHandler,
  apiNotFoundHandler,
} from "../src/middleware/errorHandler";
import { envelopeMiddleware } from "../src/middleware/envelope";
import {
  validateSchema,
  validateContentType,
} from "../src/validation/middleware";
import { captionsSchema, exportZipSchema } from "../src/validation/schemas";

// Load environment variables
import * as dotenv from "dotenv";
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

  // Apply envelope middleware to all /api/* endpoints
  app.use("/api", envelopeMiddleware);

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
        code: "INVALID_JSON",
        message: "Invalid JSON format",
      });
    }
    next(error);
  });

  // Health
  app.get("/api/health", (_req: any, res: any) => {
    res.envelope.success(
      { mock: true, serverTime: new Date().toISOString() },
      "Server is healthy"
    );
  });

  // Mock captions
  app.post(
    "/api/captions",
    validateContentType,
    validateSchema(captionsSchema),
    (req: any, res: any) => {
      const { transcript, tone, maxLen } = req.body;

      const base = transcript
        .slice(0, Math.max(20, Math.min(maxLen, 180)))
        .replace(/\s+/g, " ")
        .trim();

      res.envelope.success(
        {
          captions: {
            tweet: `MOCK: ${base}${base.length > 0 ? "." : ""}`,
            instagram: `MOCK: ${base} #forge #creators`,
            youtube: `MOCK: ${base} — generated with Forge`,
          },
        },
        "Captions generated successfully"
      );
    }
  );

  // Client log sink
  app.post("/api/log", (req: any, res: any) => {
    const { name, meta = {} } = req.body ?? {};

    // Input validation
    if (!name || typeof name !== "string") {
      return res.envelope.error(
        "Missing or invalid required field: name (must be a string)",
        "INVALID_NAME"
      );
    }

    if (name.length > 100) {
      return res.envelope.error(
        "name field is too long (max 100 characters)",
        "FIELD_TOO_LONG"
      );
    }

    if (meta && typeof meta !== "object") {
      return res.envelope.error("meta field must be an object", "INVALID_META");
    }

    // Log with timestamp and structured format
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [log-event] ${name}`, meta);

    res.envelope.success(undefined, "Log entry recorded successfully");
  });

  // Export captions bundle as a ZIP of text files
  app.post(
    "/api/exportZip",
    validateContentType,
    validateSchema(exportZipSchema),
    (req: any, res: any, next: any) => {
      const { transcript, tweet, instagram, youtube, captions } = req.body;

      try {
        const zip = archiver("zip", { zlib: { level: 9 } });
        const files: string[] = [];

        // Add transcript if provided
        if (transcript) {
          zip.append(transcript, { name: "transcript.txt" });
          files.push("transcript.txt");
        }

        // Add caption files with stable filenames
        if (tweet) {
          zip.append(tweet, { name: "tweet.txt" });
          files.push("tweet.txt");
        }
        if (instagram) {
          zip.append(instagram, { name: "instagram.txt" });
          files.push("instagram.txt");
        }
        if (youtube) {
          zip.append(youtube, { name: "youtube.txt" });
          files.push("youtube.txt");
        }

        // Add any additional captions from the captions object
        if (captions && typeof captions === "object") {
          Object.entries(captions).forEach(([key, value]) => {
            if (value && typeof value === "string") {
              const filename = `${key}.txt`;
              zip.append(value, { name: filename });
              files.push(filename);
            }
          });
        }

        // Collect ZIP data in memory
        const chunks: Buffer[] = [];
        zip.on("data", (chunk) => chunks.push(chunk));

        zip.on("end", () => {
          const zipBuffer = Buffer.concat(chunks);
          const zipBase64 = zipBuffer.toString("base64");

          res.envelope.success(
            {
              files: files,
              zip: zipBase64,
              contentType: "application/zip",
              contentDisposition: 'attachment; filename="forge_export.zip"',
            },
            "ZIP file generated successfully"
          );
        });

        zip.on("error", next);
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

describe("API Endpoint Consistency Tests", () => {
  let app: express.Application;

  beforeAll(() => {
    app = createTestApp();
  });

  describe("GET /api/health", () => {
    it("should return { ok: true, data, message } with server info", async () => {
      const response = await request(app).get("/api/health").expect(200);

      expect(response.body).toHaveProperty("ok", true);
      expect(response.body).toHaveProperty("data");
      expect(response.body).toHaveProperty("message", "Server is healthy");
      expect(response.body.data).toHaveProperty("mock", true);
      expect(response.body.data).toHaveProperty("serverTime");
      expect(typeof response.body.data.serverTime).toBe("string");
    });
  });

  describe("POST /api/captions", () => {
    it("should return { ok: true, data, message } with captions on valid request", async () => {
      const response = await request(app)
        .post("/api/captions")
        .send({
          transcript: "This is a test transcript for caption generation",
          tone: "professional",
          maxLen: 120,
        })
        .expect(200);

      expect(response.body).toHaveProperty("ok", true);
      expect(response.body).toHaveProperty("data");
      expect(response.body).toHaveProperty(
        "message",
        "Captions generated successfully"
      );
      expect(response.body.data).toHaveProperty("captions");
      expect(response.body.data.captions).toHaveProperty("tweet");
      expect(response.body.data.captions).toHaveProperty("instagram");
      expect(response.body.data.captions).toHaveProperty("youtube");
    });

    it("should return { ok: false, code, message } on missing transcript", async () => {
      const response = await request(app)
        .post("/api/captions")
        .send({
          tone: "professional",
          maxLen: 120,
        })
        .expect(400);

      expect(response.body).toHaveProperty("ok", false);
      expect(response.body).toHaveProperty("code", "VALIDATION_ERROR");
      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toContain("transcript is required");
    });

    it("should return { ok: false, code, message } on invalid content type", async () => {
      const response = await request(app)
        .post("/api/captions")
        .set("Content-Type", "text/plain")
        .send("invalid data")
        .expect(400);

      expect(response.body).toHaveProperty("ok", false);
      expect(response.body).toHaveProperty("code", "INVALID_CONTENT_TYPE");
      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toContain(
        "Content-Type must be application/json"
      );
    });

    it("should return { ok: false, code, message } on invalid tone", async () => {
      const response = await request(app)
        .post("/api/captions")
        .send({
          transcript: "Test transcript",
          tone: "invalid-tone",
          maxLen: 120,
        })
        .expect(400);

      expect(response.body).toHaveProperty("ok", false);
      expect(response.body).toHaveProperty("code", "VALIDATION_ERROR");
      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toContain("tone must be one of");
    });

    it("should return { ok: false, code, message } on invalid maxLen", async () => {
      const response = await request(app)
        .post("/api/captions")
        .send({
          transcript: "Test transcript",
          tone: "professional",
          maxLen: 5, // Too small
        })
        .expect(400);

      expect(response.body).toHaveProperty("ok", false);
      expect(response.body).toHaveProperty("code", "VALIDATION_ERROR");
      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toContain("maxLen must be at least 10");
    });

    it("should return { ok: false, code, message } on empty transcript", async () => {
      const response = await request(app)
        .post("/api/captions")
        .send({
          transcript: "   ", // Only whitespace
          tone: "professional",
          maxLen: 120,
        })
        .expect(400);

      expect(response.body).toHaveProperty("ok", false);
      expect(response.body).toHaveProperty("code", "VALIDATION_ERROR");
      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toContain(
        "transcript cannot be empty or only whitespace"
      );
    });

    it("should return { ok: false, code, message } on oversized transcript", async () => {
      const response = await request(app)
        .post("/api/captions")
        .send({
          transcript: "a".repeat(10001), // Too long
          tone: "professional",
          maxLen: 120,
        })
        .expect(400);

      expect(response.body).toHaveProperty("ok", false);
      expect(response.body).toHaveProperty("code", "VALIDATION_ERROR");
      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toContain("transcript is too long");
    });

    it("should return { ok: false, code, message } on invalid maxLen type", async () => {
      const response = await request(app)
        .post("/api/captions")
        .send({
          transcript: "Test transcript",
          tone: "professional",
          maxLen: "not-a-number",
        })
        .expect(400);

      expect(response.body).toHaveProperty("ok", false);
      expect(response.body).toHaveProperty("code", "VALIDATION_ERROR");
      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toContain(
        "Expected number, received string"
      );
    });
  });

  describe("POST /api/log", () => {
    it("should return { ok: true, message } on valid request", async () => {
      const response = await request(app)
        .post("/api/log")
        .send({
          name: "test-event",
          meta: { key: "value" },
        })
        .expect(200);

      expect(response.body).toHaveProperty("ok", true);
      expect(response.body).toHaveProperty(
        "message",
        "Log entry recorded successfully"
      );
    });

    it("should return { ok: false, code, message } on missing name", async () => {
      const response = await request(app)
        .post("/api/log")
        .send({
          meta: { key: "value" },
        })
        .expect(400);

      expect(response.body).toHaveProperty("ok", false);
      expect(response.body).toHaveProperty("code", "INVALID_NAME");
      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toContain(
        "Missing or invalid required field: name"
      );
    });

    it("should return { ok: false, code, message } on invalid name type", async () => {
      const response = await request(app)
        .post("/api/log")
        .send({
          name: 123,
          meta: { key: "value" },
        })
        .expect(400);

      expect(response.body).toHaveProperty("ok", false);
      expect(response.body).toHaveProperty("code", "INVALID_NAME");
      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toContain(
        "Missing or invalid required field: name"
      );
    });

    it("should return { ok: false, code, message } on name too long", async () => {
      const longName = "a".repeat(101);
      const response = await request(app)
        .post("/api/log")
        .send({
          name: longName,
          meta: { key: "value" },
        })
        .expect(400);

      expect(response.body).toHaveProperty("ok", false);
      expect(response.body).toHaveProperty("code", "FIELD_TOO_LONG");
      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toContain("name field is too long");
    });

    it("should return { ok: false, code, message } on invalid meta type", async () => {
      const response = await request(app)
        .post("/api/log")
        .send({
          name: "test-event",
          meta: "invalid-meta",
        })
        .expect(400);

      expect(response.body).toHaveProperty("ok", false);
      expect(response.body).toHaveProperty("code", "INVALID_META");
      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toContain("meta field must be an object");
    });
  });

  describe("POST /api/exportZip", () => {
    it("should return JSON response with ZIP data on valid request", async () => {
      const response = await request(app)
        .post("/api/exportZip")
        .send({
          transcript: "Test transcript content",
          tweet: "Test tweet content",
          instagram: "Test Instagram content",
          youtube: "Test YouTube content",
        })
        .expect(200);

      expect(response.body).toHaveProperty("ok", true);
      expect(response.body).toHaveProperty("data");
      expect(response.body).toHaveProperty(
        "message",
        "ZIP file generated successfully"
      );
      expect(response.body.data).toHaveProperty("files");
      expect(response.body.data).toHaveProperty("zip");
      expect(response.body.data).toHaveProperty(
        "contentType",
        "application/zip"
      );
      expect(response.body.data).toHaveProperty("contentDisposition");
      expect(response.body.data.contentDisposition).toContain(
        'attachment; filename="forge_export.zip"'
      );

      // Check that files array contains expected files
      expect(response.body.data.files).toContain("transcript.txt");
      expect(response.body.data.files).toContain("tweet.txt");
      expect(response.body.data.files).toContain("instagram.txt");
      expect(response.body.data.files).toContain("youtube.txt");

      // Check that zip is base64 encoded
      expect(typeof response.body.data.zip).toBe("string");
      expect(response.body.data.zip.length).toBeGreaterThan(0);
    });

    it("should include custom captions in files array", async () => {
      const response = await request(app)
        .post("/api/exportZip")
        .send({
          transcript: "Test transcript",
          captions: {
            custom1: "Custom caption 1",
            custom2: "Custom caption 2",
          },
        })
        .expect(200);

      expect(response.body.data.files).toContain("transcript.txt");
      expect(response.body.data.files).toContain("custom1.txt");
      expect(response.body.data.files).toContain("custom2.txt");
      expect(response.body.data.files).toHaveLength(3);
    });

    it("should return { ok: false, code, message } on missing content", async () => {
      const response = await request(app)
        .post("/api/exportZip")
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty("ok", false);
      expect(response.body).toHaveProperty("code", "VALIDATION_ERROR");
      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toContain(
        "At least one content field is required"
      );
    });

    it("should return { ok: false, code, message } on invalid content type", async () => {
      const response = await request(app)
        .post("/api/exportZip")
        .set("Content-Type", "text/plain")
        .send("invalid data")
        .expect(400);

      expect(response.body).toHaveProperty("ok", false);
      expect(response.body).toHaveProperty("code", "INVALID_CONTENT_TYPE");
      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toContain(
        "Content-Type must be application/json"
      );
    });

    it("should return { ok: false, code, message } on invalid transcript type", async () => {
      const response = await request(app)
        .post("/api/exportZip")
        .send({
          transcript: 123, // Should be string
          tweet: "Test tweet",
        })
        .expect(400);

      expect(response.body).toHaveProperty("ok", false);
      expect(response.body).toHaveProperty("code", "VALIDATION_ERROR");
      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toContain(
        "Expected string, received number"
      );
    });

    it("should return { ok: false, code, message } on invalid captions type", async () => {
      const response = await request(app)
        .post("/api/exportZip")
        .send({
          transcript: "Test transcript",
          captions: "invalid-captions", // Should be object
        })
        .expect(400);

      expect(response.body).toHaveProperty("ok", false);
      expect(response.body).toHaveProperty("code", "VALIDATION_ERROR");
      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toContain(
        "Expected object, received string"
      );
    });

    it("should return { ok: false, code, message } on oversized transcript", async () => {
      const response = await request(app)
        .post("/api/exportZip")
        .send({
          transcript: "a".repeat(50001), // Too long
        })
        .expect(400);

      expect(response.body).toHaveProperty("ok", false);
      expect(response.body).toHaveProperty("code", "VALIDATION_ERROR");
      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toContain("transcript is too long");
    });

    it("should return { ok: false, code, message } on oversized tweet", async () => {
      const response = await request(app)
        .post("/api/exportZip")
        .send({
          tweet: "a".repeat(10001), // Too long
        })
        .expect(400);

      expect(response.body).toHaveProperty("ok", false);
      expect(response.body).toHaveProperty("code", "VALIDATION_ERROR");
      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toContain("tweet is too long");
    });

    it("should return { ok: false, code, message } on oversized caption value", async () => {
      const response = await request(app)
        .post("/api/exportZip")
        .send({
          captions: {
            custom: "a".repeat(10001), // Too long
          },
        })
        .expect(400);

      expect(response.body).toHaveProperty("ok", false);
      expect(response.body).toHaveProperty("code", "VALIDATION_ERROR");
      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toContain("caption value is too long");
    });
  });

  describe("Error handling", () => {
    it("should return { ok: false, code, message } for 404 API routes", async () => {
      const response = await request(app).get("/api/nonexistent").expect(404);

      expect(response.body).toHaveProperty("ok", false);
      expect(response.body).toHaveProperty("code", "ENDPOINT_NOT_FOUND");
      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toContain("API endpoint not found");
    });

    it("should return { ok: false, code, message } for malformed JSON", async () => {
      const response = await request(app)
        .post("/api/captions")
        .set("Content-Type", "application/json")
        .send('{"invalid": json}')
        .expect(400);

      expect(response.body).toHaveProperty("ok", false);
      expect(response.body).toHaveProperty("code", "INVALID_JSON");
      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toContain("Invalid JSON format");
    });
  });

  describe("API Response Format Consistency", () => {
    it("should return consistent response format for all endpoints", async () => {
      // Test health endpoint
      const healthResponse = await request(app).get("/api/health");
      expect(healthResponse.body).toHaveProperty("ok", true);
      expect(healthResponse.body).toHaveProperty("message");

      // Test captions endpoint with valid data
      const captionsResponse = await request(app)
        .post("/api/captions")
        .send({ transcript: "Test transcript" });
      expect(captionsResponse.body).toHaveProperty("ok", true);
      expect(captionsResponse.body).toHaveProperty("message");

      // Test log endpoint with valid data
      const logResponse = await request(app)
        .post("/api/log")
        .send({ name: "test-event" });
      expect(logResponse.body).toHaveProperty("ok", true);
      expect(logResponse.body).toHaveProperty("message");

      // Test exportZip endpoint with valid data
      const exportResponse = await request(app)
        .post("/api/exportZip")
        .send({ transcript: "Test content" });
      expect(exportResponse.status).toBe(200);
      expect(exportResponse.body).toHaveProperty("ok", true);
      expect(exportResponse.body).toHaveProperty("message");
    });

    it("should return consistent error format for all endpoints", async () => {
      // Test captions endpoint with invalid data
      const captionsResponse = await request(app)
        .post("/api/captions")
        .send({});
      expect(captionsResponse.body).toHaveProperty("ok", false);
      expect(captionsResponse.body).toHaveProperty("code");
      expect(captionsResponse.body).toHaveProperty("message");

      // Test log endpoint with invalid data
      const logResponse = await request(app).post("/api/log").send({});
      expect(logResponse.body).toHaveProperty("ok", false);
      expect(logResponse.body).toHaveProperty("code");
      expect(logResponse.body).toHaveProperty("message");

      // Test exportZip endpoint with invalid data
      const exportResponse = await request(app).post("/api/exportZip").send({});
      expect(exportResponse.body).toHaveProperty("ok", false);
      expect(exportResponse.body).toHaveProperty("code");
      expect(exportResponse.body).toHaveProperty("message");
    });
  });
});
