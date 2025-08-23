/* ============================================================
   OCEAN DEPTHS THEME
   Deep blues and teals inspired by the ocean
   ============================================================ */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        income: '#20B2AA',        // Light sea green
        expenses: '#FF7F50',      // Coral
        savings: '#4169E1',       // Royal blue
        backgroundDark: '#001122', // Deep ocean blue
        textLight: '#F0F8FF',     // Alice blue
        surface: '#003366',       // Dark blue
        surfaceHover: '#004488',  // Medium blue
        divider: '#0066AA',       // Light blue
        accent: '#00CED1',        // Dark turquoise
      },
      backgroundImage: {
        'ocean-gradient': 'linear-gradient(135deg, #001122 0%, #003366 100%)',
      },
    },
  },
  plugins: [],
};
