import { WeatherData } from "../types";

// 🌍 Main Weather Fetcher
export async function getWeatherData(): Promise<WeatherData> {
  try {
    // Get user's current location
    const position = await new Promise<GeolocationPosition>((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject)
    );

    const WEATHER_LAT = position.coords.latitude;
    const WEATHER_LON = position.coords.longitude;
    const TOMORROW_KEY = import.meta.env.VITE_TOMORROW_KEY;

    // 🌤️ Open-Meteo (always works)
    const openMeteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${WEATHER_LAT}&longitude=${WEATHER_LON}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode&forecast_days=5&timezone=auto`;

    const openRes = await fetch(openMeteoUrl);
    if (!openRes.ok) throw new Error(`Open-Meteo API error: ${openRes.status}`);
    const openRaw = await openRes.json();

    const current = openRaw.current_weather;
    const daily = openRaw.daily;

    const forecast: WeatherData["forecast"] = daily.time.map(
      (date: string, i: number) => ({
        date,
        temperature: {
          max: daily.temperature_2m_max[i],
          min: daily.temperature_2m_min[i],
        },
        condition: mapWeatherCode(daily.weathercode[i]),
        rainfall: daily.precipitation_sum[i],
      })
    );

    // Base data (guaranteed from Open-Meteo)
    let result: WeatherData = {
      temperature: current.temperature,
      humidity: 0,
      rainfall: daily.precipitation_sum[0] ?? 0,
      windSpeed: current.windspeed,
      uvIndex: 0,
      condition: mapWeatherCode(current.weathercode),
      forecast,
    };

    // 🌦️ Try Tomorrow.io (extras), but don’t fail if rate-limited
    if (TOMORROW_KEY) {
      try {
        const tomorrowUrl = `https://api.tomorrow.io/v4/weather/realtime?location=${WEATHER_LAT},${WEATHER_LON}&apikey=${TOMORROW_KEY}`;
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
        } else {
          console.warn("Tomorrow.io failed:", await tmrRes.text());
        }
      } catch (err) {
        console.warn("Tomorrow.io request skipped:", err);
      }
    }

    return result;
  } catch (err) {
    console.error("getWeatherData failed:", err);
    throw err;
  }
}

// Map Open-Meteo WMO codes to simple text
function mapWeatherCode(code: number): string {
  const codes: Record<number, string> = {
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
