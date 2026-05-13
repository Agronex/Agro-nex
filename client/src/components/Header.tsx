import React, { useState, useRef, useEffect } from 'react';
import { Bell, User, Menu, X, Sun, Cloud, CloudRain, CheckCheck } from 'lucide-react';
import { Alert } from '../types';
import ProfileMenu from '../components/ProfileMenu';

interface HeaderProps {
  alerts: Alert[];
  onMenuToggle: () => void;
  isMenuOpen: boolean;
}

const Header: React.FC<HeaderProps> = ({ alerts, onMenuToggle, isMenuOpen }) => {
  const [showAlerts, setShowAlerts] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const alertsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Count truly unread (not in our local read set)
  const unreadAlerts = alerts.filter((a) => !a.read && !readIds.has(a.id));

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (alertsRef.current && !alertsRef.current.contains(e.target as Node)) {
        setShowAlerts(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfile(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getSeverityDot = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'warning':  return 'bg-orange-500';
      default:         return 'bg-green-500';
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-700 border-red-200';
      case 'warning':  return 'bg-orange-100 text-orange-700 border-orange-200';
      default:         return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  const markAllRead = () => {
    setReadIds(new Set(alerts.map((a) => a.id)));
  };

  const getWeatherIcon = () => {
    const h = new Date().getHours();
    if (h >= 6 && h < 18) return <Sun className="w-5 h-5 text-yellow-500" />;
    return <Cloud className="w-5 h-5 text-gray-400" />;
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 relative z-40">
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3">
        {/* Left Section */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <button
            onClick={onMenuToggle}
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMenuOpen}
            className="p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <div className="flex items-center space-x-2">
            <span className="text-xl sm:text-2xl">🌿</span>
            <h1 className="text-lg sm:text-xl font-bold text-gray-800">AgroNex</h1>
            <div className="hidden sm:flex items-center ml-1">
              {getWeatherIcon()}
            </div>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-1 sm:space-x-2">
          {/* Alerts bell */}
          <div className="relative" ref={alertsRef}>
            <button
              onClick={() => { setShowAlerts(!showAlerts); setShowProfile(false); }}
              aria-label={`View alerts${unreadAlerts.length > 0 ? ` — ${unreadAlerts.length} unread` : ''}`}
              className="relative p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <Bell className="w-5 h-5 sm:w-6 sm:h-6" />
              {unreadAlerts.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center font-bold">
                  {unreadAlerts.length > 9 ? '9+' : unreadAlerts.length}
                </span>
              )}
            </button>

            {showAlerts && (
              <div
                className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-xl border border-gray-200 z-50"
                style={{ width: 'min(340px, calc(100vw - 16px))' }}
                role="dialog"
                aria-label="Alerts panel"
                aria-live="polite"
              >
                <div className="p-3 sm:p-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-800 text-sm sm:text-base">Farm Alerts</h3>
                  {unreadAlerts.length > 0 && (
                    <button
                      onClick={markAllRead}
                      className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 font-medium px-2 py-1 rounded min-h-[36px]"
                    >
                      <CheckCheck className="w-3 h-3" />
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-72 sm:max-h-80 overflow-y-auto divide-y divide-gray-50">
                  {alerts.length === 0 ? (
                    <div className="p-6 text-center text-gray-500 text-sm">No alerts</div>
                  ) : (
                    alerts.slice(0, 6).map((alert) => {
                      const isUnread = !alert.read && !readIds.has(alert.id);
                      return (
                        <div
                          key={alert.id}
                          className={`p-3 sm:p-4 transition-colors ${isUnread ? 'bg-blue-50' : 'bg-white'}`}
                        >
                          <div className="flex items-start space-x-3">
                            <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${getSeverityDot(alert.severity)}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-0.5">
                                <h4 className="font-medium text-xs sm:text-sm text-gray-800 leading-snug">{alert.title}</h4>
                                <span className={`text-xs px-1.5 py-0.5 rounded border flex-shrink-0 ${getSeverityBadge(alert.severity)}`}>
                                  {alert.severity}
                                </span>
                              </div>
                              <p className="text-xs text-gray-600 leading-snug">{alert.message}</p>
                              <p className="text-xs text-gray-400 mt-1">
                                {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="p-3 text-center border-t border-gray-100">
                  <button
                    onClick={() => setShowAlerts(false)}
                    className="text-xs sm:text-sm text-green-600 hover:text-green-700 font-medium px-3 py-2 rounded min-h-[40px]"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Profile Button */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => { setShowProfile(!showProfile); setShowAlerts(false); }}
              aria-label="Open profile menu"
              className="p-2 rounded-lg bg-green-100 hover:bg-green-200 active:bg-green-300 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <User className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
            </button>
            {showProfile && (
              <ProfileMenu onClose={() => setShowProfile(false)} />
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
