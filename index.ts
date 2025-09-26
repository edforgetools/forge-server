import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import multer from "multer";
import archiver from "archiver";
import { z } from "zod";

const app = express();

// CORS: allow Vercel prod, allow localhost in dev
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN;
const origins: string[] = [];
if (FRONTEND_ORIGIN) origins.push(FRONTEND_ORIGIN);
if (process.env.NODE_ENV !== "production") {
  origins.push("http://localhost:5173", "http://127.0.0.1:5173");
}
app.use(cors({ origin: origins.length ? origins : true }));

// Rate limit
app.use(rateLimit({ windowMs: 60_000, max: 60, standardHeaders: true, legacyHeaders: false }));

// Body
app.use(express.json({ limit: "2mb" }));

// Uploads (validate later)
const upload = multer({ limits: { fileSize: 1_000_000_000 } }); // 1 GB

// Flags
const MOCK = process.env.MOCK_OPENAI === "1";

// Health
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, mock: MOCK });
});

// Transcribe
app.post("/api/transcribe", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file received" });
  const name = req.file.originalname || "";
  const ok = /\.(mp4|mov|m4v|webm)$/i.test(name);
  if (!ok) return res.status(415).json({ error: "Unsupported file type" });

  if (MOCK) return res.json({ transcript: "MOCK transcript: hello creators." });

  return res.status(501).json({ error: "REAL mode not implemented" });
});

// Captions
const CaptionsBody = z.object({
  transcript: z.string().min(1),
  tone: z.enum(["default", "hype", "educational"]).default("default"),
});

app.post("/api/captions", async (req, res) => {
  const parsed = CaptionsBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });
  const { tone } = parsed.data;

  if (MOCK) {
    const tweet =
      tone === "hype"
        ? "MOCK: New drop. Big energy. Watch now."
        : tone === "educational"
        ? "MOCK: Today’s lesson in creator growth. Thread inside."
        : "MOCK: New episode out now. Hot takes and cold facts.";
    const instagram =
      tone === "hype"
        ? "MOCK: New drop. Link in bio."
        : tone === "educational"
        ? "MOCK: Learn with us. Full convo in bio."
        : "MOCK: Full convo linked in bio.";
    return res.json({ tweet, instagram });
  }

  return res.status(501).json({ error: "REAL mode not implemented" });
});

// Export zip
app.post("/api/exportZip", async (req, res) => {
  const body = z
    .object({
      transcript: z.string().min(1),
      tweet: z.string().min(1),
      instagram: z.string().min(1),
    })
    .safeParse(req.body);

  if (!body.success) return res.status(400).json({ error: "Invalid body" });

  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", 'attachment; filename="forge_export.zip"');

  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.on("error", (err) => res.status(500).end(String(err)));
  archive.pipe(res);
  archive.append(body.data.transcript, { name: "transcript.txt" });
  archive.append(body.data.tweet, { name: "tweet.txt" });
  archive.append(body.data.instagram, { name: "instagram.txt" });
  await archive.finalize();
});

// Start
const PORT = Number(process.env.PORT || 8787);
app.listen(PORT, () => {
  console.log(`server on :${PORT}`);
});
