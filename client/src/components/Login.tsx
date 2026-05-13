import React, { useState } from "react";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import Signup from "./Signup";
import farmImg from "../images/farm2.jpg";
import Button from "./Button";
import Input from "./Input";

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showSignup, setShowSignup] = useState(false);

  React.useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const handleLogin = async () => {
    if (!validateForm()) return;
    setError("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setSuccess("Successfully logged in!");
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setGoogleLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      // AuthContext's onAuthStateChanged will handle the redirect
    } catch (err: any) {
      if (err.code !== "auth/popup-closed-by-user") {
        setError(err.message || "Google sign-in failed. Please try again.");
      }
      setGoogleLoading(false);
    }
  };

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validateForm = () => {
    let isValid = true;
    setEmailError("");
    setPasswordError("");

    if (!email.trim()) {
      setEmailError("Email is required");
      isValid = false;
    } else if (!isValidEmail(email)) {
      setEmailError("Please enter a valid email address");
      isValid = false;
    }

    if (!password) {
      setPasswordError("Password is required");
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      isValid = false;
    }

    return isValid;
  };

  if (showSignup) return <Signup />;

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Left Illustration — hidden on mobile */}
      <div
        className="hidden md:flex w-1/2 bg-cover bg-center relative text-white items-center justify-center"
        style={{ backgroundImage: `url(${farmImg})` }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-50" />
        <div className="relative text-center px-8">
          <h1 className="text-4xl font-extrabold mb-4 drop-shadow-lg">Welcome to AgroNex</h1>
          <p className="text-lg font-semibold drop-shadow-md">
            Empowering farmers with smart technology.
          </p>
        </div>
      </div>

      {/* Right Login Form */}
      <div className="flex w-full md:w-1/2 items-center justify-center p-4 sm:p-8">
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg w-full max-w-md">
          {/* Mobile logo */}
          <div className="md:hidden text-center mb-6">
            <span className="text-3xl">🌿</span>
            <h1 className="text-2xl font-extrabold text-green-700 mt-1">AgroNex</h1>
            <p className="text-sm text-gray-500">Smart farming companion</p>
          </div>

          <h2 className="text-2xl font-bold mb-6 text-gray-800">Sign In</h2>

          {error && <p className="text-red-600 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm">{error}</p>}
          {success && <p className="text-green-600 mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm">✓ {success}</p>}

          {/* Google Sign-In */}
          <button
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors mb-4 font-medium text-gray-700 min-h-[48px] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {googleLoading ? (
              <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            <span>{googleLoading ? "Signing in..." : "Continue with Google"}</span>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium">OR</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} className="space-y-4">
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              label="Email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
              disabled={loading}
              error={emailError}
              required
            />

            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              label="Password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setPasswordError(""); }}
              disabled={loading}
              error={passwordError}
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              disabled={loading || googleLoading || emailError !== "" || passwordError !== ""}
              className="w-full"
            >
              Login
            </Button>
          </form>

          <p className="text-center text-gray-700 mt-4 text-sm">
            Don't have an account?{" "}
            <button
              onClick={() => setShowSignup(true)}
              className="text-green-600 hover:underline font-medium px-2 py-2 min-h-[44px]"
              disabled={loading || googleLoading}
            >
              Sign Up
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
