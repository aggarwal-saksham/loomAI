/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          main: '#0B0D10',
          surface: '#15181C',
          subtle: '#1E2126',
          border: '#2B3038',
        },
        accent: {
          DEFAULT: '#FF7A1A',
          hover: '#E56A10',
          muted: 'rgba(255, 122, 26, 0.15)',
        },
        node: {
          pending: '#4A4F57',
          running: '#FF7A1A',
          done: '#3FA772',
          failed: '#C1554A',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
