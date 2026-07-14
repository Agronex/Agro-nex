import express from "express";
import logger from "../services/lib-logger.js";
import weatherService from "../services/weatherService.js";
import { makeCacheKey, inFlightRequests } from "../services/lib-cache.js";

const router = express.Router();

const ALERT_CACHE_DURATION = Number(process.env.ALERT_CACHE_MS) || 1000 * 60 * 5; // 5m
const MAX_ALERTS_CACHE_SIZE = 50;
const alertsCache = new Map();

/**
 * GET /alerts?lat=XX&lon=YY
 * Generates intelligent weather-based farming alerts
 */
router.get("/", async (req, res) => {
  try {
    const { lat, lon } = req.query;

    if (lat == null || lon == null) {
      return res.json(generateStaticAlerts());
    }

    const parsedLat = Number(lat);
    const parsedLon = Number(lon);

    if (Number.isNaN(parsedLat) || Number.isNaN(parsedLon)) {
      return res.status(400).json({ error: "Invalid latitude or longitude" });
    }

    const key = makeCacheKey(parsedLat, parsedLon);

    // Alerts cache short-circuits repeated work
    const cached = alertsCache.get(key);
    if (cached && Date.now() - cached.time < ALERT_CACHE_DURATION) {
      logger.info("Alerts cache hit", { key });
      res.set("Cache-Control", "public, max-age=300");
      return res.json(cached.data);
    }

    // Deduplicate alert generation
    const inflightKey = `alerts_${key}`;
    if (inFlightRequests.has(inflightKey)) {
      logger.info("Waiting for in-flight alerts generation", { key });
      const result = await inFlightRequests.get(inflightKey);
      return res.json(result);
    }

    const promise = (async () => {
      // Use shared weather service (Open-Meteo only through service)
      const openRes = await weatherService.getOpenMeteoRaw(parsedLat, parsedLon, { days: 3 });
      const openRaw = openRes.data;

      if (!openRaw || !openRaw.current_weather || !openRaw.daily) {
        logger.warn("Invalid Open-Meteo data for alerts", { key });
        return generateStaticAlerts();
      }

      // Extract humidity safely
      const nowDate = new Date();
      const currentHourISO = nowDate.toISOString().slice(0, 13);
      const hourlyTimes = openRaw?.hourly?.time || [];
      const humidityValues = openRaw?.hourly?.relative_humidity_2m || [];
      const hourIndex = hourlyTimes.findIndex((t) => t.startsWith(currentHourISO));
      const humidity = hourIndex >= 0 ? humidityValues[hourIndex] : 60;

      const current = openRaw.current_weather;
      const daily = openRaw.daily;

      const temp = current.temperature ?? 25;
      const windspeed = current.windspeed ?? 0;
      const weatherCode = current.weathercode ?? 0;
      const tomorrowRain = daily?.precipitation_sum?.[1] ?? 0;
      const tomorrowMaxTemp = daily?.temperature_2m_max?.[1] ?? temp;

      // Only call Tomorrow.io when UV is actually required for alerts
      let uvIndex = 0;
      if (process.env.TOMORROW_KEY) {
        const tmr = await weatherService.getUV(parsedLat, parsedLon);
        if (tmr && tmr.data) uvIndex = tmr.data?.data?.values?.uvIndex || 0;
      }

      const alerts = generateWeatherAlerts({
        temp,
        humidity,
        windspeed,
        weatherCode,
        tomorrowRain,
        tomorrowMaxTemp,
        uvIndex,
      });

      // store in route-level cache (evict oldest if at capacity)
      if (alertsCache.size >= MAX_ALERTS_CACHE_SIZE) {
        const oldestKey = alertsCache.keys().next().value;
        alertsCache.delete(oldestKey);
      }
      alertsCache.set(key, { data: alerts, time: Date.now() });

      return alerts;
    })();

    inFlightRequests.set(inflightKey, promise);
    try {
      const alerts = await promise;
      res.set("Cache-Control", "public, max-age=300");
      return res.json(alerts);
    } finally {
      inFlightRequests.delete(inflightKey);
    }

  } catch (err) {
    logger.error("Alert route error", { message: err.message });
    return res.json(generateStaticAlerts());
  }
});

// =========================
// ALERT GENERATOR (unchanged logic, thin route)
// =========================

