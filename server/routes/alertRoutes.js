import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();
const TOMORROW_KEY = process.env.TOMORROW_KEY;

// In-memory cache for alert generation
const alertCache = {};
const ALERT_CACHE_DURATION = 1000 * 60 * 5; // 5 minutes

/**
 * GET /alerts?lat=XX&lon=YY
 * Generates real-time weather-based farm alerts.
 */
router.get("/", async (req, res) => {
  const { lat, lon } = req.query;

  if (!lat || !lon) {
    // Return base alerts without weather context
    return res.json(generateStaticAlerts());
  }

  const cacheKey = `${parseFloat(lat).toFixed(2)}_${parseFloat(lon).toFixed(2)}`;

  // Check cache
  if (alertCache[cacheKey] && Date.now() - alertCache[cacheKey].time < ALERT_CACHE_DURATION) {
    return res.json(alertCache[cacheKey].data);
  }

  try {
    // Fetch weather data from Open-Meteo
    const openUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,precipitation_sum,weathercode&hourly=relative_humidity_2m&forecast_days=3&timezone=auto`;
    const openRaw = await fetch(openUrl).then((r) => r.json());

    const current = openRaw.current_weather;
    const daily = openRaw.daily;

    // Get current humidity
    const now = new Date();
    const currentHourISO = now.toISOString().slice(0, 13);
    const hourIndex = openRaw.hourly.time.findIndex((t) => t.startsWith(currentHourISO));
    const humidity = hourIndex >= 0 ? openRaw.hourly.relative_humidity_2m[hourIndex] : 60;

    const temp = current.temperature;
    const windspeed = current.windspeed;
    const weatherCode = current.weathercode;
    const tomorrowRain = daily.precipitation_sum[1] || 0;
    const tomorrowMaxTemp = daily.temperature_2m_max[1] || temp;

    // Tomorrow.io for UV index
    let uvIndex = 0;
    if (TOMORROW_KEY) {
      try {
        const tmrRaw = await fetch(
          `https://api.tomorrow.io/v4/weather/realtime?location=${lat},${lon}&apikey=${TOMORROW_KEY}`
        ).then((r) => (r.ok ? r.json() : {}));
        uvIndex = tmrRaw?.data?.values?.uvIndex || 0;
      } catch (_) {}
    }

    const alerts = generateWeatherAlerts({ temp, humidity, windspeed, weatherCode, tomorrowRain, tomorrowMaxTemp, uvIndex });

    // Cache the result
    alertCache[cacheKey] = { data: alerts, time: Date.now() };

    res.json(alerts);
  } catch (err) {
    console.error("Alert route error:", err);
    res.json(generateStaticAlerts()); // Fall back to static alerts on error
  }
});

function generateWeatherAlerts({ temp, humidity, windspeed, weatherCode, tomorrowRain, tomorrowMaxTemp, uvIndex }) {
  const alerts = [];
  const now = new Date().toISOString();
  let id = 1;

  // 🌧️ Heavy rain tomorrow
  if (tomorrowRain > 20) {
    alerts.push({
      id: String(id++),
      type: "weather",
      severity: "critical",
      title: "Heavy Rain Alert",
      message: `Heavy rainfall of ${tomorrowRain.toFixed(1)}mm expected tomorrow. Protect your crops, check drainage systems, and delay fertilizer application.`,
      timestamp: now,
      read: false,
    });
  } else if (tomorrowRain > 8) {
    alerts.push({
      id: String(id++),
      type: "weather",
      severity: "warning",
      title: "Rain Expected Tomorrow",
      message: `Moderate rainfall of ${tomorrowRain.toFixed(1)}mm forecast tomorrow. Consider adjusting irrigation schedule.`,
      timestamp: now,
      read: false,
    });
  }

  // 🌡️ High temperature
  if (temp > 38) {
    alerts.push({
      id: String(id++),
      type: "irrigation",
      severity: "critical",
      title: "Extreme Heat Alert",
      message: `Current temperature is ${temp}°C. Increase irrigation frequency, water crops in early morning or evening to minimize evaporation.`,
      timestamp: now,
      read: false,
    });
  } else if (temp > 33) {
    alerts.push({
      id: String(id++),
      type: "irrigation",
      severity: "warning",
      title: "High Temperature",
      message: `Temperature at ${temp}°C. Ensure adequate soil moisture and consider shade nets for sensitive crops.`,
      timestamp: now,
      read: false,
    });
  }

  // 💧 High humidity — fungal risk
  if (humidity > 85) {
    alerts.push({
      id: String(id++),
      type: "disease",
      severity: "critical",
      title: "High Fungal Disease Risk",
      message: `Humidity at ${humidity}% — ideal conditions for fungal infections (brown spot, leaf blight). Apply preventive fungicides and improve field drainage.`,
      timestamp: now,
      read: false,
    });
  } else if (humidity > 75) {
    alerts.push({
      id: String(id++),
      type: "disease",
      severity: "warning",
      title: "Elevated Fungal Risk",
      message: `Humidity at ${humidity}%. Monitor crops for early signs of fungal disease. Ensure proper plant spacing for airflow.`,
      timestamp: now,
      read: false,
    });
  }

  // 🌬️ High wind
  if (windspeed > 40) {
    alerts.push({
      id: String(id++),
      type: "weather",
      severity: "critical",
      title: "Strong Wind Alert",
      message: `Wind speed at ${windspeed} km/h. Risk of crop lodging and physical damage. Consider staking tall crops.`,
      timestamp: now,
      read: false,
    });
  }

  // ☀️ UV Index
  if (uvIndex > 9) {
    alerts.push({
      id: String(id++),
      type: "weather",
      severity: "warning",
      title: "Extreme UV Index",
      message: `UV Index is ${uvIndex} — very high. Avoid working in the field without sun protection between 10 AM–4 PM.`,
      timestamp: now,
      read: false,
    });
  }

  // 🌩️ Thunderstorm forecast (weatherCode 95+)
  if (weatherCode >= 95) {
    alerts.push({
      id: String(id++),
      type: "weather",
      severity: "critical",
      title: "Thunderstorm Warning",
      message: "Thunderstorm conditions detected. Seek shelter, stay away from open fields and tall trees.",
      timestamp: now,
      read: false,
    });
  }

  // ✅ Optimal conditions — informational
  if (humidity >= 50 && humidity <= 70 && temp >= 20 && temp <= 30 && tomorrowRain < 5) {
    alerts.push({
      id: String(id++),
      type: "irrigation",
      severity: "info",
      title: "Optimal Growing Conditions",
      message: `Temperature (${temp}°C) and humidity (${humidity}%) are ideal for crop growth. Good time for fertilizer application.`,
      timestamp: now,
      read: true,
    });
  }

  // 🕐 Irrigation timing advice
  if (temp >= 28 && tomorrowRain < 5) {
    alerts.push({
      id: String(id++),
      type: "irrigation",
      severity: "info",
      title: "Evening Irrigation Recommended",
      message: `With temperatures at ${temp}°C and low rain forecast, irrigate crops in the early morning (5–7 AM) or evening (6–8 PM) to minimize evaporation.`,
      timestamp: now,
      read: true,
    });
  }

  // If no alerts generated, add a "all clear" message
  if (alerts.length === 0) {
    alerts.push({
      id: String(id++),
      type: "weather",
      severity: "info",
      title: "All Clear",
      message: "Weather conditions are favorable for farming. No significant risks detected.",
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
      message: "Allow location access to receive real-time weather-based farm alerts.",
      timestamp: now,
      read: false,
    },
  ];
}

export default router;
