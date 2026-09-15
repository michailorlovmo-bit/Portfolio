import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f5ff",
          100: "#dbe6fe",
          200: "#bcd0fe",
          300: "#8db0fd",
          400: "#5786fa",
          500: "#3763f4",
          600: "#2445e8",
          700: "#1d35d4",
          800: "#1e2eac",
          900: "#1e2c87",
        },
      },
    },
  },
  plugins: [],
};

export default config;
