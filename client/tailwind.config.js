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
          100: "#1E1E2E",
          200: "#2C2C44",
          300: "#444466",
          400: "#555577",
          500: "#575a5a",
          600: "#717474",
          700: "#8b8f8f",
        },
        // background: "#121212",
        // // background: "#1E1E2E",
        // header: "#1f1f1f",
        // // header: "#2C2C44",
        // border: "#434649",
        // // border: "#444466",
        "primary-text": "#CCCCCC",
        "secondary-text": "#909090",
        "dark-text": "#222222",
        "disabled": "#666666",
        danger: "#FF4D4D",
        success: "#28a745",
        // "border-hover": "#555577",
        // accent: "#cc9e6e",
      },
    },
  },
  plugins: [],
};
