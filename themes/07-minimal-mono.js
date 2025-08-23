/* ============================================================
   MINIMAL MONOCHROME THEME
   Clean black and white with subtle grays
   ============================================================ */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        income: '#FFFFFF',        // White
        expenses: '#808080',      // Gray
        savings: '#C0C0C0',       // Silver
        backgroundDark: '#000000', // Pure black
        textLight: '#FFFFFF',     // White
        surface: '#1C1C1C',       // Very dark gray
        surfaceHover: '#2C2C2C',  // Dark gray
        divider: '#404040',       // Medium gray
        accent: '#606060',        // Light gray
      },
    },
  },
  plugins: [],
};
