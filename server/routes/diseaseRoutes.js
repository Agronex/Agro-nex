import express from "express";
import multer from "multer";
import fetch from "node-fetch";
import FormData from "form-data";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB max file size
});

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";
const ML_TIMEOUT_MS = 30000; // 30s timeout for ML service calls
const ML_MAX_RETRIES = 1;

router.post("/disease", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    // Forward image to Python ML microservice (with timeout + retry)
    const form = new FormData();
    form.append("image", req.file.buffer, {
      filename: req.file.originalname || "image.jpg",
      contentType: req.file.mimetype,
    });

    let mlResponse = null;
    let lastErr = null;

    for (let attempt = 0; attempt <= ML_MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), ML_TIMEOUT_MS);

        mlResponse = await fetch(`${ML_SERVICE_URL}/predict`, {
          method: "POST",
          body: form,
          headers: form.getHeaders(),
          signal: controller.signal,
        });
        clearTimeout(timer);

        // Retry on 5xx server errors
        if (mlResponse.status >= 500 && attempt < ML_MAX_RETRIES) {
          console.warn(`ML service returned ${mlResponse.status}, retrying (attempt ${attempt + 1})...`);
          lastErr = new Error(`ML service returned ${mlResponse.status}`);
          mlResponse = null;
          continue;
        }

        break; // success or non-retryable error
      } catch (err) {
        clearTimeout?.(undefined); // safe no-op
        lastErr = err;
        if (attempt < ML_MAX_RETRIES && (err.name === "AbortError" || err.code === "ECONNRESET")) {
          console.warn(`ML service call failed (${err.name}), retrying (attempt ${attempt + 1})...`);
          continue;
        }
        throw err; // no more retries
      }
    }

    if (!mlResponse) {
      // All retries exhausted
      console.error("ML service failed after retries:", lastErr?.message);
      return res.status(503).json({
        error: "ML service unavailable",
        message: "The disease detection service did not respond. Please try again later.",
      });
    }

    if (!mlResponse.ok) {
      const errText = await mlResponse.text();
      console.error("ML service error:", errText);
      return res.status(500).json({ error: "ML service error", details: errText });
    }

    const result = await mlResponse.json();

    // Return the full enriched result to the frontend
    res.json(result);
  } catch (err) {
    console.error("Disease route error:", err);

    // Check if ML service is unreachable
    if (err.code === "ECONNREFUSED" || err.name === "AbortError") {
      return res.status(503).json({
        error: "ML service unavailable",
        message: "The disease detection service is not running. Please start ml_service.py.",
      });
    }

    // Multer file size exceeded
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        error: "File too large",
        message: "Image must be smaller than 8MB.",
      });
    }

    res.status(500).json({ error: "Internal server error", message: err.message });
  }
});

export default router;
