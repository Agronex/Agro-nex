import express from "express";
import fetch from "node-fetch"; // install if not already: npm install node-fetch

const router = express.Router();

// Using DialoGPT-small (free conversational model)
const HF_MODEL = "microsoft/DialoGPT-small";

router.post("/chat", async (req, res) => {
  const { message } = req.body;

  try {
    const response = await fetch(
      `https://api-inference.huggingface.co/models/${HF_MODEL}`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.HF_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ inputs: message })
      }
    );

    const data = await response.json();

    // Hugging Face returns an array of generated text
    let reply = "Sorry, I couldn’t generate a response.";
    if (Array.isArray(data) && data.length > 0 && data[0].generated_text) {
      reply = data[0].generated_text;
    }

    res.json({ reply });
  } catch (error) {
    console.error("Hugging Face API error:", error);
    res.status(500).json({ error: "Chatbot service unavailable" });
  }
});

export default router;
