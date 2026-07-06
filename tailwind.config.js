/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Healing forest green — primary brand colour (Ayurveda)
        brand: {
          50: '#eef7f2',
          100: '#d6ebdf',
          200: '#aed8c1',
          300: '#7dbd9d',
          400: '#4e9d78',
          500: '#2f8060',
          600: '#21664c',
          700: '#1b5140',
          800: '#184334',
          900: '#14372c',
          950: '#0a2019',
        },
        // Warm saffron / turmeric gold — accent
        gold: {
          50: '#fbf6ea',
          100: '#f5e9c8',
          200: '#ecd28d',
          300: '#e2bb55',
          400: '#d8a73e',
          500: '#c08f2b',
          600: '#a07423',
          700: '#7d5a20',
          800: '#5f4520',
          900: '#4f391e',
        },
        cream: '#f7f4ec',
        sand: '#efe9db',
        ink: '#1d2723',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Outfit', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(20,55,44,0.04), 0 8px 24px -12px rgba(20,55,44,0.14)',
        lift: '0 12px 40px -12px rgba(20,55,44,0.28)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      keyframes: {
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        'slide-up': {
          from: { opacity: 0, transform: 'translateY(8px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        'toast-in': {
          from: { opacity: 0, transform: 'translateX(16px)' },
          to: { opacity: 1, transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.25s ease both',
        'slide-up': 'slide-up 0.3s ease both',
        'toast-in': 'toast-in 0.25s ease both',
      },
    },
  },
  plugins: [],
}
