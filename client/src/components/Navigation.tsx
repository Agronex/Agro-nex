import React from 'react';
import { 
  Home, 
  CloudRain, 
  Camera, 
  TrendingUp, 
  BookOpen, 
  MessageCircle, 
  BarChart3, 
  Settings 
} from 'lucide-react';

interface NavigationProps {
  activeView: string;
  onViewChange: (view: string) => void;
  isOpen: boolean;
}

const Navigation: React.FC<NavigationProps> = ({ activeView, onViewChange, isOpen }) => {
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
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => onViewChange(activeView)}
        />
      )}

      {/* Navigation Sidebar */}
      <nav className={`
        fixed top-0 left-0 h-full bg-white shadow-lg border-r border-gray-200 z-50 transition-transform duration-300
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:h-auto
        w-64 lg:w-64
      `}>
        <div className="p-4 border-b border-gray-200 lg:hidden">
          <h2 className="text-xl font-bold text-gray-800">Menu</h2>
        </div>
        
        <div className="p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`
                  w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors
                  ${isActive 
                    ? 'bg-green-50 text-green-700 border-l-4 border-green-500' 
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-green-600' : 'text-gray-400'}`} />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="text-xs text-gray-500 text-center">
            <p>FarmDash v1.0</p>
            <p>Supporting farmers with technology</p>
          </div>
        </div>
      </nav>
    </>
  );
};

export default Navigation;