function generateWeatherAlerts({
  temp,
  humidity,
  windspeed,
  weatherCode,
  tomorrowRain,
  tomorrowMaxTemp,
  uvIndex,
}) {
  const alerts = [];

  const now = new Date().toISOString();

  let id = 1;

  if (tomorrowRain > 20) {
    alerts.push({
      id: String(id++),
      type: "weather",
      severity: "critical",
      title: "Heavy Rain Alert",
      message:
        `Heavy rainfall of ${tomorrowRain.toFixed(1)}mm expected tomorrow. Protect crops, improve drainage, and delay fertilizer application.`,
      timestamp: now,
      read: false,
    });
  } else if (tomorrowRain > 8) {
    alerts.push({
      id: String(id++),
      type: "weather",
      severity: "warning",
      title: "Rain Expected Tomorrow",
      message: `Moderate rainfall of ${tomorrowRain.toFixed(1)}mm expected tomorrow. Adjust irrigation schedules accordingly.`,
      timestamp: now,
      read: false,
    });
  }

  if (temp > 38) {
    alerts.push({
      id: String(id++),
      type: "irrigation",
      severity: "critical",
      title: "Extreme Heat Alert",
      message: `Current temperature is ${temp}°C. Increase irrigation frequency and water during cooler hours.`,
      timestamp: now,
      read: false,
    });
  } else if (temp > 33) {
    alerts.push({
      id: String(id++),
      type: "irrigation",
      severity: "warning",
      title: "High Temperature",
      message: `Temperature is ${temp}°C. Maintain soil moisture and monitor crop stress.`,
      timestamp: now,
      read: false,
    });
  }

  if (humidity > 85) {
    alerts.push({
      id: String(id++),
      type: "disease",
      severity: "critical",
      title: "High Fungal Disease Risk",
      message: `Humidity is ${humidity}%. Conditions favor fungal diseases. Apply preventive measures.`,
      timestamp: now,
      read: false,
    });
  } else if (humidity > 75) {
    alerts.push({
      id: String(id++),
      type: "disease",
      severity: "warning",
      title: "Elevated Fungal Risk",
      message: `Humidity is ${humidity}%. Monitor crops closely for fungal symptoms.`,
      timestamp: now,
      read: false,
    });
  }

  if (windspeed > 40) {
    alerts.push({
      id: String(id++),
      type: "weather",
      severity: "critical",
      title: "Strong Wind Alert",
      message: `Wind speed is ${windspeed} km/h. Risk of crop lodging and structural damage.`,
      timestamp: now,
      read: false,
    });
  }

  if (uvIndex > 9) {
    alerts.push({
      id: String(id++),
      type: "weather",
      severity: "warning",
      title: "Extreme UV Index",
      message: `UV Index is ${uvIndex}. Avoid prolonged field work during midday.`,
      timestamp: now,
      read: false,
    });
  }

  if (weatherCode >= 95) {
    alerts.push({
      id: String(id++),
      type: "weather",
      severity: "critical",
      title: "Thunderstorm Warning",
      message: "Thunderstorm conditions detected. Stay away from open fields.",
      timestamp: now,
      read: false,
    });
  }

  if (
    humidity >= 50 &&
    humidity <= 70 &&
    temp >= 20 &&
    temp <= 30 &&
    tomorrowRain < 5
  ) {
    alerts.push({
      id: String(id++),
      type: "irrigation",
      severity: "info",
      title: "Optimal Growing Conditions",
      message: `Current conditions are favorable for crop growth and fertilizer application.`,
      timestamp: now,
      read: true,
    });
  }

  if (temp >= 28 && tomorrowRain < 5) {
    alerts.push({
      id: String(id++),
      type: "irrigation",
      severity: "info",
      title: "Irrigation Timing Advice",
      message: "Irrigate crops early morning or evening to minimize evaporation.",
      timestamp: now,
      read: true,
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      id: String(id++),
      type: "weather",
      severity: "info",
      title: "All Clear",
      message: "Weather conditions are currently favorable for farming.",
      timestamp: now,
      read: true,
    });
  }

  return alerts;
}

function generateStaticAlerts() {
  const now = new Date().toISOString();

  return [
    {
      id: "1",
      type: "irrigation",
      severity: "info",
      title: "Enable Location",
      message: "Allow location access to receive weather-based farming alerts.",
      timestamp: now,
      read: false,
    },
  ];
}

export default router;