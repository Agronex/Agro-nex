import React, { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { motion, AnimatePresence } from "framer-motion";
import Login from "./Login";
import farmImg from "../images/farm2.jpg";

const Signup: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);  // New loading state
  const [showLogin, setShowLogin] = useState(false);

  const handleSignup = async () => {
    setError("");
    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      setSuccess(true);

      // Wait briefly before redirecting to login
      setTimeout(() => setShowLogin(true), 1500);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);  // Stop loading on error
    }
  };

  return (
    <AnimatePresence mode="wait">
      {showLogin ? (
        <motion.div
          key="login"
          initial={{ opacity: 0, x: 300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -300 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        >
          <Login />
        </motion.div>
      ) : (
        <motion.div
          key="signup"
          className="flex min-h-screen bg-gray-50"
          initial={{ opacity: 0, x: -300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 300 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        >
          {/* Left Illustration */}
          <div
            className="hidden md:flex w-1/2 bg-cover bg-center relative text-white items-center justify-center"
            style={{ backgroundImage: `url(${farmImg})` }}
          >
            <div className="absolute inset-0 bg-black bg-opacity-50"></div>
            <div className="relative text-center px-8">
              <h1 className="text-4xl font-extrabold mb-4 drop-shadow-lg">Join AgroNex</h1>
              <p className="text-lg font-semibold drop-shadow-md">
                Empowering farmers with smart technology.
              </p>
            </div>
          </div>

          {/* Right Signup Form */}
          <div className="flex w-full md:w-1/2 items-center justify-center p-8">
            <motion.div
              className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-2xl font-bold mb-4 text-gray-800">Sign Up</h2>

              {error && <p className="text-red-500 mb-2">{error}</p>}
              {success && <p className="text-green-500 mb-2">Signup successful! Redirecting...</p>}

              <input
                type="email"
                placeholder="Email"
                className="w-full p-3 border rounded mb-4 focus:ring-2 focus:ring-green-400 outline-none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}  // Disable input while loading
              />

              <input
                type="password"
                placeholder="Password"
                className="w-full p-3 border rounded mb-4 focus:ring-2 focus:ring-green-400 outline-none"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}  // Disable input while loading
              />

              <button
                onClick={handleSignup}
                className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-500 transition mb-4 flex justify-center items-center"
                disabled={loading}  // Disable button while loading
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
                  "Sign Up"
                )}
              </button>

              <p className="text-center text-gray-600">
                Already have an account?{" "}
                <button
                  onClick={() => setShowLogin(true)}
                  className="text-green-600 hover:underline"
                  disabled={loading}  // Disable switch while loading
                >
                  Login
                </button>
              </p>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Signup;
