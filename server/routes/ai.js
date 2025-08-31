import express from "express";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { message } = req.body;

    // For now just echo
    res.json({
      reply: `🤖 AI Assistant received: "${message}" (backend connected!)`,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "AI Assistant error" });
  }
});

export default router;
