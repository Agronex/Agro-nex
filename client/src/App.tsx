import { useState, useCallback } from "react";
import Header from "./components/Header";
import Navigation from "./components/Navigation";
import Dashboard from "./components/Dashboard";
import WeatherWidget from "./components/WeatherWidget";
import CropDiseaseDetection from "./components/CropDiseaseDetection";
import MarketPrices from "./components/MarketPrices";
import YieldPrediction from "./components/YieldPrediction";
import FarmLogbook from "./components/FarmLogbook";
import AIAssistantPopup from "./components/AIAssistant"; // ✅ use the popup version
import CommunityConnect from "./components/CommunityConnect";
import { mockAlerts } from "./services/mockApi";

// Reusable Settings Panel
const SettingsPanel = () => (
  <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-8">
    <h3 className="text-2xl font-bold text-gray-800 mb-6">Settings</h3>
    <p className="text-gray-600">Settings panel coming soon...</p>
  </div>
);

function App() {
  const [activeView, setActiveView] = useState("dashboard");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Toggle Sidebar
  const handleMenuToggle = useCallback(() => {
    setIsMenuOpen((prev) => !prev);
  }, []);

  // Change Main View
  const handleViewChange = useCallback((view: string) => {
    setActiveView(view);
    setIsMenuOpen(false);
  }, []);

  // Render Active View
  const renderActiveView = useCallback(() => {
    switch (activeView) {
      case "dashboard":
        return <Dashboard />;
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
          <div className="space-y-6">{renderActiveView()}</div>
        </main>
      </div>

      {/* Floating AI Assistant (self-contained) */}
      {activeView !== "community" && <AIAssistantPopup />}
    </div>
  );
}

export default App;
