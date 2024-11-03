/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./src/**/*.tsx", "./src/App.tsx"],
    theme: {
        extend: {
            colors: {
                "background": "#1E1E2E",
                "header": "#2C2C44",
                "primary-text": "#FFFFFF",
                "secondary-text": "#B0B0C0",
                "danger": "#FF4D4D",
                "success": "#28a745",
                "border": "#444466",
                "border-hover": "#555577",
                'context-menu': '#2B2B3A',
                "context-menu-border": "#1F1F28",
                "button": "#2D2D3A",
                "button-hover": "#3A3A50",
                "accent": "#9999FF"
            },
        },
    },
    plugins: [],
};
