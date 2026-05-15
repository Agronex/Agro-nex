import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";

import chatRoutes from "./routes/chatRoutes.js";
import weatherRoutes from "./routes/weatherRoutes.js";
import alertRoutes from "./routes/alertRoutes.js";
import diseaseRoutes from "./routes/diseaseRoutes.js";

dotenv.config();

const app = express();

// ── Security headers ─────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS — restrict to known origins in production ───────────────────────────
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : [
      "http://localhost:5173",
      "http://localhost:4173",
    ];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Render health checks)
      if (!origin) return callback(null, true);
      if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "1mb" }));

// ── Global rate limiter — prevents DoS ──────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});
app.use(globalLimiter);

// ── Stricter limiter for expensive AI/ML routes ───────────────────────────────
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { error: "Rate limit reached for AI endpoints. Please wait a moment." },
});

// ── Routes ───────────────────────────────────────────────────────────────────
app.use("/chat", aiLimiter, chatRoutes);
app.use("/weather", weatherRoutes);
app.use("/alerts", alertRoutes);
app.use("/disease", aiLimiter, diseaseRoutes);

// ── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", ts: Date.now() });
});

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ── Global error handler — never expose stack traces in prod ─────────────────
app.use((err, req, res, _next) => {
  const isProd = process.env.NODE_ENV === "production";
  console.error("[Server Error]", err.message);
  res.status(err.status || 500).json({
    error: isProd ? "Internal server error" : err.message,
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ AgroNex server running on port ${PORT}`);
});