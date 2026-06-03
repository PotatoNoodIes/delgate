import type { Config } from 'tailwindcss'

export default {
  content: [
    './components/**/*.{vue,js,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './app.vue',
    './plugins/**/*.{js,ts}',
    './nuxt.config.{js,ts}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#05070D',
          900: '#0A0D14',
          850: '#0E1119',
          800: '#111827',
          700: '#1F2937',
          600: '#374151',
          500: '#6B7280',
          400: '#9CA3AF',
        },
        brand: {
          amber: '#F59E0B',
          light: '#FCD34D',
          dark: '#D97706',
          glow: 'rgba(245, 158, 11, 0.15)',
        },
        success: '#10B981',
        danger: '#EF4444',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.25s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-dot': 'pulseDot 1.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseDot: {
          '0%, 80%, 100%': { transform: 'scale(0.6)', opacity: '0.4' },
          '40%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      boxShadow: {
        'amber-glow': '0 0 20px rgba(245, 158, 11, 0.2)',
        'card': '0 4px 24px rgba(0,0,0,0.4)',
        'input': '0 0 0 2px rgba(245, 158, 11, 0.35)',
      },
    },
  },
  plugins: [],
} satisfies Config
