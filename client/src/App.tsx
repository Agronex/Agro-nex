import { useState, useCallback } from 'react';
import Header from './components/Header';
import Navigation from './components/Navigation';
import Dashboard from './components/Dashboard';
import WeatherWidget from './components/WeatherWidget';
import CropDiseaseDetection from './components/CropDiseaseDetection';
import MarketPrices from './components/MarketPrices';
import YieldPrediction from './components/YieldPrediction';
import FarmLogbook from './components/FarmLogbook';
import AIAssistant from './components/AIAssistant';
import CommunityConnect from './components/CommunityConnect';
import { mockAlerts } from './services/mockApi';
import { MessageSquare } from 'lucide-react';

// Reusable Settings Panel
const SettingsPanel = () => (
  <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-8">
    <h3 className="text-2xl font-bold text-gray-800 mb-6">Settings</h3>
    <p className="text-gray-600">Settings panel coming soon...</p>
  </div>
);

function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showAssistant, setShowAssistant] = useState(false);

  // Toggle Sidebar
  const handleMenuToggle = useCallback(() => {
    setIsMenuOpen((prev) => !prev);
  }, []);

  // Change Main View
  const handleViewChange = useCallback((view: string) => {
    setActiveView(view);
    setIsMenuOpen(false);
    setShowAssistant(false);
  }, []);

  // Render Active View
  const renderActiveView = useCallback(() => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard />;
      case 'weather':
        return <WeatherWidget />;
      case 'disease-detection':
        return <CropDiseaseDetection />;
      case 'market-prices':
        return <MarketPrices />;
      case 'yield-prediction':
        return <YieldPrediction />;
      case 'farm-logbook':
        return <FarmLogbook />;
      case 'community':
        return <CommunityConnect />;
      case 'settings':
        return <SettingsPanel />;
      default:
        return <Dashboard />;
    }
  }, [activeView]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <Header 
        alerts={mockAlerts} 
        onMenuToggle={handleMenuToggle}
        isMenuOpen={isMenuOpen}
      />

      <div className="flex flex-1">
        {/* Sidebar Navigation */}
        <Navigation 
          activeView={activeView}
          onViewChange={handleViewChange}
          isOpen={isMenuOpen}
        />

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-10 transition-all">
          <div className="space-y-6">
            {renderActiveView()}
          </div>
        </main>
      </div>

      {/* Floating AI Assistant Button */}
      {activeView !== 'community' && (
        <div className="fixed bottom-6 right-6 z-50">
          {!showAssistant ? (
            <button
              onClick={() => setShowAssistant(true)}
              className="bg-green-600 hover:bg-green-700 text-white rounded-full p-4 shadow-lg transition"
            >
              <MessageSquare className="w-6 h-6" />
            </button>
          ) : (
            <div className="relative w-80">
              <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 w-80 h-96">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-lg font-semibold">AI Assistant</h4>
                  <button
                    onClick={() => setShowAssistant(false)}
                    className="text-gray-500 hover:text-gray-800"
                  >
                    ✕
                  </button>
                </div>
                <AIAssistant />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
