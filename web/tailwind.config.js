/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Professional dark navy / charcoal theme
        navy: {
          950: "#0a0f1e",
          900: "#0d1424",
          800: "#121a2e",
          700: "#1a2440",
          600: "#232f52",
        },
        charcoal: {
          900: "#111318",
          800: "#1a1d24",
          700: "#242833",
        },
        // Cyan & blue geographic highlights
        cyan: {
          DEFAULT: "#22d3ee",
          400: "#38e0f0",
          500: "#22d3ee",
          600: "#0891b2",
        },
        accent: {
          blue: "#3b82f6",
          flood: "#f472b6",
          water: "#38bdf8",
          rain: "#a78bfa",
          hazard: "#fb7185",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 20px rgba(34, 211, 238, 0.15)",
      },
    },
  },
  plugins: [],
};
