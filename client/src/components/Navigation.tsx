import React from 'react';
import {
  Home,
  CloudRain,
  Camera,
  TrendingUp,
  BookOpen,
  MessageCircle,
  BarChart3,
  Settings,
  X
} from 'lucide-react';

interface NavigationProps {
  activeView: string;
  onViewChange: (view: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const Navigation: React.FC<NavigationProps> = ({ activeView, onViewChange, isOpen, onClose }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'weather', label: 'Weather & Irrigation', icon: CloudRain },
    { id: 'disease-detection', label: 'Disease Detection', icon: Camera },
    { id: 'market-prices', label: 'Market Prices', icon: TrendingUp },
    { id: 'yield-prediction', label: 'Yield Prediction', icon: BarChart3 },
    { id: 'farm-logbook', label: 'Farm Logbook', icon: BookOpen },
    { id: 'community', label: 'Community', icon: MessageCircle },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <>
      {/* Navigation Sidebar */}
      <nav
        role="navigation"
        aria-label="Main navigation"
        className={`
          fixed top-0 left-0 h-full bg-white shadow-xl border-r border-gray-200 z-30 
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 md:static md:h-auto md:shadow-none md:z-auto
          w-64 flex-shrink-0 flex flex-col
        `}
      >
        {/* Mobile header with close button */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 md:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌿</span>
            <h2 className="text-lg font-bold text-gray-800">AgroNex</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close navigation menu"
            className="p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Nav items */}
        <div className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                aria-current={isActive ? 'page' : undefined}
                aria-label={item.label}
                className={`
                  w-full flex items-center space-x-3 px-3 py-3 rounded-lg text-left 
                  transition-colors min-h-[48px]
                  ${isActive
                    ? 'bg-green-50 text-green-700 border-l-4 border-green-500'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 active:bg-gray-100'
                  }
                `}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-green-600' : 'text-gray-400'}`} />
                <span className="font-medium text-sm">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100">
          <div className="text-xs text-gray-400 text-center">
            <p className="font-medium">AgroNex v3.2</p>
            <p className="hidden md:block mt-0.5">Smart farming companion</p>
          </div>
        </div>
      </nav>
    </>
  );
};

export default Navigation;
