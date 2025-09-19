import { WeatherData } from "../types";

export const getIrrigationAdvice = (weather: WeatherData | null): string => {
  if (!weather) return '';

  if (weather.rainfall > 5) return 'Skip irrigation - sufficient natural rainfall';
  if (weather.humidity > 80) return 'Reduce irrigation frequency';
  if (weather.temperature > 30) return 'Increase irrigation, water early morning';
  
  return 'Normal irrigation schedule recommended';
};

export const getRainDetails = (weather: WeatherData | null): string => {
  if (!weather) return '';

  if (weather.rainfall > 1 && weather.rainfall < 5) return 'Only Slight Rain Expected';
  if (weather.rainfall > 5 && weather.rainfall < 10) return 'Moderate Rain Expected';
  if (weather.rainfall > 10) return 'Good Rain Expected';
  
  return 'Normal irrigation schedule recommended';
};

