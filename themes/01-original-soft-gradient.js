/* ============================================================
   ORIGINAL THEME: SOFT GRADIENT (Your Current Theme)
   Inspired by subtle gradients, very easy on eyes
   ============================================================ */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        income: '#81C784',        // Gentle mint
        expenses: '#FFAB91',      // Soft apricot
        savings: '#64B5F6',       // Light ocean blue
        backgroundDark: '#1B1B1F', // Subtle blue-black
        textLight: '#F3F4F6',     // Very soft white
        surface: '#2D2D35',       // Blue-tinted surface
        divider: '#404045',       // Muted divider
      },
    },
  },
  plugins: [],
};
