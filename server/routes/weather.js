import express from "express";
import fetch from "node-fetch";

const router = express.Router();

router.get("/", async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) return res.status(400).json({ error: "lat/lon required" });

  try {
    // 🌤️ Open-Meteo (base data)
    const openMeteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode&forecast_days=5&timezone=auto`;
    const openRes = await fetch(openMeteoUrl);
    const openRaw = await openRes.json();

    const current = openRaw.current_weather;
    const daily = openRaw.daily;

    let result = {
      temperature: current.temperature,
      humidity: 0,
      rainfall: daily.precipitation_sum[0] ?? 0,
      windSpeed: current.windspeed,
      uvIndex: 0,
      condition: mapWeatherCode(current.weathercode),
      forecast: daily.time.map((date, i) => ({
        date,
        temperature: {
          max: daily.temperature_2m_max[i],
          min: daily.temperature_2m_min[i],
        },
        condition: mapWeatherCode(daily.weathercode[i]),
        rainfall: daily.precipitation_sum[i],
      })),
    };

    // 🌦️ Tomorrow.io (extras) — uses API key securely from backend
    if (process.env.TOMORROW_KEY) {
      try {
        const tomorrowUrl = `https://api.tomorrow.io/v4/weather/realtime?location=${lat},${lon}&apikey=${process.env.TOMORROW_KEY}`;
        const tmrRes = await fetch(tomorrowUrl);
        if (tmrRes.ok) {
          const tmrRaw = await tmrRes.json();
          const values = tmrRaw.data?.values ?? {};
          result = {
            ...result,
            humidity: values.humidity ?? result.humidity,
            uvIndex: values.uvIndex ?? result.uvIndex,
            rainfall: values.precipitationIntensity ?? result.rainfall,
          };
        }
      } catch (err) {
        console.warn("Tomorrow.io skipped:", err);
      }
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Weather fetch failed" });
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
