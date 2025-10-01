import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import multer from "multer";
import archiver from "archiver";
import { logServerInfo } from "./src/lib/serverLog";
import {
  errorHandler,
  apiNotFoundHandler,
} from "./src/middleware/errorHandler";
import { envelopeMiddleware } from "./src/middleware/envelope";
import {
  validateSchema,
  validateContentType,
} from "./src/validation/middleware";
import { captionsSchema, exportZipSchema } from "./src/validation/schemas";

// Load environment variables
import * as dotenv from "dotenv";
dotenv.config();

// Load package.json for version info
import * as packageJson from "./package.json";

const PORT = Number(process.env.PORT || 8787);
const app = express();

// Track server start time for uptime calculation
const startTime = Date.now();

// Simple in-memory rate limiting store
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Rate limiting middleware for /api/* endpoints
const rateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const clientId = req.ip || "unknown";
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 100; // 100 requests per minute

  const key = clientId;
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    // First request or window expired
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return next();
  }

  if (record.count >= maxRequests) {
    return res.status(429).json({
      ok: false,
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests. Please try again later.",
      data: {
        retryAfter: Math.ceil((record.resetTime - now) / 1000),
      },
    });
  }

  record.count++;
  next();
};
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 },
}); // 200MB

// Configure CORS to only allow localhost:5173
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

// Apply rate limiting to all /api/* endpoints
app.use("/api", rateLimiter);

// Apply envelope middleware to all /api/* endpoints
app.use("/api", envelopeMiddleware);

// Custom JSON error handler to catch malformed JSON
app.use((error: any, req: Request, res: Response, next: NextFunction) => {
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

// Health endpoint
app.get("/api/health", (_req: Request, res: Response) => {
  const uptime = Math.floor((Date.now() - startTime) / 1000);
  res.envelope.success(
    {
      ok: true,
      version: packageJson.version,
      uptime: uptime,
    },
    "Server is healthy"
  );
});

// Diagnostics endpoint - no-op stub
app.get("/api/diag/log-level", (_req: Request, res: Response) => {
  res.envelope.success(
    { message: "Log level diagnostics endpoint - no-op stub" },
    "Diagnostics endpoint ready"
  );
});

// Mock captions
app.post(
  "/api/captions",
  validateContentType,
  validateSchema(captionsSchema),
  (req: Request, res: Response) => {
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

// Mock transcribe (accepts file)
app.post(
  "/api/transcribe",
  upload.single("file"),
  (req: Request, res: Response) => {
    // Input validation
    if (!req.file) {
      return res.envelope.error(
        "No file provided. Please upload a file.",
        "MISSING_FILE"
      );
    }

    // Validate file type (basic check)
    const allowedTypes = ["audio/", "video/", "application/octet-stream"];
    const isValidType = allowedTypes.some((type) =>
      req.file!.mimetype.startsWith(type)
    );

    // Also check file extension as fallback
    const allowedExtensions = [
      ".mp3",
      ".wav",
      ".mp4",
      ".mov",
      ".avi",
      ".mkv",
      ".m4a",
      ".aac",
    ];
    const hasValidExtension = allowedExtensions.some((ext) =>
      req.file!.originalname.toLowerCase().endsWith(ext)
    );

    if (!isValidType && !hasValidExtension) {
      return res.envelope.error(
        `Invalid file type. Please upload an audio or video file. Detected MIME type: ${
          req.file!.mimetype
        }`,
        "INVALID_FILE_TYPE"
      );
    }

    // Validate file size (already handled by multer, but add explicit check)
    if (req.file.size === 0) {
      return res.envelope.error("File is empty", "EMPTY_FILE");
    }

    res.envelope.success(
      {
        mock: true,
        language: "en",
        text: "This is a mock transcript produced by Forge mock server.",
        fileInfo: {
          originalName: req.file.originalname,
          size: req.file.size,
          mimeType: req.file.mimetype,
        },
      },
      "Transcription completed successfully"
    );
  }
);

// Client log sink - NDJSON format
app.post("/api/log", (req: Request, res: Response) => {
  const { ts, level, event, userAnonId, payload } = req.body ?? {};

  // Input validation
  if (!ts || typeof ts !== "string") {
    return res.envelope.error(
      "Missing or invalid required field: ts (must be ISO timestamp string)",
      "INVALID_TS"
    );
  }

  if (!level || typeof level !== "string") {
    return res.envelope.error(
      "Missing or invalid required field: level (must be a string)",
      "INVALID_LEVEL"
    );
  }

  if (!event || typeof event !== "string") {
    return res.envelope.error(
      "Missing or invalid required field: event (must be a string)",
      "INVALID_EVENT"
    );
  }

  if (!userAnonId || typeof userAnonId !== "string") {
    return res.envelope.error(
      "Missing or invalid required field: userAnonId (must be a string)",
      "INVALID_USER_ANON_ID"
    );
  }

  if (payload && typeof payload !== "object") {
    return res.envelope.error(
      "payload field must be an object",
      "INVALID_PAYLOAD"
    );
  }

  // Validate timestamp format (basic ISO string check)
  try {
    new Date(ts).toISOString();
  } catch {
    return res.envelope.error(
      "ts field must be a valid ISO timestamp string",
      "INVALID_TIMESTAMP"
    );
  }

  // Validate level enum
  const validLevels = ["debug", "info", "warn", "error"];
  if (!validLevels.includes(level)) {
    return res.envelope.error(
      `level must be one of: ${validLevels.join(", ")}`,
      "INVALID_LOG_LEVEL"
    );
  }

  // Validate string field lengths
  if (event.length > 100) {
    return res.envelope.error(
      "event field is too long (max 100 characters)",
      "FIELD_TOO_LONG"
    );
  }

  if (userAnonId.length > 100) {
    return res.envelope.error(
      "userAnonId field is too long (max 100 characters)",
      "FIELD_TOO_LONG"
    );
  }

  // Log as NDJSON line
  const logEntry = {
    ts,
    level,
    event,
    userAnonId,
    payload: payload || {},
  };

  console.log(JSON.stringify(logEntry));

  res.envelope.success(undefined, "Log entry recorded successfully");
});

// Export captions bundle as a ZIP of text files
app.post(
  "/api/exportZip",
  validateContentType,
  validateSchema(exportZipSchema),
  (req: Request, res: Response, next: NextFunction) => {
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

// Root banner
app.get("/", (_req, res) => {
  res.type("text/plain").send("Forge server is running. Try /api/health");
});

// 404 for /api/*
app.use("/api", apiNotFoundHandler);

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  const apiBase = process.env.VITE_API_BASE || `http://localhost:${PORT}`;
  const nodeEnv = process.env.NODE_ENV || "development";

  // Startup config summary logging
  const startupConfig = {
    version: packageJson.version,
    port: PORT,
    apiBase: apiBase,
    nodeEnv: nodeEnv,
    corsOrigin: "http://localhost:5173",
    rateLimit: "100 requests/minute",
    fileUploadLimit: "200MB",
    jsonLimit: "5MB",
  };

  logServerInfo(
    `Forge server starting up - v${packageJson.version}`,
    startupConfig
  );

  console.log(`🚀 Forge Server v${packageJson.version} starting up...`);
  console.log(`🌐 Server running at: http://localhost:${PORT}`);
  console.log(`📡 API Base URL: ${apiBase}`);
  console.log(`🔧 Environment: ${nodeEnv}`);
  console.log(`✅ Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔍 Diagnostics: http://localhost:${PORT}/api/diag/log-level`);
  console.log(`📊 Startup config:`, JSON.stringify(startupConfig, null, 2));
});
