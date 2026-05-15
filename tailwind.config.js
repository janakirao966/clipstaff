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
        display: ['Outfit', 'sans-serif'],
      },
      colors: {
        background: '#050505',
        surface: '#0F0F0F',
        'surface-lighter': '#1A1A1A',
        accent: {
          DEFAULT: '#6366F1',
          light: '#818CF8',
          glow: 'rgba(99, 102, 241, 0.15)',
        },
        secondary: '#06B6D4',
        muted: '#94A3B8',
        border: 'rgba(255, 255, 255, 0.08)',
      },
      backgroundImage: {
        'gradient-premium': 'linear-gradient(135deg, #6366F1 0%, #a855f7 100%)',
        'gradient-glow': 'radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.1) 0%, transparent 100%)',
      },
      boxShadow: {
        'premium': '0 20px 40px -15px rgba(0, 0, 0, 0.5)',
        'accent-glow': '0 0 20px rgba(99, 102, 241, 0.3)',
      }
    },
  },
  plugins: [],
}
