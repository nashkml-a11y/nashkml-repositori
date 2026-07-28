import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f2f6ff",
          100: "#e0e9ff",
          500: "#4f6df5",
          600: "#3c56e0",
          700: "#2f44b8",
        },
      },
    },
  },
  plugins: [],
};

export default config;
