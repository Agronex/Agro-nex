// src/components/Welcome.tsx
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Login from "./Login"; // Your login component
import farmHeroImg from "../images/farm-hero.jpg"; // Your hero image

const Welcome: React.FC = () => {
  const [showLogin, setShowLogin] = useState(false);

  return (
    <AnimatePresence mode="wait">
      {showLogin ? (
        <motion.div
          key="login"
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        >
          <Login />
        </motion.div>
      ) : (
        <motion.div
          key="welcome"
          className="min-h-screen flex flex-col"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Header */}
          <header className="bg-[#0B1D3A] text-white px-8 py-4 shadow-md">
            <h1 className="text-2xl font-bold">AgroNex</h1>
          </header>

          {/* Hero Section */}
          <section
            className="relative flex-1 flex items-center justify-center bg-cover bg-center"
            style={{ backgroundImage: `url(${farmHeroImg})` }}
          >
            {/* Overlay */}
            <div className="absolute inset-0 bg-black bg-opacity-50"></div>

            {/* Content */}
            <motion.div
              className="relative text-center max-w-3xl px-6"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-6 drop-shadow-lg">
                Revolutionize Your Farming Experience with AgroNex
              </h1>
              <p className="text-white text-lg md:text-xl mb-4 drop-shadow-md">
                AgroNex is an AI-powered solution designed to assist farmers in making smarter decisions about their crops, weather, and plant health.
              </p>
              <p className="text-white text-lg md:text-xl mb-6 drop-shadow-md">
                Get personalized advice, diagnose diseases, and optimize your yield using cutting-edge technology. With AgroNex, sustainable farming is at your fingertips.
              </p>
              <button
                onClick={() => setShowLogin(true)}
                className="bg-green-600 hover:bg-green-500 text-white font-semibold px-8 py-4 rounded-full text-lg transition"
              >
                Explore More
              </button>
            </motion.div>
          </section>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Welcome;
