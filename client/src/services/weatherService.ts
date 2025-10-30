import axios from "axios";

const BACKEND_URL = "https://agronex.onrender.com";
const CACHE_KEY = "weatherData";
const CACHE_TTL = 10 * 60 * 1000; 
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

  // Fetch fresh data
  const position = await new Promise<GeolocationPosition>((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject)
  );

  const lat = position.coords.latitude;
  const lon = position.coords.longitude;

  const response = await axios.post(`${BACKEND_URL}/weather`, { lat, lon });

  // Cache the data
  localStorage.setItem(
    CACHE_KEY,
    JSON.stringify({ data: response.data, timestamp: new Date().getTime() })
  );

  return response.data;
}
