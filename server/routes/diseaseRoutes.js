import express from "express";
import multer from "multer";
import fetch from "node-fetch";
import FormData from "form-data";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

router.post("/disease", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    // Forward image to Python ML microservice
    const form = new FormData();
    form.append("image", req.file.buffer, {
      filename: req.file.originalname || "image.jpg",
      contentType: req.file.mimetype,
    });

    const mlResponse = await fetch(`${ML_SERVICE_URL}/predict`, {
      method: "POST",
      body: form,
      headers: form.getHeaders(),
    });

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
    if (err.code === "ECONNREFUSED") {
      return res.status(503).json({
        error: "ML service unavailable",
        message: "The disease detection service is not running. Please start ml_service.py.",
      });
    }

    res.status(500).json({ error: "Internal server error", message: err.message });
  }
});

export default router;
