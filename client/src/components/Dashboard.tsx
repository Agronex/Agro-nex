import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, Droplets, AlertTriangle, Sprout, Camera, CloudSun, DollarSign, BookOpen } from 'lucide-react';
import { WeatherData, Alert, CropRecord } from '../types';
import LoadingSpinner from './LoadingSpinner';
import { getWeatherData } from '../services/weatherService';
import { getIrrigationAdvice, getRainDetails } from '../utils/irrigationUtils';
import { getTimeAgo } from '../utils/timeUtils';
import Button from './Button';
import Card from './Card';
import QuickStatCard from './QuickStatCard';
import { getRecentActivity, ActivityEvent, timeAgo } from '../utils/activityStore';

interface DashboardProps {
  onNavigate: (view: string) => void;
  alerts: Alert[];
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate, alerts }) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [recentActivity, setRecentActivity] = useState<ActivityEvent[]>([]);
  const [activeCrops, setActiveCrops] = useState(0);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const weatherData = await getWeatherData();
      setWeather(weatherData);
      setLastUpdated(new Date());
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch weather data';
      setError(errorMsg);
      setWeather(null);
    } finally {
      setLoading(false);
    }
  };

  // Load real data from localStorage
  useEffect(() => {
    fetchData();

    // Read active crop count from Farm Logbook localStorage
    try {
      const raw = localStorage.getItem('farm-records');
      if (raw) {
        const records: CropRecord[] = JSON.parse(raw);
        const active = records.filter(r => r.status === 'growing' || r.status === 'planted').length;
        setActiveCrops(active);
      }
    } catch {
      setActiveCrops(0);
    }

    // Read recent activity
    setRecentActivity(getRecentActivity().slice(0, 5));
  }, []);

  // Re-read activity when window regains focus (user may have added records)
  useEffect(() => {
    const handleFocus = () => {
      setRecentActivity(getRecentActivity().slice(0, 5));
      try {
        const raw = localStorage.getItem('farm-records');
        if (raw) {
          const records: CropRecord[] = JSON.parse(raw);
          const active = records.filter(r => r.status === 'growing' || r.status === 'planted').length;
          setActiveCrops(active);
        }
      } catch { /* ignore */ }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const criticalAlerts = useMemo(
    () => alerts.filter(alert => alert.severity === 'critical' && !alert.read),
    [alerts]
  );

  const activityDotColor: Record<string, string> = {
    disease_scan: 'bg-yellow-500',
    logbook_add: 'bg-green-500',
    logbook_edit: 'bg-blue-500',
    logbook_delete: 'bg-red-500',
    weather_check: 'bg-purple-500',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center p-6 bg-yellow-50 rounded-lg border border-yellow-200">
          <AlertTriangle className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
          <p className="text-yellow-800 font-medium mb-4">{error}</p>
          <Button onClick={fetchData} variant="secondary" size="md">Retry</Button>
        </div>
      </div>
    );
  }

  if (!weather) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center p-6 bg-yellow-50 rounded-lg border border-yellow-200">
          <p className="text-yellow-800 font-medium mb-4">Weather data unavailable</p>
          <Button onClick={fetchData} variant="secondary" size="md">Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-4 sm:p-6 border border-gray-200">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1 sm:mb-2">
          Welcome to AgroNex! 🌾
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          Your comprehensive farming companion for smarter agriculture.
        </p>
      </div>

      {/* Critical Alerts */}
      {criticalAlerts.length > 0 ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center space-x-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <h3 className="font-semibold text-red-800">Critical Alerts</h3>
          </div>
          <div className="space-y-2">
            {criticalAlerts.slice(0, 2).map((alert) => (
              <div key={alert.id} className="text-sm text-red-700">
                <strong>{alert.title}:</strong> {alert.message}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-6 text-center bg-white rounded-lg border border-gray-200">
          <AlertTriangle className="w-10 h-10 text-gray-300 mb-2" />
          <p className="text-gray-600 font-medium text-sm">No critical alerts</p>
          <p className="text-gray-400 text-xs">Your farm is looking good!</p>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <QuickStatCard
          label="Temperature"
          value={`${weather?.temperature ?? '--'}°C`}
          icon={<TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />}
          change="Live weather"
        />
        <QuickStatCard
          label="Humidity"
          value={`${weather?.humidity ?? '--'}%`}
          icon={<Droplets className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />}
          change={weather.humidity > 75 ? 'High — fungal risk' : 'Normal'}
          changeType={weather.humidity > 75 ? 'decrease' : 'increase'}
        />
        <QuickStatCard
          label="Active Crops"
          value={activeCrops.toString()}
          icon={<Sprout className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />}
          change={activeCrops > 0 ? 'From your logbook' : 'Add crops in logbook'}
        />
        <QuickStatCard
          label="Alerts"
          value={alerts.length}
          icon={<AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />}
          change={`${criticalAlerts.length} critical`}
          changeType={criticalAlerts.length > 0 ? 'decrease' : 'increase'}
        />
      </div>

      {/* Today's Recommendations */}
      <Card header={<h3 className="text-base sm:text-lg font-semibold text-gray-800">Today's Recommendations</h3>}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
            <h4 className="font-medium text-green-800 mb-1 text-sm sm:text-base">🌱 Irrigation</h4>
            <p className="text-xs sm:text-sm text-green-700">
              Based on current humidity ({weather.humidity}%) and {getRainDetails(weather)}, {getIrrigationAdvice(weather)}.
            </p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
            <h4 className="font-medium text-blue-800 mb-1 text-sm sm:text-base">🔬 Crop Monitoring</h4>
            <p className="text-xs sm:text-sm text-blue-700">
              {weather.humidity > 75
                ? `High humidity (${weather.humidity}%) — inspect crops for early signs of fungal disease. Apply preventive fungicides if needed.`
                : `Conditions are suitable for crop growth. Regular monitoring is recommended.`}
            </p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4">
            <h4 className="font-medium text-yellow-800 mb-1 text-sm sm:text-base">☀️ Weather</h4>
            <p className="text-xs sm:text-sm text-yellow-700">
              {weather.temperature > 35
                ? `High temperature (${weather.temperature}°C). Ensure adequate watering and consider shade nets.`
                : weather.temperature < 15
                ? `Cool temperature (${weather.temperature}°C). Protect frost-sensitive crops overnight.`
                : `Temperature is ${weather.temperature}°C — favorable for most crops. Wind: ${weather.windSpeed} km/h.`}
            </p>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 sm:p-4">
            <h4 className="font-medium text-purple-800 mb-1 text-sm sm:text-base">🎯 Planning</h4>
            <p className="text-xs sm:text-sm text-purple-700">
              {activeCrops > 0
                ? `You have ${activeCrops} active crop${activeCrops > 1 ? 's' : ''} in your logbook. Review upcoming harvest dates regularly.`
                : `Start tracking your crops using the Farm Logbook for personalized planning advice.`}
            </p>
          </div>
        </div>
      </Card>

      {/* Quick Actions */}
      <Card header={<h3 className="text-base sm:text-lg font-semibold text-gray-800">Quick Actions</h3>}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <button
            onClick={() => onNavigate('disease-detection')}
            className="p-3 sm:p-4 bg-green-50 hover:bg-green-100 active:bg-green-200 rounded-lg border border-green-200 transition-colors text-left min-h-[80px] sm:min-h-[90px]"
          >
            <Camera className="w-6 h-6 text-green-600 mb-1 sm:mb-2" />
            <div className="text-xs sm:text-sm font-medium text-gray-800">Scan Disease</div>
          </button>
          <button
            onClick={() => onNavigate('weather')}
            className="p-3 sm:p-4 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 rounded-lg border border-blue-200 transition-colors text-left min-h-[80px] sm:min-h-[90px]"
          >
            <CloudSun className="w-6 h-6 text-blue-600 mb-1 sm:mb-2" />
            <div className="text-xs sm:text-sm font-medium text-gray-800">Check Weather</div>
          </button>
          <button
            onClick={() => onNavigate('market-prices')}
            className="p-3 sm:p-4 bg-yellow-50 hover:bg-yellow-100 active:bg-yellow-200 rounded-lg border border-yellow-200 transition-colors text-left min-h-[80px] sm:min-h-[90px]"
          >
            <DollarSign className="w-6 h-6 text-yellow-600 mb-1 sm:mb-2" />
            <div className="text-xs sm:text-sm font-medium text-gray-800">Market Prices</div>
          </button>
          <button
            onClick={() => onNavigate('farm-logbook')}
            className="p-3 sm:p-4 bg-purple-50 hover:bg-purple-100 active:bg-purple-200 rounded-lg border border-purple-200 transition-colors text-left min-h-[80px] sm:min-h-[90px]"
          >
            <BookOpen className="w-6 h-6 text-purple-600 mb-1 sm:mb-2" />
            <div className="text-xs sm:text-sm font-medium text-gray-800">Farm Logbook</div>
          </button>
        </div>
      </Card>

      {/* Last Updated */}
      <div className="text-center">
        <p className="text-xs text-gray-500">Last updated: {getTimeAgo(lastUpdated)}</p>
      </div>

      {/* Recent Activity */}
      <Card header={<h3 className="text-base sm:text-lg font-semibold text-gray-800">Recent Activity</h3>}>
        <div className="space-y-3">
          {recentActivity.length > 0 ? (
            recentActivity.map((event) => (
              <div key={event.id} className="flex items-start space-x-3 text-sm text-gray-700">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${activityDotColor[event.type] || 'bg-gray-500'}`} />
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{event.title}</span>
                  {event.detail && <span className="text-gray-500"> — {event.detail}</span>}
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{timeAgo(event.timestamp)}</span>
              </div>
            ))
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-500 text-sm">No activity yet. Start by scanning a crop or adding a logbook entry.</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default Dashboard;