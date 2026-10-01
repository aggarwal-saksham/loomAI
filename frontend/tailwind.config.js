/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          main: '#0D1015',
          surface: '#161A21',
          subtle: '#1C212A',
          border: '#252B37',
          well: '#0A0C0F',
        },
        accent: {
          DEFAULT: '#FF7A1A',
          hover: '#FF8E36',
          muted: 'rgba(255, 122, 26, 0.15)',
        },
        node: {
          pending: '#525A66',
          running: '#FF7A1A',
          done: '#3FA772',
          failed: '#C1554A',
        },
      },
      boxShadow: {
        'neu-panel': '5px 5px 12px rgba(0, 0, 0, 0.65), -3px -3px 8px rgba(255, 255, 255, 0.04)',
        'neu-card': '6px 6px 14px rgba(0, 0, 0, 0.7), -4px -4px 10px rgba(255, 255, 255, 0.045)',
        'neu-btn': '3px 3px 7px rgba(0, 0, 0, 0.65), -2px -2px 5px rgba(255, 255, 255, 0.05)',
        'neu-btn-hover': '4px 4px 10px rgba(0, 0, 0, 0.75), -2px -2px 6px rgba(255, 255, 255, 0.07)',
        'neu-inset': 'inset 3px 3px 6px rgba(0, 0, 0, 0.8), inset -2px -2px 5px rgba(255, 255, 255, 0.035)',
        'neu-inset-sm': 'inset 1.5px 1.5px 3px rgba(0, 0, 0, 0.75), inset -1px -1px 2px rgba(255, 255, 255, 0.03)',
        'neu-pressed': 'inset 2px 2px 5px rgba(0, 0, 0, 0.85), inset -1px -1px 3px rgba(255, 255, 255, 0.04)',
        'neu-accent': '4px 4px 12px rgba(0, 0, 0, 0.7), -2px -2px 6px rgba(255, 255, 255, 0.1), 0 0 16px rgba(255, 122, 26, 0.4)',
        'neu-done': '4px 4px 12px rgba(0, 0, 0, 0.7), -2px -2px 6px rgba(255, 255, 255, 0.06), 0 0 16px rgba(63, 167, 114, 0.35)',
        'neu-failed': '4px 4px 12px rgba(0, 0, 0, 0.7), -2px -2px 6px rgba(255, 255, 255, 0.06), 0 0 16px rgba(193, 85, 74, 0.35)',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
