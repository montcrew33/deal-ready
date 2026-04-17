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
        // DealReady — dark boardroom, single teal accent
        background: '#0B0D14',
        surface:    '#111520',
        'surface-light': '#181D2E',
        'surface-hover': '#1E2438',
        border:     '#242B3D',
        'border-light': '#2E3750',
        primary:    '#0D9488',
        'primary-light': '#14B8A6',
        'primary-dim':   '#0D948820',
        foreground: '#F1F5F9',
        'foreground-dim': '#CBD5E1',
        muted:      '#64748B',
        'muted-light': '#94A3B8',
        gold:       '#C8960C',
        'gold-dim': '#C8960C20',
        danger:     '#EF4444',
        'danger-dim': '#EF444420',
        success:    '#10B981',
        'success-dim': '#10B98120',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        'glow-sm':  '0 0 12px 0 rgba(13,148,136,0.15)',
        'glow-md':  '0 0 24px 0 rgba(13,148,136,0.20)',
        'card':     '0 1px 3px 0 rgba(0,0,0,0.4), 0 1px 2px -1px rgba(0,0,0,0.4)',
        'card-hover': '0 4px 16px 0 rgba(0,0,0,0.5)',
      },
      backgroundImage: {
        'dot-grid': 'radial-gradient(circle, #242B3D 1px, transparent 1px)',
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      backgroundSize: {
        'dot-sm': '24px 24px',
        'dot-md': '32px 32px',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
