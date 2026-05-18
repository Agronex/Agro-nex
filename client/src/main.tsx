import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { UserSettingsProvider } from "./contexts/UserSettingsContext";
import App from "./App";
import Welcome from "./components/Welcome";
import "./index.css";

// Proper loading screen — no raw "Loading..." text
function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
      <span className="text-5xl animate-pulse">🌿</span>
      <p className="text-gray-500 text-sm font-medium tracking-wide">Loading AgroNex...</p>
    </div>
  );
}

function RootApp() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  // Logged-in users skip the welcome page
  if (user) return <App />;

  return <Welcome />;
}

const container = document.getElementById("root");
if (!container) throw new Error("Root element #root not found");

createRoot(container).render(
  <StrictMode>
    <AuthProvider>
      <UserSettingsProvider>
        <RootApp />
      </UserSettingsProvider>
    </AuthProvider>
  </StrictMode>
);
