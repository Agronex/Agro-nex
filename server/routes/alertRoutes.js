import express from "express";
import fetch from "node-fetch";

const router = express.Router();

const TOMORROW_KEY = process.env.TOMORROW_KEY;

// =========================
// CACHE CONFIG
// =========================

const alertCache = {};

const ALERT_CACHE_DURATION = 1000 * 60 * 5; // 5 minutes

// =========================
// ROUTE
// =========================

/**
 * GET /alerts?lat=XX&lon=YY
 * Generates intelligent weather-based farming alerts
 */
router.get("/", async (req, res) => {
  try {
    const { lat, lon } = req.query;

    // =========================
    // NO LOCATION PROVIDED
    // =========================

    if (lat == null || lon == null) {
      return res.json(generateStaticAlerts());
    }

    const parsedLat = Number(lat);
    const parsedLon = Number(lon);

    if (Number.isNaN(parsedLat) || Number.isNaN(parsedLon)) {
      return res.status(400).json({
        error: "Invalid latitude or longitude",
      });
    }

    const cacheKey =
      `${parsedLat.toFixed(2)}_${parsedLon.toFixed(2)}`;

    // =========================
    // CACHE HIT
    // =========================

    if (
      alertCache[cacheKey] &&
      Date.now() - alertCache[cacheKey].time <
        ALERT_CACHE_DURATION
    ) {
      return res.json(alertCache[cacheKey].data);
    }

    // =========================
    // OPEN-METEO FETCH
    // =========================

    const openUrl =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${parsedLat}` +
      `&longitude=${parsedLon}` +
      `&current_weather=true` +
      `&daily=temperature_2m_max,precipitation_sum,weathercode` +
      `&hourly=relative_humidity_2m` +
      `&forecast_days=3` +
      `&timezone=auto`;

    const openResponse = await fetch(openUrl);

    if (!openResponse.ok) {
      throw new Error(
        `Open-Meteo API failed with status ${openResponse.status}`
      );
    }

    const openRaw = await openResponse.json();

    // =========================
    // VALIDATE API RESPONSE
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

      return res.json(generateStaticAlerts());
    }

    const current = openRaw.current_weather;
    const daily = openRaw.daily;

    // =========================
    // SAFE HUMIDITY EXTRACTION
    // =========================

    const nowDate = new Date();

    const currentHourISO =
      nowDate.toISOString().slice(0, 13);

    const hourlyTimes =
      openRaw?.hourly?.time || [];

    const humidityValues =
      openRaw?.hourly?.relative_humidity_2m || [];

    const hourIndex = hourlyTimes.findIndex((t) =>
      t.startsWith(currentHourISO)
    );

    const humidity =
      hourIndex >= 0
        ? humidityValues[hourIndex]
        : 60;

    // =========================
    // WEATHER VALUES
    // =========================

    const temp = current.temperature ?? 25;

    const windspeed = current.windspeed ?? 0;

    const weatherCode = current.weathercode ?? 0;

    const tomorrowRain =
      daily?.precipitation_sum?.[1] ?? 0;

    const tomorrowMaxTemp =
      daily?.temperature_2m_max?.[1] ?? temp;

    // =========================
    // TOMORROW.IO UV INDEX
    // =========================

    let uvIndex = 0;

    if (TOMORROW_KEY) {
      try {
        const tmrResponse = await fetch(
          `https://api.tomorrow.io/v4/weather/realtime?location=${parsedLat},${parsedLon}&apikey=${TOMORROW_KEY}`
        );

        if (tmrResponse.ok) {
          const tmrRaw = await tmrResponse.json();

          uvIndex =
            tmrRaw?.data?.values?.uvIndex || 0;
        } else {
          console.warn(
            `Tomorrow.io API failed with status ${tmrResponse.status}`
          );
        }
      } catch (tmrErr) {
        console.warn(
          "Tomorrow.io fetch failed:",
          tmrErr.message
        );
      }
    }

    // =========================
    // GENERATE ALERTS
    // =========================

    const alerts = generateWeatherAlerts({
      temp,
      humidity,
      windspeed,
      weatherCode,
      tomorrowRain,
      tomorrowMaxTemp,
      uvIndex,
    });

    // =========================
    // CACHE STORE
    // =========================

    alertCache[cacheKey] = {
      data: alerts,
      time: Date.now(),
    };

    return res.json(alerts);

  } catch (err) {
    console.error("Alert route error:", err);

    return res.json(generateStaticAlerts());
  }
});

