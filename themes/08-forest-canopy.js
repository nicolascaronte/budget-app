/* ============================================================
   FOREST CANOPY THEME
   Green-focused theme with natural tones
   ============================================================ */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        income: '#32CD32',        // Lime green
        expenses: '#FF6347',      // Tomato
        savings: '#4682B4',       // Steel blue
        backgroundDark: '#1B2F1B', // Dark forest green
        textLight: '#F5FFFA',     // Mint cream
        surface: '#2F4F2F',       // Dark olive green
        surfaceHover: '#3A5F3A',  // Olive green
        divider: '#556B2F',       // Dark olive green
        accent: '#9ACD32',        // Yellow green
      },
    },
  },
  plugins: [],
};
