import { useState, useCallback } from "react";
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
import { mockAlerts } from "./services/mockApi";
import { useAuth } from "./contexts/AuthContext"; // Auth context
import Login from "./components/Login"; // Login page component
import { signOut } from "firebase/auth";
import { auth } from "./firebase";
import SettingsPanel from "./components/Settings";
// Reusable Settings Panel


function App() {
  const { user } = useAuth(); // Get current user

  // If not logged in, show login page
  if (!user) return <Login />;

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
      {/* Header with Logout */}
      <Header
        alerts={mockAlerts}
        onMenuToggle={handleMenuToggle}
        isMenuOpen={isMenuOpen}
        showLogout={true} // optional prop to show logout button
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
