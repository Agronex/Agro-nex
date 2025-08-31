import React, { useState, useEffect } from 'react';
import { TrendingUp, Droplets, AlertTriangle, Sprout } from 'lucide-react';
import { WeatherData, Alert } from '../types';
import { mockAlerts } from '../services/mockApi';
import LoadingSpinner from './LoadingSpinner';
import { getWeatherData } from '../services/weatherService';

const Dashboard: React.FC = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [alerts] = useState<Alert[]>(mockAlerts);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const weatherData = await getWeatherData();
        setWeather(weatherData);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const criticalAlerts = alerts.filter(alert => alert.severity === 'critical' && !alert.read);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Welcome to FarmDash! 🌾
        </h1>
        <p className="text-gray-600">
          Your comprehensive farming companion for smarter agriculture. Monitor your crops, track weather, and stay connected with the farming community.
        </p>
      </div>

      {/* Critical Alerts */}
      {criticalAlerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center space-x-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
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
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Temperature</p>
              <p className="text-2xl font-bold text-gray-800">
                {weather?.temperature || '--'}°C
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <span className="text-green-600">↑ 2°C</span> from yesterday
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Humidity</p>
              <p className="text-2xl font-bold text-gray-800">
                {weather?.humidity || '--'}%
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Droplets className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <span className="text-blue-600">↓ 5%</span> from yesterday
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Crops</p>
              <p className="text-2xl font-bold text-gray-800">8</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Sprout className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <span className="text-green-600">3</span> ready for harvest
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Alerts</p>
              <p className="text-2xl font-bold text-gray-800">{alerts.length}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <span className="text-red-600">{criticalAlerts.length}</span> critical
          </div>
        </div>
      </div>

      {/* Today's Recommendations */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Today's Recommendations</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-medium text-green-800 mb-2">🌱 Irrigation</h4>
            <p className="text-sm text-green-700">
              Based on current humidity (65%) and no expected rain, continue normal irrigation schedule for wheat and tomatoes.
            </p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-2">🔬 Crop Monitoring</h4>
            <p className="text-sm text-blue-700">
              Check tomato plants for early signs of fungal diseases due to increased humidity levels.
            </p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium text-yellow-800 mb-2">📈 Market Opportunity</h4>
            <p className="text-sm text-yellow-700">
              Tomato prices are up 9.38% - consider harvesting mature crops for better profits.
            </p>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h4 className="font-medium text-purple-800 mb-2">🎯 Planning</h4>
            <p className="text-sm text-purple-700">
              Prepare for wheat harvest in the next 15 days. Check equipment and arrange for storage.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="p-4 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors text-left">
            <div className="text-2xl mb-2">📸</div>
            <div className="text-sm font-medium text-gray-800">Scan Disease</div>
          </button>
          <button className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors text-left">
            <div className="text-2xl mb-2">☁️</div>
            <div className="text-sm font-medium text-gray-800">Check Weather</div>
          </button>
          <button className="p-4 bg-yellow-50 hover:bg-yellow-100 rounded-lg border border-yellow-200 transition-colors text-left">
            <div className="text-2xl mb-2">💰</div>
            <div className="text-sm font-medium text-gray-800">Market Prices</div>
          </button>
          <button className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors text-left">
            <div className="text-2xl mb-2">📝</div>
            <div className="text-sm font-medium text-gray-800">Add Record</div>
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Activity</h3>
        <div className="space-y-3">
          <div className="flex items-center space-x-3 text-sm text-gray-700">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Added new tomato crop record - Field A (2.5 hectares)</span>
            <span className="text-gray-500">2 hours ago</span>
          </div>
          <div className="flex items-center space-x-3 text-sm text-gray-700">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span>Weather alert received - Heavy rain expected tomorrow</span>
            <span className="text-gray-500">5 hours ago</span>
          </div>
          <div className="flex items-center space-x-3 text-sm text-gray-700">
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            <span>Disease detection completed - Leaf spot identified</span>
            <span className="text-gray-500">1 day ago</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;