/* ============================================================
   WARM EARTH TONES THEME
   Natural, organic feeling with warm colors
   ============================================================ */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        income: '#8FBC8F',        // Dark sea green
        expenses: '#CD853F',      // Peru
        savings: '#4682B4',       // Steel blue
        backgroundDark: '#2F2F2F', // Charcoal
        textLight: '#F5F5DC',     // Beige
        surface: '#3E3E3E',       // Dark gray
        surfaceHover: '#4A4A4A',  // Lighter gray
        divider: '#5A5A5A',       // Medium gray
        accent: '#D2691E',        // Chocolate
      },
    },
  },
  plugins: [],
};
