/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        dominant: '#FFFFFF',
        secondary: '#F8FAFC',
        accent: '#0F172A',
        destructive: '#EF4444',
      }
    },
  },
  plugins: [],
}
