/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html" // Ensure Tailwind scans your HTML file too
  ],
  theme: {
    extend: {
      colors: {
        'background': '#F4EFEA',
        'primary-text': '#4E3629',
        'secondary-bg': '#E0D8D0',
        'input-bg': '#C8C2BA',
        'highlight-red': '#8A2A2B',
      },
    },
  },
  plugins: [],
}