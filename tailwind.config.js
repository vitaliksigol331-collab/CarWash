/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Manrope', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        ink: {
          950: '#0B1220',
          900: '#0F1729',
          800: '#131B2C',
          700: '#1A2438',
          600: '#253150',
          500: '#334166',
        },
        aqua: {
          400: '#22D3EE',
          500: '#0EA5C7',
        },
        foam: {
          400: '#34D399',
          500: '#10B981',
        },
        amber: {
          400: '#FBBF24',
        },
        coral: {
          400: '#F87171',
        },
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(34,211,238,0.15), 0 8px 24px -8px rgba(34,211,238,0.25)',
      },
      backgroundImage: {
        'water-fade': 'linear-gradient(180deg, rgba(34,211,238,0.08) 0%, rgba(11,18,32,0) 60%)',
      },
    },
  },
  plugins: [],
}
