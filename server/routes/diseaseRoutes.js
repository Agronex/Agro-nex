import express from "express";
import multer from "multer";
import fetch from "node-fetch";
import FormData from "form-data";

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

const ML_BASE = (process.env.ML_SERVICE_URL || "http://localhost:8000").replace(/\/+$/, "");
const ML_TIMEOUT_MS = 30000;
const ML_MAX_RETRIES = 1;

const handleDisease = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    let mlResponse = null;
    let lastErr = null;

    for (let attempt = 0; attempt <= ML_MAX_RETRIES; attempt++) {
      let timer;
      try {
        const form = new FormData();
        form.append("image", req.file.buffer, {
          filename: req.file.originalname || "image.jpg",
          contentType: req.file.mimetype,
        });

        const controller = new AbortController();
        timer = setTimeout(() => controller.abort(), ML_TIMEOUT_MS);
        mlResponse = await fetch(`${ML_BASE}/predict`, {
          method: "POST",
          body: form,
          headers: form.getHeaders(),
          signal: controller.signal,
        });

        if (mlResponse.status >= 500 && attempt < ML_MAX_RETRIES) {
          lastErr = new Error(`ML service returned ${mlResponse.status}`);
          mlResponse = null;
          continue;
        }
        break;
      } catch (err) {
        lastErr = err;
        if (attempt < ML_MAX_RETRIES && (err.name === "AbortError" || err.code === "ECONNRESET")) {
          continue;
        }
        throw err;
      } finally {
        clearTimeout(timer);
      }
    }

    if (!mlResponse) {
      console.error("ML service failed after retries:", lastErr?.message);
      return res.status(503).json({
        error: "ML service unavailable",
        message: "The disease detection service did not respond. Please try again later.",
      });
    }

    if (!mlResponse.ok) {
      const errText = await mlResponse.text();
      return res.status(500).json({ error: "ML service error", details: errText });
    }

    return res.json(await mlResponse.json());
  } catch (err) {
    console.error("Disease route error:", err);
    if (err.code === "ECONNREFUSED" || err.name === "AbortError") {
      return res.status(503).json({
        error: "ML service unavailable",
        message: "The disease detection service is not running. Please try again later.",
      });
    }
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        error: "File too large",
        message: "Image must be smaller than 8MB.",
      });
    }
    return res.status(500).json({ error: "Internal server error", message: err.message });
  }
};

router.post("/", upload.single("image"), handleDisease);
router.post("/predict", upload.single("image"), handleDisease);

export default router;
