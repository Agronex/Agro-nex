import express from "express";
import logger from "../services/lib-logger.js";
import weatherService from "../services/weatherService.js";

const router = express.Router();

// POST / (body: { lat, lon })
router.post("/", async (req, res) => {
  const start = Date.now();
  try {
    const { lat, lon } = req.body || {};

    if (lat == null || lon == null) {
      return res.status(400).json({ error: "Missing lat/lon" });
    }

    // include UV only if TOMORROW_KEY is configured; service decides actual call
    const includeUV = Boolean(process.env.TOMORROW_KEY);

    const result = await weatherService.getWeatherSummary(lat, lon, { includeUV });

    const took = Date.now() - start;
    logger.info("/weather response", { took, lat, lon });

    return res.json(result);
  } catch (err) {
    logger.error("Weather route error", { message: err.message });
    // Preserve previous API shape: return safe defaults rather than stack traces
    return res.status(500).json({
      temperature: 0,
      humidity: 0,
      rainfall: 0,
      windSpeed: 0,
      uvIndex: 0,
      condition: "Unknown",
      forecast: [],
      error: "Weather temporarily unavailable",
    });
  }
});

export default router;