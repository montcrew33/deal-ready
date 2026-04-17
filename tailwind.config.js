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
        // Dark boardroom aesthetic
        background: '#0A0E1A',
        surface: '#12172B',
        'surface-light': '#1A2038',
        border: '#2A3050',
        primary: '#4F8EF7',
        'primary-light': '#A8C8FF',
        foreground: '#E8ECF4',
        muted: '#8892A8',
        gold: '#D4A853',
        danger: '#EF4444',
        success: '#22C55E',
      },
    },
  },
  plugins: [],
};
