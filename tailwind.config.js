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
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        background: '#050505',
        surface: '#0A0A0A',
        'surface-elevated': '#121212',
        accent: {
          DEFAULT: '#6366F1',
          light: '#818CF8',
          glow: 'rgba(99, 102, 241, 0.15)',
        },
        muted: '#525252',
        'border-dim': 'rgba(255, 255, 255, 0.03)',
        'border-light': 'rgba(255, 255, 255, 0.08)',
      },
      backgroundImage: {
        'gradient-dark': 'linear-gradient(180deg, #0A0A0A 0%, #050505 100%)',
        'gradient-premium': 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
        'gradient-glow': 'radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.1) 0%, transparent 100%)',
      },
      boxShadow: {
        'premium': '0 20px 40px -15px rgba(0, 0, 0, 0.7)',
        'accent-glow': '0 0 20px 0 rgba(99, 102, 241, 0.3)',
        'border-inner': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.05)',
      }
    },
  },
  plugins: [],
}
