/** @type {import('tailwindcss').Config} */
module.exports = {
  // Update to match your file locations
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  // NativeWind v4 preset
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        income: '#9B5DE5',
        expenses: '#FF6F59',
        savings: '#00F5D4',
        backgroundDark: '#121212',
        textLight: '#FFFFFF',
        surface: '#1E1E1E',
        divider: '#2A2A2A',
      },
    },
  },
  plugins: [],
}
