/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['selector', '.theme-dark'],
  theme: {
    extend: {
      animation: {
        colorFlash: "colorFlash 0.3s ease-out forwards",
        sioxTextGlitch: "sioxTextGlitch 3s ease-in-out infinite",
        sioxBootFade: "sioxBootFade 2.5s ease-out forwards",
        sioxBorderPulse: "sioxBorderPulse 2s ease-in-out infinite",
      },
      keyframes: {
        colorFlash: {
          "0%": { backgroundColor: "#1e3a8a" },
          "25%": { backgroundColor: "#16a34a" },
          "50%": { backgroundColor: "#f59e0b" },
          "75%": { backgroundColor: "#dc2626" },
          "100%": { backgroundColor: "#000000" },
        },
        sioxTextGlitch: {
          "0%, 100%": { opacity: "0.7", transform: "translateX(0)" },
          "10%": { opacity: "0.5", transform: "translateX(-1px)" },
          "20%": { opacity: "0.9", transform: "translateX(1px)" },
          "30%": { opacity: "0.6", transform: "translateX(0)" },
          "40%": { opacity: "1", transform: "translateX(1px)" },
          "50%": { opacity: "0.7", transform: "translateX(-1px)" },
          "60%": { opacity: "0.8", transform: "translateX(0)" },
        },
        sioxBootFade: {
          "0%": { opacity: "1" },
          "70%": { opacity: "1" },
          "100%": { opacity: "0", pointerEvents: "none" },
        },
        sioxBorderPulse: {
          "0%, 100%": { opacity: "0.4", transform: "scale(1)" },
          "50%": { opacity: "0.8", transform: "scale(1.02)" },
        },
      },
    },
  },
  plugins: [],
};
