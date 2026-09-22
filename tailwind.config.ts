import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "var(--sidro-navy)",
        "navy-light": "var(--sidro-navy-light)",
        bg: "var(--sidro-bg)",
        slate: "var(--sidro-slate)",
        alert: "var(--sidro-alert)",
      },
      fontFamily: {
        sans: ["var(--font-atkinson)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
