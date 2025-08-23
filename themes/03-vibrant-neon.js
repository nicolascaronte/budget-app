/* ============================================================
   VIBRANT NEON THEME
   Cyberpunk-inspired with bright accent colors
   ============================================================ */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        income: '#39FF14',        // Electric green
        expenses: '#FF073A',      // Neon red
        savings: '#00FFFF',       // Cyan
        backgroundDark: '#0A0A0A', // Pure black
        textLight: '#FFFFFF',     // White
        surface: '#1A1A1A',       // Dark gray
        surfaceHover: '#2A2A2A',  // Lighter gray
        divider: '#333333',       // Gray divider
        accent: '#FF00FF',        // Magenta accent
      },
      boxShadow: {
        'neon-green': '0 0 10px #39FF14',
        'neon-red': '0 0 10px #FF073A',
        'neon-cyan': '0 0 10px #00FFFF',
      },
    },
  },
  plugins: [],
};
