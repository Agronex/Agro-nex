/** @type {import('tailwindcss').Config} */
export default {
  type : 'module',
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
      },
      animation: {
        fadeIn: 'fadeIn 0.3s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
