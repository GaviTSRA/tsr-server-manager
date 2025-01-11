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
          // 100: "#141414",
          // 200: "#222222",
          // 300: "#3b3b3b",
          // 400: "#636363",
          100: "#1c1f26",
          200: "#16181d",
          300: "#172a31",
          400: "#1d333b",
          500: "#23404a"
        },
        dark: "#0e0f10",
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
