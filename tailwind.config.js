/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        mnp: {
          bg: "#111110",
          card: "#1C1B18",
          border: "#2A2926",
          gold: "#C8A97E",
          text: "#F0EDE6",
          muted: "#7A7870",
          subtle: "#A09D93",
          green: "#6AAF8D",
          red: "#D45454",
          orange: "#D4956A",
          purple: "#A89BC4",
          blue: "#3B8BD4",
        },
      },
      fontFamily: {
        display: ["Playfair Display", "serif"],
        body: ["Manrope", "sans-serif"],
      },
    },
  },
  plugins: [],
};
