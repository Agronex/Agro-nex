import express from "express";
import fetch from "node-fetch";

const router = express.Router();
const TOMORROW_KEY = process.env.TOMORROW_KEY;

// ⏱ In-memory cache
const openCache = {}; // Open-Meteo cache: short duration
const tmrCache = {};  // Tomorrow.io cache: longer duration
const OPEN_CACHE_DURATION = 1000 * 60 * 0.1; // 6 seconds for testing; adjust as needed
const TMR_CACHE_DURATION = 1000 * 60 * 1;    // 1 minute

router.post("/", async (req, res) => {
  const { lat, lon } = req.body;
  if (!lat || !lon) return res.status(400).json({ error: "Missing lat/lon" });

  const cacheKey = `${lat.toFixed(2)}_${lon.toFixed(2)}`;

  try {
    // ✅ Open-Meteo cache
    let openRaw;
    if (openCache[cacheKey] && Date.now() - openCache[cacheKey].time < OPEN_CACHE_DURATION) {
      openRaw = openCache[cacheKey].data;
    } else {
      const openUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode&hourly=relative_humidity_2m&forecast_days=5&timezone=auto`;
      openRaw = await fetch(openUrl).then(res => res.json());
      openCache[cacheKey] = { data: openRaw, time: Date.now() };
    }

    const current = openRaw.current_weather;
    const daily = openRaw.daily;

    // Get current hour index for humidity
    const now = new Date();
    const currentHourISO = now.toISOString().slice(0, 13); // YYYY-MM-DDTHH
    const currentHourIndex = openRaw.hourly.time.findIndex(t => t.startsWith(currentHourISO));
    const currentHumidity = currentHourIndex >= 0 ? openRaw.hourly.relative_humidity_2m[currentHourIndex] : 0;

    const forecast = daily.time.map((date, i) => ({
      date,
      temperature: {
        max: daily.temperature_2m_max[i],
        min: daily.temperature_2m_min[i],
      },
      condition: mapWeatherCode(daily.weathercode[i]),
      rainfall: daily.precipitation_sum[i],
    }));

    // ✅ Tomorrow.io cache (for UV, precipitation, etc.)
    let tmrRaw = {};
    if (TOMORROW_KEY) {
      if (tmrCache[cacheKey] && Date.now() - tmrCache[cacheKey].time < TMR_CACHE_DURATION) {
        tmrRaw = tmrCache[cacheKey].data;
      } else {
        tmrRaw = await fetch(`https://api.tomorrow.io/v4/weather/realtime?location=${lat},${lon}&apikey=${TOMORROW_KEY}`)
          .then(res => (res.ok ? res.json() : {}));
        tmrCache[cacheKey] = { data: tmrRaw, time: Date.now() };
      }
    }

    const tmrValues = tmrRaw?.data?.values || {};
    const result = {
      temperature: current.temperature,
      humidity: currentHumidity,                     // ✅ from Open-Meteo
      rainfall: tmrValues.precipitationIntensity ?? daily.precipitation_sum[0] ?? 0,
      windSpeed: current.windspeed,
      uvIndex: tmrValues.uvIndex ?? 0,
      condition: mapWeatherCode(current.weathercode),
      forecast,
    };

    res.json(result);
  } catch (err) {
    console.error("Weather API error:", err);
    res.status(500).json({ error: "Failed to fetch weather data" });
  }
});

function mapWeatherCode(code) {
  const codes = {
    0: "Clear",
    1: "Mainly Clear",
    2: "Partly Cloudy",
    3: "Cloudy",
    45: "Foggy",
    48: "Rime Fog",
    51: "Light Drizzle",
    61: "Light Rain",
    63: "Rain",
    65: "Heavy Rain",
    71: "Snow",
    80: "Showers",
    95: "Thunderstorm",
  };
  return codes[code] ?? "Unknown";
}

export default router;
