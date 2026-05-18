import { useState, useCallback, useEffect, useRef, Suspense, lazy } from "react";
import Header from "./components/Header";
import Navigation from "./components/Navigation";
import ErrorBoundary from "./components/ErrorBoundary";
import LoadingSpinner from "./components/LoadingSpinner";
import { useAuth } from "./contexts/AuthContext";
import { useUserSettings } from "./contexts/UserSettingsContext";
import Login from "./components/Login";
import { getAlerts } from "./services/alertService";
import { Alert } from "./types";

// ── Lazy-load all heavy views ─────────────────────────────────────────────────
// Each chunk is only downloaded when the user navigates to that view.
const Dashboard           = lazy(() => import("./components/Dashboard"));
const WeatherWidget       = lazy(() => import("./components/WeatherWidget"));
const CropDiseaseDetection = lazy(() => import("./components/CropDiseaseDetection"));
const MarketPrices        = lazy(() => import("./components/MarketPrices"));
const YieldPrediction     = lazy(() => import("./components/YieldPrediction"));
const FarmLogbook         = lazy(() => import("./components/FarmLogbook"));
const CommunityConnect    = lazy(() => import("./components/CommunityConnect"));
const SettingsPanel       = lazy(() => import("./components/Settings"));
const AIAssistantPopup    = lazy(() => import("./components/AIAssistant"));

// ── Fallback shown while a lazy chunk loads ───────────────────────────────────
const ViewLoader = () => (
  <div className="flex items-center justify-center h-64">
    <LoadingSpinner size="lg" />
  </div>
);

function AppShell() {
  // ── All hooks are declared unconditionally ────────────────────────────────
  const { user } = useAuth();
  const { settings } = useUserSettings();
  const [activeView, setActiveView] = useState("dashboard");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const hasAppliedDefaultView = useRef(false);

  // Fetch alerts on mount, refresh every 5 minutes
  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    const fetchAlerts = async () => {
      try {
        const data = await getAlerts();
        if (!cancelled) setAlerts(data);
      } catch {
        // alertService already returns a fallback — no action needed here
      }
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user]);

  useEffect(() => {
    if (user && !hasAppliedDefaultView.current) {
      setActiveView(settings.session.defaultView);
      hasAppliedDefaultView.current = true;
    }
  }, [settings.session.defaultView, user]);

  const handleMenuToggle = useCallback(() => setIsMenuOpen((p) => !p), []);

  const handleViewChange = useCallback((view: string) => {
    setActiveView(view);
    setIsMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // ── Render auth gate AFTER all hooks ────────────────────────────────────────
  if (!user) return <Login />;

  const renderView = () => {
    switch (activeView) {
      case "dashboard":        return <Dashboard onNavigate={handleViewChange} alerts={alerts} />;
      case "weather":          return <WeatherWidget />;
      case "disease-detection": return <CropDiseaseDetection />;
      case "market-prices":    return <MarketPrices />;
      case "yield-prediction": return <YieldPrediction />;
      case "farm-logbook":     return <FarmLogbook />;
      case "community":        return <CommunityConnect />;
      case "settings":         return <SettingsPanel />;
      default:                 return <Dashboard onNavigate={handleViewChange} alerts={alerts} />;
    }
  };

  return (
    <>
      {/* Skip-to-content link for accessibility */}
      <a
        href="#main-content"
        className="absolute -top-full left-0 z-50 bg-blue-600 text-white px-4 py-2 focus:top-0 transition-all"
      >
        Skip to main content
      </a>

      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header alerts={alerts} onMenuToggle={handleMenuToggle} isMenuOpen={isMenuOpen} />

        <div className="flex flex-1 relative">
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
          <main id="main-content" className="flex-1 p-3 sm:p-4 lg:p-8 min-w-0">
            <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto">
              <Suspense fallback={<ViewLoader />}>
                {renderView()}
              </Suspense>
            </div>
          </main>
        </div>

        {/* Floating AI Assistant — lazy, only when not in community view */}
        {activeView !== "community" && (
          <Suspense fallback={null}>
            <AIAssistantPopup />
          </Suspense>
        )}
      </div>
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppShell />
    </ErrorBoundary>
  );
}
