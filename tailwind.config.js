/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0f9ff',
          500: '#0ea5e9',
          600: '#0284c7',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          dark:    'rgb(var(--accent-dark) / <alpha-value>)',
          light:   'rgb(var(--accent-light) / <alpha-value>)',
          subtle:  'rgb(var(--accent-subtle) / <alpha-value>)',
        },
      }
    },
  },
  plugins: [],
}