// =========================
// ALERT GENERATOR
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

  // =========================
  // HEAVY RAIN
  // =========================

  if (tomorrowRain > 20) {
    alerts.push({
      id: String(id++),
      type: "weather",
      severity: "critical",
      title: "Heavy Rain Alert",
      message:
        `Heavy rainfall of ${tomorrowRain.toFixed(
          1
        )}mm expected tomorrow. ` +
        `Protect crops, improve drainage, and delay fertilizer application.`,
      timestamp: now,
      read: false,
    });
  } else if (tomorrowRain > 8) {
    alerts.push({
      id: String(id++),
      type: "weather",
      severity: "warning",
      title: "Rain Expected Tomorrow",
      message:
        `Moderate rainfall of ${tomorrowRain.toFixed(
          1
        )}mm expected tomorrow. ` +
        `Adjust irrigation schedules accordingly.`,
      timestamp: now,
      read: false,
    });
  }

  // =========================
  // HIGH TEMPERATURE
  // =========================

  if (temp > 38) {
    alerts.push({
      id: String(id++),
      type: "irrigation",
      severity: "critical",
      title: "Extreme Heat Alert",
      message:
        `Current temperature is ${temp}°C. ` +
        `Increase irrigation frequency and water during cooler hours.`,
      timestamp: now,
      read: false,
    });
  } else if (temp > 33) {
    alerts.push({
      id: String(id++),
      type: "irrigation",
      severity: "warning",
      title: "High Temperature",
      message:
        `Temperature is ${temp}°C. ` +
        `Maintain soil moisture and monitor crop stress.`,
      timestamp: now,
      read: false,
    });
  }

  // =========================
  // HUMIDITY / FUNGAL RISK
  // =========================

  if (humidity > 85) {
    alerts.push({
      id: String(id++),
      type: "disease",
      severity: "critical",
      title: "High Fungal Disease Risk",
      message:
        `Humidity is ${humidity}%. ` +
        `Conditions favor fungal diseases. Apply preventive measures.`,
      timestamp: now,
      read: false,
    });
  } else if (humidity > 75) {
    alerts.push({
      id: String(id++),
      type: "disease",
      severity: "warning",
      title: "Elevated Fungal Risk",
      message:
        `Humidity is ${humidity}%. ` +
        `Monitor crops closely for fungal symptoms.`,
      timestamp: now,
      read: false,
    });
  }

  // =========================
  // STRONG WIND
  // =========================

  if (windspeed > 40) {
    alerts.push({
      id: String(id++),
      type: "weather",
      severity: "critical",
      title: "Strong Wind Alert",
      message:
        `Wind speed is ${windspeed} km/h. ` +
        `Risk of crop lodging and structural damage.`,
      timestamp: now,
      read: false,
    });
  }

  // =========================
  // UV INDEX
  // =========================

  if (uvIndex > 9) {
    alerts.push({
      id: String(id++),
      type: "weather",
      severity: "warning",
      title: "Extreme UV Index",
      message:
        `UV Index is ${uvIndex}. ` +
        `Avoid prolonged field work during midday.`,
      timestamp: now,
      read: false,
    });
  }

  // =========================
  // THUNDERSTORM
  // =========================

  if (weatherCode >= 95) {
    alerts.push({
      id: String(id++),
      type: "weather",
      severity: "critical",
      title: "Thunderstorm Warning",
      message:
        "Thunderstorm conditions detected. Stay away from open fields.",
      timestamp: now,
      read: false,
    });
  }

  // =========================
  // IDEAL CONDITIONS
  // =========================

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
      message:
        `Current conditions are favorable for crop growth and fertilizer application.`,
      timestamp: now,
      read: true,
    });
  }

  // =========================
  // IRRIGATION ADVICE
  // =========================

  if (temp >= 28 && tomorrowRain < 5) {
    alerts.push({
      id: String(id++),
      type: "irrigation",
      severity: "info",
      title: "Irrigation Timing Advice",
      message:
        "Irrigate crops early morning or evening to minimize evaporation.",
      timestamp: now,
      read: true,
    });
  }

  // =========================
  // FALLBACK ALERT
  // =========================

  if (alerts.length === 0) {
    alerts.push({
      id: String(id++),
      type: "weather",
      severity: "info",
      title: "All Clear",
      message:
        "Weather conditions are currently favorable for farming.",
      timestamp: now,
      read: true,
    });
  }

  return alerts;
}

// =========================
// STATIC ALERTS
// =========================

function generateStaticAlerts() {
  const now = new Date().toISOString();

  return [
    {
      id: "1",
      type: "irrigation",
      severity: "info",
      title: "Enable Location",
      message:
        "Allow location access to receive weather-based farming alerts.",
      timestamp: now,
      read: false,
    },
  ];
}

export default router;