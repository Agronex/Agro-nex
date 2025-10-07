// src/pages/Landing.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

export default function Landing() {
  const nav = useNavigate();
  return (
    <div className="min-h-screen bg-gradient-to-b from-aggro-50 to-white">
      <div className="max-w-7xl mx-auto px-6 py-12 lg:py-20 grid lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <h1 className="text-4xl md:text-5xl font-extrabold text-aggro-700 leading-tight">
            Revolutionize Your Farming Experience with <span className="text-aggro-500">AgroNex</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-xl">
            AgroNex is a farming companion for smarter agriculture — monitor crops, track weather, record logbook entries,
            diagnose plant disease and connect with the farming community.
          </p>

          <div className="flex gap-4 items-center">
            <button
              onClick={() => nav("/signin")}
              className="px-6 py-3 rounded-full bg-aggro-500 hover:bg-aggro-700 text-white font-semibold shadow"
            >
              Explore More
            </button>
            <a href="#features" className="text-sm text-gray-700">Learn more</a>
          </div>

          <div id="features" className="mt-8 grid grid-cols-2 gap-4">
            <div className="p-4 bg-white rounded-lg shadow">
              <div className="text-sm text-gray-500">Weather</div>
              <div className="font-semibold text-aggro-700">Accurate local forecasts</div>
            </div>
            <div className="p-4 bg-white rounded-lg shadow">
              <div className="text-sm text-gray-500">Community</div>
              <div className="font-semibold text-aggro-700">Share tips & ask questions</div>
            </div>
          </div>
        </div>

        <div className="hidden lg:flex items-center justify-center">
          {/* Replace with your illustration or image */}
          <div className="w-full max-w-md">
            <img src="/hero-tractor.png" alt="tractor hero" className="w-full rounded-lg shadow-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
