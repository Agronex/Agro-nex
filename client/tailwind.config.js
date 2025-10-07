/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        aggro: {
          50: "#f2fbf5",
          100: "#e6f7ea",
          300: "#7ed39a",
          500: "#28a745",
          700: "#1f7f37"
        }
      }
    },
  },
  plugins: [],
};
