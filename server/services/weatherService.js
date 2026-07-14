/*
  weatherService.js
  Centralized weather service that is the ONLY module to call Open-Meteo and Tomorrow.io.
  Responsibilities:
  - Single place for network calls
  - Shared caching with TTLs
  - Request deduplication by caching in-flight Promises
  - 429 handling (fall back to cache)
  - Timeout + retry with exponential backoff
  - Separate caching for Tomorrow.io (UV)

  Exported functions:
  - getWeatherSummary(lat, lon, { includeUV }) -> normalized response matching previous API shape
  - getOpenMeteoRaw(lat, lon) -> raw Open-Meteo response (used by alerts route)
  - getUV(lat, lon) -> tomorrow.io data (cached separately)
*/

import fetch from "node-fetch";

const WEATHER_API_KEY = process.env.WEATHER_API_KEY;

export async function getWeather(city) {
  if (!city) throw new Error("City is required");

  const response = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${WEATHER_API_KEY}&units=metric`
  );

  if (!response.ok) {
    throw new Error("Weather API failed");
  }

  const data = await response.json();

  return {
    city: data.name,
    temperature: data.main.temp,
    description: data.weather[0].description,
    feels_like: data.main.feels_like,
    humidity: data.main.humidity,
    wind_speed: data.wind.speed,
  };

  const took = Date.now() - start;
  logger.info("WeatherSummary response", { lat, lon, took });

  return result;
}

export default {
  getOpenMeteoRaw,
  getUV,
  getWeatherSummary,
};
