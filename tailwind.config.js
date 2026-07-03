/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        void: '#08090a',
        carbon: '#0f1011',
        obsidian: '#161718',
        graphite: '#23252a',
        smoke: '#383b3f',
        ash: '#62666d',
        fog: '#8a8f98',
        mist: '#d0d6e0',
        bone: '#e5e5e6',
        paper: '#ffffff',
        'acid-lime': '#e4f222',
        'pulse-green': '#27a644',
        'coral-red': '#eb5757',
        'signal-teal': '#02b8cc',
        'iris-violet': '#6366f1',
        lavender: '#8b5cf6',
        
        background: '#08090a',
        surface: '#0f1011',
        'surface-elevated': '#161718',
        accent: {
          DEFAULT: '#e4f222',
          light: '#f2fc60',
          glow: 'rgba(228, 242, 34, 0.15)',
        },
        muted: '#62666d',
        'border-dim': 'rgba(255, 255, 255, 0.03)',
        'border-light': 'rgba(255, 255, 255, 0.08)',
      },
      borderRadius: {
        sm: '2px',
        md: '6px',
        lg: '6px',
        xl: '12px',
        '2xl': '16px',
        full: '9999px',
      },
      backgroundImage: {
        'gradient-dark': 'linear-gradient(180deg, #0f1011 0%, #08090a 100%)',
        'gradient-premium': 'linear-gradient(135deg, #e4f222 0%, #a2ad14 100%)',
        'gradient-glow': 'radial-gradient(circle at 50% 50%, rgba(228, 242, 34, 0.1) 0%, transparent 100%)',
      },
      boxShadow: {
        'premium': '0 20px 40px -15px rgba(0, 0, 0, 0.7)',
        'accent-glow': '0 0 20px 0 rgba(228, 242, 34, 0.3)',
        'border-inner': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.05)',
        sm: 'rgba(0, 0, 0, 0.4) 0px 2px 4px 0px',
        md: 'rgba(0, 0, 0, 0.2) 0px 0px 12px 0px inset',
        subtle: 'rgb(35, 37, 42) 0px 0px 0px 1px inset',
      }
    },
  },
  plugins: [],
}
