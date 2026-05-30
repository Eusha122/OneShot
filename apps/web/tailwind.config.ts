import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      screens: {
        xs: "375px", // small phones (iPhone SE, Galaxy A series)
      },
      colors: {
        canvas: "#0f1117",
        panel: "#161b22",
        line: "rgba(148, 163, 184, 0.16)",
        ink: "#f1f5f9",
        muted: "#94a3b8",
        electric: "#38bdf8",
        violetSoft: "#8b5cf6",
      },
      boxShadow: {
        glow: "0 0 48px rgba(56, 189, 248, 0.12)",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [typography],
} satisfies Config;
