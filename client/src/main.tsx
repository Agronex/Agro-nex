import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import Login from "./components/Login.jsx"; // Your login component
import { AuthProvider, useAuth } from "./contexts/AuthContext"; // Auth context we created
import "./index.css";
import Welcome from "./components/Welcome";

// Root component to handle auth-based rendering
const RootApp = () => {
  const { user, loading } = useAuth();
  const [showWelcome, setShowWelcome] = useState(true); // Welcome page state

  if (loading) return <div>Loading...</div>;

  // If user is logged in, skip welcome page
  if (user) return <App />;

  return showWelcome ? (
    <Welcome />
  ) : (
    <Login /> // Or Signup handled inside Welcome
  );
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <RootApp />
    </AuthProvider>
  </StrictMode>
);
