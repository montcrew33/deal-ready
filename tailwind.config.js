/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // DealReady — light blue/slate, blue accent
        background:      '#F8FAFC',          // slate-50
        surface:         '#FFFFFF',          // white
        'surface-light': '#F1F5F9',          // slate-100
        'surface-hover': '#E2E8F0',          // slate-200
        border:          '#E2E8F0',          // slate-200
        'border-light':  '#CBD5E1',          // slate-300
        primary:         '#3B82F6',          // blue-500
        'primary-light': '#60A5FA',          // blue-400
        'primary-dim':   'rgba(59,130,246,0.08)',
        foreground:      '#0F172A',          // slate-900
        'foreground-dim':'#334155',          // slate-700
        muted:           '#64748B',          // slate-500
        'muted-light':   '#94A3B8',          // slate-400
        gold:            '#D97706',          // amber-600
        'gold-dim':      'rgba(217,119,6,0.08)',
        danger:          '#EF4444',          // red-500
        'danger-dim':    'rgba(239,68,68,0.08)',
        success:         '#10B981',          // emerald-500
        'success-dim':   'rgba(16,185,129,0.08)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        'glow-sm':    '0 0 12px 0 rgba(59,130,246,0.12)',
        'glow-md':    '0 0 24px 0 rgba(59,130,246,0.18)',
        'card':       '0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.04)',
        'card-hover': '0 8px 24px 0 rgba(0,0,0,0.10)',
      },
      backgroundImage: {
        'dot-grid': 'radial-gradient(circle, #CBD5E1 1px, transparent 1px)',
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      backgroundSize: {
        'dot-sm': '24px 24px',
        'dot-md': '32px 32px',
      },
      animation: {
        'fade-in':  'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
