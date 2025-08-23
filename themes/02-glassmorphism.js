/* ============================================================
   GLASSMORPHISM THEME
   Modern frosted glass effect with transparency
   ============================================================ */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        income: '#00D4AA',        // Vibrant teal
        expenses: '#FF6B6B',      // Coral red
        savings: '#4ECDC4',       // Turquoise
        backgroundDark: '#0F0F23', // Deep navy
        textLight: '#FFFFFF',     // Pure white
        surface: 'rgba(255, 255, 255, 0.1)', // Transparent white
        surfaceHover: 'rgba(255, 255, 255, 0.15)',
        divider: 'rgba(255, 255, 255, 0.2)', // Transparent divider
        glass: 'rgba(255, 255, 255, 0.08)', // Glass effect
      },
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        md: '8px',
      },
    },
  },
  plugins: [],
};
