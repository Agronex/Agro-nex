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
}
