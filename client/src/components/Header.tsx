import React, { useState } from 'react';
import { Bell, User, Menu, X, Sun, Cloud, CloudRain } from 'lucide-react';
import { Alert } from '../types';

interface HeaderProps {
  alerts: Alert[];
  onMenuToggle: () => void;
  isMenuOpen: boolean;
}

const Header: React.FC<HeaderProps> = ({ alerts, onMenuToggle, isMenuOpen }) => {
  const [showAlerts, setShowAlerts] = useState(false);
  const unreadAlerts = alerts.filter(alert => !alert.read);

  const getWeatherIcon = () => {
    const condition = 'Partly Cloudy'; // This could come from props
    switch (condition) {
      case 'Sunny': return <Sun className="w-5 h-5 text-yellow-500" />;
      case 'Rainy': return <CloudRain className="w-5 h-5 text-blue-500" />;
      default: return <Cloud className="w-5 h-5 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'warning': return 'text-orange-600 bg-orange-50';
      default: return 'text-blue-600 bg-blue-50';
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left Section */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onMenuToggle}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <div className="hidden sm:flex items-center space-x-2">
            <h1 className="text-xl font-bold text-gray-800">FarmDash</h1>
            <div className="flex items-center space-x-1 text-sm text-gray-600">
              {getWeatherIcon()}
              <span>28°C</span>
            </div>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-3">
          {/* Alerts */}
          <div className="relative">
            <button
              onClick={() => setShowAlerts(!showAlerts)}
              className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Bell className="w-6 h-6" />
              {unreadAlerts.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadAlerts.length}
                </span>
              )}
            </button>

            {/* Alerts Dropdown */}
            {showAlerts && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-800">Recent Alerts</h3>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {alerts.slice(0, 5).map((alert) => (
                    <div key={alert.id} className={`p-3 border-b border-gray-100 ${!alert.read ? 'bg-blue-50' : ''}`}>
                      <div className="flex items-start space-x-3">
                        <div className={`w-2 h-2 rounded-full mt-2 ${getSeverityColor(alert.severity).split(' ')[1]}`}></div>
                        <div className="flex-1">
                          <h4 className="font-medium text-sm text-gray-800">{alert.title}</h4>
                          <p className="text-xs text-gray-600 mt-1">{alert.message}</p>
                          <p className="text-xs text-gray-400 mt-1">{new Date(alert.timestamp).toLocaleTimeString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3 text-center">
                  <button className="text-sm text-green-600 hover:text-green-700 font-medium">
                    View All Alerts
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Profile */}
          <div className="p-2 rounded-lg bg-green-100">
            <User className="w-6 h-6 text-green-600" />
          </div>
        </div>
      </div>

      {/* Mobile Header Title */}
      <div className="sm:hidden px-4 pb-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-800">FarmDash</h1>
          <div className="flex items-center space-x-1 text-sm text-gray-600">
            {getWeatherIcon()}
            <span>28°C</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;