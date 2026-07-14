import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";

import chatRoutes from "./routes/chatRoutes.js";
import weatherRoutes from "./routes/weatherRoutes.js";
import alertRoutes from "./routes/alertRoutes.js";
import diseaseRoutes from "./routes/diseaseRoutes.js";

dotenv.config();

// ── Process-level error handlers — prevent silent crashes ─────────────────────
process.on("uncaughtException", (err) => {
  console.error("[UNCAUGHT EXCEPTION]", err.message, err.stack);
});
process.on("unhandledRejection", (reason) => {
  console.error("[UNHANDLED REJECTION]", reason);
});

const app = express();

// ── Security headers ─────────────────────────────────────────────────────────
app.use(helmet());

// ── Response compression ──────────────────────────────────────────────────────
app.use(compression());

// ── CORS — allow configured origins plus Vercel preview domains ──────────────
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : [];

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (origin === "http://localhost:5173") return true;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  // Allow any Vercel deployment / preview URL unless explicitly overridden
  return /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Render health checks)
      if (isAllowedOrigin(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "512kb" }));

// ── Request timeout middleware ────────────────────────────────────────────────
app.use((req, res, next) => {
  const timeoutMs = req.path.startsWith("/chat/stream") ? 60000 : 30000;
  req.setTimeout(timeoutMs);
  res.setTimeout(timeoutMs, () => {
    if (!res.headersSent) {
      res.status(408).json({ error: "Request timeout" });
    }
  });
  next();
});

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
  res.set("Cache-Control", "public, max-age=10");
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
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ AgroNex server running on port ${PORT}`);
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
function gracefulShutdown(signal) {
  console.log(`\n🛑 ${signal} received — shutting down gracefully…`);
  server.close(() => {
    console.log("✅ HTTP server closed.");
    process.exit(0);
  });
  // Force exit after 10s if connections won't drain
  setTimeout(() => {
    console.error("⚠️  Forced shutdown after timeout.");
    process.exit(1);
  }, 10000).unref();
}
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));