/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--primary)',
        secondary: 'var(--secondary)',
        'sky-blue': 'var(--sky-blue)',
        'light-orange': 'var(--light-orange)',
        'success-green': 'var(--success-green)',
        'warning-yellow': 'var(--warning-yellow)',
        'error-red': 'var(--error-red)',
        'background-gray': 'var(--background-gray)',
      }
    },
  },
  plugins: [],
} 