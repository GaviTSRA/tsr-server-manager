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
          100: "#101013",
          150: "#161618",
          200: "#1d1d20",
          300: "#222225",
          400: "#2c2c2f",
        },
        "primary-text": "#CCCCD0",
        "secondary-text": "#808080",
        "dark-text": "#222222",
        disabled: "#666666",
        danger: "#FF4D4D",
        success: "#28a745",
        confirm: {
          normal: "#1f7a47",
          hover: "#1a693d",
          active: "#155c35",
          disabled: "#0f3d23",
        },
        cancel: {
          normal: "#40444B",
          hover: "#353A40",
          active: "#2B2F34",
          disabled: "#383c42",
        },
      },
    },
  },
  plugins: [],
};
