import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const HF_API_TOKEN = process.env.HF_API_KEY;
const HF_MODEL = "tiiuae/falcon-7b-instruct"; // hosted instruction model

app.post("/chat", async (req, res) => {
  const { message } = req.body;

  try {
    const response = await fetch(`https://api-inference.huggingface.co/models/${HF_MODEL}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${HF_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: message }),
    });

    const data = await response.json();
    console.log("HF raw response:", data);

    let reply = "";
    if (Array.isArray(data) && data[0]?.generated_text) {
      reply = data[0].generated_text;
    } else if (data.generated_text) {
      reply = data.generated_text;
    } else if (data.error) {
      reply = "⚠️ HF API error: " + data.error;
    } else {
      reply = "⚠️ Sorry, I couldn’t understand that.";
    }

    res.json({ reply });
  } catch (err) {
    console.error("HF API error:", err);
    res.status(500).json({ reply: "⚠️ Server error." });
  }
});

app.listen(5000, () => console.log("✅ Server running on http://localhost:5000"));
