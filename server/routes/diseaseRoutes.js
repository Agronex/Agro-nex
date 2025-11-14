import express from "express";
import multer from "multer";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();
const upload = multer();

// Replace with your Hugging Face token from .env
const HF_TOKEN = process.env.HF_TOKEN;

router.post("/", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json([{ label: "Invalid", score: 0 }]);
    }

    const response = await fetch(
      "https://router.huggingface.co/hf-inference/models/wambugu71/crop_leaf_diseases_vit",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HF_TOKEN}`,
          "Content-Type": "application/octet-stream",
        },
        body: req.file.buffer,
      }
    );

    const text = await response.text();

    let predictions;
    try {
      predictions = JSON.parse(text);
    } catch {
      predictions = [{ label: "Invalid", score: 0 }];
    }

    res.json(predictions);
  } catch (err) {
    console.error("Disease API error:", err);
    res.status(500).json([{ label: "Invalid", score: 0 }]);
  }
});

export default router;
