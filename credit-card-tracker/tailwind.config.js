/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
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
