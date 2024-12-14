/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.tsx", "./src/App.tsx"],
  theme: {
    extend: {
      colors: {
        primary: {
          100: "#ccbb6e",
          200: "#d2c27e",
          300: "#d8ca8e",
          400: "#ded19e",
          500: "#e4d9ae",
          600: "#eae0be",
        },
        neutral: {
          // 100: "#1E1E2E",
          // 200: "#2C2C44",
          // 300: "#444466",
          // 400: "#555577",

          100: "#141414",
          200: "#222222",
          300: "#3b3b3b",
          400: "#636363",
        },
        "primary-text": "#CCCCCC",
        "secondary-text": "#909090",
        "dark-text": "#222222",
        disabled: "#666666",
        danger: "#FF4D4D",
        success: "#28a745",
      },
    },
  },
  plugins: [],
};
