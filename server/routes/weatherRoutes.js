import express from "express";
import fetch from "node-fetch";

const router = express.Router();

const TOMORROW_KEY = process.env.TOMORROW_KEY;

// ⏱ In-memory cache
const openCache = {};
const tmrCache = {};

const OPEN_CACHE_DURATION = 1000 * 60 * 10; // 10 minutes
const TMR_CACHE_DURATION  = 1000 * 60 * 10; // 10 minutes

router.post("/", async (req, res) => {
  try {
    const { lat, lon } = req.body;

    // Safer validation
    if (lat == null || lon == null) {
      return res.status(400).json({
        error: "Missing lat/lon",
      });
    }

    const cacheKey = `${Number(lat).toFixed(2)}_${Number(lon).toFixed(2)}`;

    // =========================
    // OPEN-METEO FETCH + CACHE
    // =========================

    let openRaw;

    if (
      openCache[cacheKey] &&
      Date.now() - openCache[cacheKey].time < OPEN_CACHE_DURATION
    ) {
      openRaw = openCache[cacheKey].data;
    } else {
      const openUrl =
        `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${lat}` +
        `&longitude=${lon}` +
        `&current_weather=true` +
        `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode` +
        `&hourly=relative_humidity_2m` +
        `&forecast_days=5` +
        `&timezone=auto`;

      const response = await fetch(openUrl);

      if (!response.ok) {
        throw new Error(
          `Open-Meteo API failed with status ${response.status}`
        );
      }

      openRaw = await response.json();

      openCache[cacheKey] = {
        data: openRaw,
        time: Date.now(),
      };
    }

    // =========================
    // VALIDATE RESPONSE
    // =========================

    if (
      !openRaw ||
      !openRaw.current_weather ||
      !openRaw.daily
    ) {
      console.error(
        "Invalid Open-Meteo response:",
        JSON.stringify(openRaw, null, 2)
      );

      return res.status(500).json({
        error: "Invalid weather API response",
      });
    }

    const current = openRaw.current_weather;
    const daily = openRaw.daily;

    // =========================
    // SAFE HUMIDITY EXTRACTION
    // =========================

    const now = new Date();
    const currentHourISO = now.toISOString().slice(0, 13);

    const hourlyTimes = openRaw?.hourly?.time || [];
    const humidityData =
      openRaw?.hourly?.relative_humidity_2m || [];

    const currentHourIndex = hourlyTimes.findIndex((t) =>
      t.startsWith(currentHourISO)
    );

    const currentHumidity =
      currentHourIndex >= 0
        ? humidityData[currentHourIndex]
        : 0;

    // =========================
    // FORECAST MAPPING
    // =========================

    const forecast = (daily.time || []).map((date, i) => ({
      date,
      temperature: {
        max: daily.temperature_2m_max?.[i] ?? 0,
        min: daily.temperature_2m_min?.[i] ?? 0,
      },
      condition: mapWeatherCode(daily.weathercode?.[i]),
      rainfall: daily.precipitation_sum?.[i] ?? 0,
    }));

    // =========================
    // TOMORROW.IO FETCH + CACHE
    // =========================

    let tmrRaw = {};

    if (TOMORROW_KEY) {
      if (
        tmrCache[cacheKey] &&
        Date.now() - tmrCache[cacheKey].time < TMR_CACHE_DURATION
      ) {
        tmrRaw = tmrCache[cacheKey].data;
      } else {
        try {
          const tmrResponse = await fetch(
            `https://api.tomorrow.io/v4/weather/realtime?location=${lat},${lon}&apikey=${TOMORROW_KEY}`
          );

          if (tmrResponse.ok) {
            tmrRaw = await tmrResponse.json();

            tmrCache[cacheKey] = {
              data: tmrRaw,
              time: Date.now(),
            };
          } else {
            console.warn(
              `Tomorrow.io API failed with status ${tmrResponse.status}`
            );
          }
        } catch (tmrErr) {
          console.warn("Tomorrow.io fetch failed:", tmrErr.message);
        }
      }
    }

    // =========================
    // FINAL RESPONSE
    // =========================

    const tmrValues = tmrRaw?.data?.values || {};

    const result = {
      temperature: current.temperature ?? 0,

      humidity: currentHumidity,

      rainfall:
        tmrValues.precipitationIntensity ??
        daily.precipitation_sum?.[0] ??
        0,

      windSpeed: current.windspeed ?? 0,

      uvIndex: tmrValues.uvIndex ?? 0,

      condition: mapWeatherCode(current.weathercode),

      forecast,
    };

    res.json(result);

  } catch (err) {
    console.error("Weather API error:", err);

    res.status(500).json({
      error: err.message || "Failed to fetch weather data",
    });
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