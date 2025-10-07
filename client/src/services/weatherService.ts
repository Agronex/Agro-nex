import axios from "axios";

const BACKEND_URL = "http://localhost:5000";

// Get weather using user location
export async function getWeatherData(): Promise<any> {
  // Get user's current location
  const position = await new Promise<GeolocationPosition>((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject)
  );

  const lat = position.coords.latitude;
  const lon = position.coords.longitude;

  // Call backend instead of Open-Meteo directly
  const response = await axios.post(`${BACKEND_URL}/weather`, { lat, lon });
  return response.data; // backend gives clean WeatherData
}
