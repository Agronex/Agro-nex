import { fetchWithTimeout } from '../utils/fetchWithTimeout';
import { BACKEND_URL } from '../config/backend';

const CACHE_KEY = 'agronex_weather_v2';
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes (matches server cache)
const REQUEST_TIMEOUT = 10_000;
const GEO_TIMEOUT_MS = 5_000;

function isFallbackWeather(data: any): boolean {
  return (
    !!data &&
    Array.isArray(data.forecast) &&
    data.forecast.length === 0 &&
    Number(data.temperature) === 0 &&
    Number(data.humidity) === 0 &&
    Number(data.windSpeed) === 0
  );
}

function mapWeatherCode(code: number) {
  const codes: Record<number, string> = {
    0: 'Clear',
    1: 'Mainly Clear',
    2: 'Partly Cloudy',
    3: 'Cloudy',
    45: 'Foggy',
    48: 'Rime Fog',
    51: 'Light Drizzle',
    61: 'Light Rain',
    63: 'Rain',
    65: 'Heavy Rain',
    71: 'Snow',
    80: 'Showers',
    95: 'Thunderstorm',
  };

  return codes[code] ?? 'Unknown';
}

function normalizeWeather(openRaw: any) {
  const now = new Date();
  const currentHourISO = now.toISOString().slice(0, 13);
  const hourlyTimes = openRaw?.hourly?.time || [];
  const humidityData = openRaw?.hourly?.relative_humidity_2m || [];
  const currentHourIndex = hourlyTimes.findIndex((t: string) => t.startsWith(currentHourISO));
  const currentHumidity = currentHourIndex >= 0 ? humidityData[currentHourIndex] : 0;

  const current = openRaw?.current_weather || {};
  const daily = openRaw?.daily || {};

  const forecast = (daily.time || []).map((date: string, i: number) => ({
    date,
    temperature: {
      max: daily.temperature_2m_max?.[i] ?? 0,
      min: daily.temperature_2m_min?.[i] ?? 0,
    },
    condition: mapWeatherCode(daily.weathercode?.[i]),
    rainfall: daily.precipitation_sum?.[i] ?? 0,
  }));

  return {
    temperature: current.temperature ?? 0,
    humidity: currentHumidity,
    rainfall: daily.precipitation_sum?.[0] ?? 0,
    windSpeed: current.windspeed ?? 0,
    uvIndex: 0,
    condition: mapWeatherCode(current.weathercode),
    forecast,
  };
}

async function fetchDirectWeather(lat: number, lon: number) {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${encodeURIComponent(lat)}` +
    `&longitude=${encodeURIComponent(lon)}` +
    `&current_weather=true` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode` +
    `&hourly=relative_humidity_2m` +
    `&forecast_days=5` +
    `&timezone=auto`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Open-Meteo error: ${response.status}`);
    }
    const raw = await response.json();
    return normalizeWeather(raw);
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Returns current weather data.
 * - Reads from localStorage cache first (survives page refresh).
 * - Uses backend first, then falls back to direct Open-Meteo only if backend returns fallback zeros.
 */
export async function getWeatherData(): Promise<any> {
  // Cache check
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const { data, timestamp } = JSON.parse(raw);
      if (Date.now() - timestamp < CACHE_TTL && data && !isFallbackWeather(data)) return data;
    }
  } catch {
    localStorage.removeItem(CACHE_KEY);
  }

  // Geolocation
  const position = await new Promise<GeolocationPosition>((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      timeout: GEO_TIMEOUT_MS,
      maximumAge: 5 * 60_000,
    })
  );

  const { latitude: lat, longitude: lon } = position.coords;

  // Primary backend fetch with one retry
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetchWithTimeout(
        `${BACKEND_URL}/weather`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat, lon }),
        },
        REQUEST_TIMEOUT
      );

      if (response.ok) {
        const data = await response.json();

        // If backend returned a fallback shell, try direct Open-Meteo once.
        const finalData = isFallbackWeather(data) ? await fetchDirectWeather(lat, lon) : data;

        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ data: finalData, timestamp: Date.now() }));
        } catch {
          // ignore storage errors
        }

        return finalData;
      }

      // Non-ok response on first attempt — retry once
      if (attempt === 0) {
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }
    } catch {
      if (attempt === 0) {
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }
    }
    break;
  }

  // Backend failed -> direct Open-Meteo fallback
  const directData = await fetchDirectWeather(lat, lon);

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data: directData, timestamp: Date.now() }));
  } catch {
    // ignore storage errors
  }

  return directData;
}
