import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
        display: [
          "Space Grotesk",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
      },
      colors: {
        paper: "rgb(var(--paper) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        body: "rgb(var(--body) / <alpha-value>)",
        caption: "rgb(var(--caption) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
        "line-strong": "rgb(var(--line-strong) / <alpha-value>)",
        cream: "rgb(var(--cream) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        "cream-line": "rgb(var(--cream-line) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        charcoal: "rgb(var(--charcoal) / <alpha-value>)",
        "charcoal-surface": "rgb(var(--charcoal-surface) / <alpha-value>)",
        "charcoal-line": "rgb(var(--charcoal-line) / <alpha-value>)",
      },
    },
  },
  plugins: [],
};
export default config;
