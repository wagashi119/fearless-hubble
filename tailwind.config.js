/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ccfolia: {
          dark: '#1e1f22',
          darker: '#141517',
          panel: '#2b2d31',
          border: '#383a40',
          accent: '#5865f2',
          critical: '#ffd700',
          fumble: '#ef4444'
        }
      }
    },
  },
  plugins: [],
}
