import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import Signup from "./Signup";
import farmImg from "../images/farm2.jpg";

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false); // New loading state
  const [showSignup, setShowSignup] = useState(false);

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Redirect handled elsewhere or by auth listener
    } catch (err: any) {
      setError(err.message);
      setLoading(false); // Stop loading on error
    }
  };

  if (showSignup) return <Signup />;

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Left Illustration */}
      <div
        className="hidden md:flex w-1/2 bg-cover bg-center relative text-white items-center justify-center"
        style={{ backgroundImage: `url(${farmImg})` }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-50"></div>
        <div className="relative text-center px-8">
          <h1 className="text-4xl font-extrabold mb-4 drop-shadow-lg">Welcome to AgroNex</h1>
          <p className="text-lg font-semibold drop-shadow-md">
            Empowering farmers with smart technology.
          </p>
        </div>
      </div>

      {/* Right Login Form */}
      <div className="flex w-full md:w-1/2 items-center justify-center p-8">
        <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Sign In</h2>

          {error && <p className="text-red-500 mb-2">{error}</p>}

          <input
            type="email"
            placeholder="Email"
            className="w-full p-3 border rounded mb-4 focus:ring-2 focus:ring-green-400 outline-none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading} // Disable while loading
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full p-3 border rounded mb-4 focus:ring-2 focus:ring-green-400 outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading} // Disable while loading
          />

          <button
            onClick={handleLogin}
            className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-500 transition mb-4 flex justify-center items-center"
            disabled={loading} // Disable while loading
          >
            {loading ? (
              <svg
                className="animate-spin h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                ></path>
              </svg>
            ) : (
              "Login"
            )}
          </button>

          <p className="text-center text-gray-600">
            Don’t have an account?{" "}
            <button
              onClick={() => setShowSignup(true)}
              className="text-green-600 hover:underline"
              disabled={loading} // Prevent switching during loading
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
