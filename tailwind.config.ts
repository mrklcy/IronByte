import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "Geist", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        surface: "hsl(var(--surface))",
        primary: {
          DEFAULT: "#078BFF",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#0757C8",
          foreground: "#FFFFFF",
        },
        accent: {
          DEFAULT: "#2EA8FF",
          foreground: "#03162D",
        },
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1rem",
      },
      boxShadow: {
        soft: "0 16px 40px rgba(3, 22, 45, 0.10)",
        lift: "0 10px 26px rgba(7, 139, 255, 0.22)",
      },
    },
  },
  plugins: [],
} satisfies Config;
