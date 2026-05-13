import { useState, useCallback, useEffect } from "react";
import Header from "./components/Header";
import Navigation from "./components/Navigation";
import Dashboard from "./components/Dashboard";
import WeatherWidget from "./components/WeatherWidget";
import CropDiseaseDetection from "./components/CropDiseaseDetection";
import MarketPrices from "./components/MarketPrices";
import YieldPrediction from "./components/YieldPrediction";
import FarmLogbook from "./components/FarmLogbook";
import AIAssistantPopup from "./components/AIAssistant";
import CommunityConnect from "./components/CommunityConnect";
import { useAuth } from "./contexts/AuthContext";
import Login from "./components/Login";
import SettingsPanel from "./components/Settings";
import ErrorBoundary from "./components/ErrorBoundary";
import { getAlerts } from "./services/alertService";
import { Alert } from "./types";

function App() {
  const { user } = useAuth();

  if (!user) return <Login />;

  const [activeView, setActiveView] = useState("dashboard");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  // Fetch real-time alerts on mount and every 5 minutes
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const data = await getAlerts();
        setAlerts(data);
      } catch {
        // silently fail — alertService already handles fallback
      }
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleMenuToggle = useCallback(() => {
    setIsMenuOpen((prev) => !prev);
  }, []);

  const handleViewChange = useCallback((view: string) => {
    setActiveView(view);
    setIsMenuOpen(false);
    // Scroll to top on view change (important on mobile)
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const renderActiveView = useCallback(() => {
    switch (activeView) {
      case "dashboard":
        return <Dashboard onNavigate={handleViewChange} alerts={alerts} />;
      case "weather":
        return <WeatherWidget />;
      case "disease-detection":
        return <CropDiseaseDetection />;
      case "market-prices":
        return <MarketPrices />;
      case "yield-prediction":
        return <YieldPrediction />;
      case "farm-logbook":
        return <FarmLogbook />;
      case "community":
        return <CommunityConnect />;
      case "settings":
        return <SettingsPanel />;
      default:
        return <Dashboard onNavigate={handleViewChange} alerts={alerts} />;
    }
  }, [activeView, alerts, handleViewChange]);

  return (
    <ErrorBoundary>
      <a
        href="#main-content"
        className="absolute -top-full left-0 z-50 bg-blue-600 text-white px-4 py-2 focus:top-0 focus:left-0 transition-all"
      >
        Skip to main content
      </a>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header
          alerts={alerts}
          onMenuToggle={handleMenuToggle}
          isMenuOpen={isMenuOpen}
        />

        <div className="flex flex-1 relative">
          {/* Sidebar Navigation */}
          <Navigation
            activeView={activeView}
            onViewChange={handleViewChange}
            isOpen={isMenuOpen}
            onClose={() => setIsMenuOpen(false)}
          />

          {/* Mobile overlay backdrop */}
          {isMenuOpen && (
            <div
              className="fixed inset-0 bg-black bg-opacity-40 z-20 md:hidden"
              onClick={() => setIsMenuOpen(false)}
              aria-hidden="true"
            />
          )}

          {/* Main Content */}
          <main id="main-content" className="flex-1 p-3 sm:p-4 lg:p-8 min-w-0 transition-all">
            <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto">
              {renderActiveView()}
            </div>
          </main>
        </div>

        {/* Floating AI Assistant */}
        {activeView !== "community" && <AIAssistantPopup />}
      </div>
    </ErrorBoundary>
  );
}

export default App;
