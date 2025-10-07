import express from "express";
import { OpenAI } from "openai";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

const client = new OpenAI({
  baseURL: "https://router.huggingface.co/v1",
  apiKey: process.env.HF_TOKEN ,
});

router.post("/", async (req, res) => {
  const { message } = req.body;

  try {
    // Send the user's message to the model
    const chatCompletion = await client.chat.completions.create({
      model: "deepseek-ai/DeepSeek-V3.2-Exp:novita",
      messages: [
        {
          role: "user",
          content: message,
        },
      ],
    });

    // Extract the assistant's reply
    const reply = chatCompletion.choices?.[0]?.message?.content || "⚠️ Sorry, I couldn’t understand that.";

    res.json({ reply });
  } catch (err) {
    console.error("OpenAI API error:", err);
    res.status(500).json({ reply: "⚠️ Server error." });
  }
});

export default router;
