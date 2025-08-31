import React, { useState, useEffect } from 'react';
import { Sun, Cloud, CloudRain, Droplets, Wind, Thermometer } from 'lucide-react';
import { WeatherData } from '../types';
import { getWeatherData } from '../services/weatherService';
import LoadingSpinner from './LoadingSpinner';

const WeatherWidget: React.FC = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const data = await getWeatherData();
        setWeather(data);
      } catch (error) {
        console.error('Failed to fetch weather data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, []);

  const getWeatherIcon = (condition: string) => {
    switch (condition.toLowerCase()) {
      case 'sunny': return <Sun className="w-8 h-8 text-yellow-500" />;
      case 'rainy': return <CloudRain className="w-8 h-8 text-blue-500" />;
      default: return <Cloud className="w-8 h-8 text-gray-500" />;
    }
  };

  const getIrrigationAdvice = () => {
    if (!weather) return '';
    
    if (weather.rainfall > 5) return 'Skip irrigation - sufficient natural rainfall';
    if (weather.humidity > 80) return 'Reduce irrigation frequency';
    if (weather.temperature > 30) return 'Increase irrigation, water early morning';
    return 'Normal irrigation schedule recommended';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center h-48">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (!weather) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <p className="text-center text-gray-500">Weather data unavailable</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-xl shadow-sm border border-gray-200 p-6">
      {/* Current Weather */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-800 mb-1">Current Weather</h3>
          <p className="text-sm text-gray-600">Today's conditions</p>
        </div>
        {getWeatherIcon(weather.condition)}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <Thermometer className="w-5 h-5 text-red-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-800">{weather.temperature}°C</p>
          <p className="text-xs text-gray-600">Temperature</p>
        </div>
        <div className="text-center">
          <Droplets className="w-5 h-5 text-blue-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-800">{weather.humidity}%</p>
          <p className="text-xs text-gray-600">Humidity</p>
        </div>
        <div className="text-center">
          <CloudRain className="w-5 h-5 text-blue-600 mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-800">{weather.rainfall}mm</p>
          <p className="text-xs text-gray-600">Rainfall</p>
        </div>
        <div className="text-center">
          <Wind className="w-5 h-5 text-gray-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-800">{weather.windSpeed}km/h</p>
          <p className="text-xs text-gray-600">Wind</p>
        </div>
      </div>

      {/* Irrigation Advice */}
      <div className="bg-white rounded-lg p-4 mb-6">
        <div className="flex items-center space-x-2 mb-2">
          <Droplets className="w-4 h-4 text-green-600" />
          <h4 className="font-semibold text-gray-800">Irrigation Advice</h4>
        </div>
        <p className="text-sm text-gray-700">{getIrrigationAdvice()}</p>
      </div>

      {/* 5-Day Forecast */}
      <div>
        <h4 className="font-semibold text-gray-800 mb-3">5-Day Forecast</h4>
        <div className="space-y-2">
          {weather.forecast.map((day, index) => (
            <div key={index} className="flex items-center justify-between bg-white rounded-lg p-3">
              <div className="flex items-center space-x-3">
                {getWeatherIcon(day.condition)}
                <div>
                  <p className="font-medium text-gray-800">
                    {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </p>
                  <p className="text-xs text-gray-600">{day.condition}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-800">{day.temperature.max}°/{day.temperature.min}°</p>
                <p className="text-xs text-blue-600">{day.rainfall}mm</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WeatherWidget;