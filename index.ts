import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import multer from "multer";
import archiver from "archiver";
import { logServerInfo } from "./src/lib/serverLog";
import {
  errorHandler,
  apiNotFoundHandler,
} from "./src/middleware/errorHandler";

// Load environment variables
import * as dotenv from "dotenv";
dotenv.config();

const PORT = Number(process.env.PORT || 8787);
const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 },
}); // 200MB

app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

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
      error: "Invalid JSON format",
    });
  }
  next(error);
});

// Health
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ ok: true, mock: true, serverTime: new Date().toISOString() });
});

// Mock captions
app.post("/api/captions", (req: Request, res: Response) => {
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

// Mock transcribe (accepts file)
app.post(
  "/api/transcribe",
  upload.single("file"),
  (req: Request, res: Response) => {
    // Input validation
    if (!req.file) {
      return res.status(400).json({
        ok: false,
        error: "No file provided. Please upload a file.",
      });
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
      return res.status(400).json({
        ok: false,
        error: `Invalid file type. Please upload an audio or video file. Detected MIME type: ${
          req.file!.mimetype
        }`,
      });
    }

    // Validate file size (already handled by multer, but add explicit check)
    if (req.file.size === 0) {
      return res.status(400).json({
        ok: false,
        error: "File is empty",
      });
    }

    res.json({
      ok: true,
      mock: true,
      language: "en",
      text: "This is a mock transcript produced by Forge mock server.",
      fileInfo: {
        originalName: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype,
      },
    });
  }
);

// Client log sink
app.post("/api/log", (req: Request, res: Response) => {
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
  (req: Request, res: Response, next: NextFunction) => {
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
  logServerInfo(`Forge server listening on http://localhost:${PORT}`, {
    port: PORT,
    apiBase: apiBase,
  });
  console.log(`🌐 Server running at: http://localhost:${PORT}`);
  console.log(`📡 API Base URL: ${apiBase}`);
  console.log(`✅ Health check: http://localhost:${PORT}/api/health`);
});
