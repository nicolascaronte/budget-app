/* ============================================================
   SUNSET VIBES THEME
   Warm oranges and purples like a sunset
   ============================================================ */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        income: '#FFD700',        // Gold
        expenses: '#FF4500',      // Orange red
        savings: '#9370DB',       // Medium purple
        backgroundDark: '#191970', // Midnight blue
        textLight: '#FFFAF0',     // Floral white
        surface: '#2F2F4F',       // Dark slate gray
        surfaceHover: '#3F3F5F',  // Slate gray
        divider: '#4F4F6F',       // Light slate gray
        accent: '#FF69B4',        // Hot pink
      },
      backgroundImage: {
        'sunset-gradient': 'linear-gradient(135deg, #191970 0%, #2F2F4F 50%, #4F4F6F 100%)',
      },
    },
  },
  plugins: [],
};
