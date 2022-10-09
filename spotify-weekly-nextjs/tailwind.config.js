/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'montserrat': ['Montserrat'],
      },
      colors: {
        'spotify-green': '#1DB954',
      }
    },
  },
  plugins: [],
}
