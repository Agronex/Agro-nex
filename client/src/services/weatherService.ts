import { fetchWithTimeout } from '../utils/fetchWithTimeout';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
const CACHE_KEY = "weatherData";
const CACHE_TTL = 10 * 60 * 1000;
const REQUEST_TIMEOUT = 10000;

export async function getWeatherData(): Promise<any> {
  // Check cache first
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    const now = new Date().getTime();

    // If cached data is still valid, return it
    if (now - timestamp < CACHE_TTL) {
      return data;
    }
  }

  try {
    // Fetch fresh data
    const position = await new Promise<GeolocationPosition>((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject)
    );

    const lat = position.coords.latitude;
    const lon = position.coords.longitude;

    const response = await fetchWithTimeout(
      `${BACKEND_URL}/weather`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lon }),
      },
      REQUEST_TIMEOUT
    );

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();

    // Cache the data
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ data, timestamp: new Date().getTime() })
    );

    return data;
  } catch (error) {
    console.error('Weather service error:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to fetch weather data');
  }
}
