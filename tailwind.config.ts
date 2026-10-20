import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f1f8f3",
          100: "#dcefe1",
          200: "#bbdfc6",
          300: "#8dc7a2",
          400: "#5aa87a",
          500: "#388b5c",
          600: "#276f48",
          700: "#20593b",
          800: "#1c4731",
          900: "#183b2a",
          950: "#0b2117",
        },
        blush: {
          50: "#fdf3f4",
          100: "#fbe8ea",
          200: "#f6d4d9",
          300: "#efb1ba",
          400: "#e48595",
          500: "#d65b72",
          600: "#c03c5a",
          700: "#a12e4a",
        },
        sand: { 50: "#fbf8f3", 100: "#f5efe4", 200: "#eadfc8" },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      keyframes: {
        "fade-up": { "0%": { opacity: "0", transform: "translateY(12px)" }, "100%": { opacity: "1", transform: "none" } },
        "slide-in": { "0%": { transform: "translateX(100%)" }, "100%": { transform: "none" } },
      },
      animation: {
        "fade-up": "fade-up .6s ease-out both",
        "slide-in": "slide-in .3s ease-out both",
      },
    },
  },
  plugins: [],
} satisfies Config;
