import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#0ea5e9",
          "primary-dark": "#0284c7",
          accent: "#06b6d4",
          warm: "#f59e0b",
        },
        ink: {
          DEFAULT: "#0f172a",
          muted: "#475569",
          subtle: "#64748b",
          faint: "#94a3b8",
        },
        surface: {
          DEFAULT: "#f8fafc",
          card: "#ffffff",
          sidebar: "#f1f5f9",
        },
      },
      fontFamily: {
        sans: ["DM Sans", "system-ui", "sans-serif"],
        display: ["DM Sans", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(15 23 42 / 0.06), 0 1px 2px -1px rgb(15 23 42 / 0.06)",
        "card-hover":
          "0 10px 25px -5px rgb(14 165 233 / 0.12), 0 8px 10px -6px rgb(15 23 42 / 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
