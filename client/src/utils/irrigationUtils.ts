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

  if (weather.rainfall <= 1) return 'minimal expected rainfall';
  if (weather.rainfall <= 5) return 'slight rain expected';
  if (weather.rainfall <= 10) return 'moderate rain expected';
  return 'heavy rain expected';
};
