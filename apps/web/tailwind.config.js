/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Baseball-inspired theme from design-system.md
        field: {
          green: {
            50: '#E8F5E8',
            100: '#C8E6C8',
            200: '#A5D6A5',
            300: '#81C784',
            400: '#66BB6A',
            500: '#4CAF50',
            600: '#2E7D32', // Primary
            700: '#1B5E20',
            800: '#0D4E11',
            900: '#003300',
          },
        },
        dirt: {
          brown: {
            50: '#EFEBE9',
            100: '#D7CCC8',
            200: '#BCAAA4',
            300: '#A1887F',
            400: '#8D6E63', // Supporting
            500: '#795548',
            600: '#6D4C41',
            700: '#5D4037',
            800: '#4E342E',
            900: '#3E2723',
          },
        },
      },
      spacing: {
        touch: '48px', // Minimum touch target
        base: '8px',
      },
      screens: {
        xs: '375px', // iPhone SE baseline
      },
    },
  },
  plugins: [],
};
