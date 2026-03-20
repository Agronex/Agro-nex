import axios from "axios";

const BACKEND_URL = "https://agronex.onrender.com";
const CACHE_TTL = 10 * 60 * 1000;

export async function getWeatherData(): Promise<any> {
  // Fetch location first so we can use a location-specific cache key
  const position = await new Promise<GeolocationPosition>((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject)
  );

  const lat = position.coords.latitude;
  const lon = position.coords.longitude;

  // Location-specific cache key prevents returning stale data when position changes
  const cacheKey = `weatherData_${lat.toFixed(2)}_${lon.toFixed(2)}`;

  // Check location-specific cache
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    const now = new Date().getTime();

    if (now - timestamp < CACHE_TTL) {
      return data;
    }
  }

  const response = await axios.post(`${BACKEND_URL}/weather`, { lat, lon });

  // Cache the data under the location-specific key
  localStorage.setItem(
    cacheKey,
    JSON.stringify({ data: response.data, timestamp: new Date().getTime() })
  );

  return response.data;
}
