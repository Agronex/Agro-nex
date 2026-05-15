import express from "express";
import { OpenAI } from "openai";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

const client = new OpenAI({
  baseURL: "https://router.huggingface.co/v1",
  apiKey: process.env.HF_TOKEN,
});

// Farming-focused system prompt to prevent off-topic abuse
const SYSTEM_PROMPT =
  "You are an expert agricultural assistant helping farmers. " +
  "Answer questions about crops, diseases, weather, irrigation, soil, fertilization, and farming practices. " +
  "Keep answers concise and practical. If a question is completely unrelated to farming, politely redirect.";

router.post("/", async (req, res) => {
  const { message } = req.body;

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return res.status(400).json({ error: "Message is required." });
  }

  if (message.length > 2000) {
    return res.status(400).json({ error: "Message too long (max 2000 chars)." });
  }

  try {
    const chatCompletion = await client.chat.completions.create({
      model: "deepseek-ai/DeepSeek-V3.2-Exp:novita",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: message.trim() },
      ],
      max_tokens: 512,
      temperature: 0.7,
    });

    const reply =
      chatCompletion.choices?.[0]?.message?.content ||
      "⚠️ Sorry, I couldn't generate a response.";

    res.json({ reply });
  } catch (err) {
    console.error("[Chat] API error:", err.message);
    res.status(500).json({ reply: "⚠️ AI service temporarily unavailable. Please try again." });
  }
});

export default router;
