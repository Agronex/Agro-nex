import { fetchWithTimeout } from '../utils/fetchWithTimeout';

const BACKEND_URL     = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
const CACHE_KEY       = 'agronex_weather_v2';
const CACHE_TTL       = 10 * 60 * 1000;    // 10 minutes (matches server cache)
const REQUEST_TIMEOUT = 10_000;
const GEO_TIMEOUT_MS  = 8_000;

/**
 * Returns current weather data.
 * - Reads from localStorage cache first (survives page refresh).
 * - Falls back to a default weather object if backend is unreachable.
 */
export async function getWeatherData(): Promise<any> {
  // ── Cache check ─────────────────────────────────────────────────────────
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const { data, timestamp } = JSON.parse(raw);
      if (Date.now() - timestamp < CACHE_TTL && data) return data;
    }
  } catch {
    localStorage.removeItem(CACHE_KEY);
  }

  // ── Geolocation ──────────────────────────────────────────────────────────
  const position = await new Promise<GeolocationPosition>((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      timeout: GEO_TIMEOUT_MS,
      maximumAge: 5 * 60_000,   // accept up to 5-minute-old cached position
    })
  );

  const { latitude: lat, longitude: lon } = position.coords;

  const response = await fetchWithTimeout(
    `${BACKEND_URL}/weather`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lon }),
    },
    REQUEST_TIMEOUT
  );

  if (!response.ok) throw new Error(`Weather API error: ${response.status}`);

  const data = await response.json();

  // ── Cache fresh data ─────────────────────────────────────────────────────
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {
    // Storage full — not critical
  }

  return data;
}
