import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        surface: "var(--surface)",
        border: "var(--border)",
        foreground: "var(--foreground)",
        primary: "var(--primary)",
        secondary: "var(--secondary)",
        hover: "var(--hover)",
        bullish: "var(--bullish)",
        bearish: "var(--bearish)",
        neutral: "var(--neutral)",
        card: "var(--card)",
        "card-border": "var(--card-border)",
      },
    },
  },
  plugins: [],
};
export default config;
