import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        logic:    { DEFAULT: "#6366f1", light: "#818cf8", bg: "#1e1b4b" },
        planning: { DEFAULT: "#f59e0b", light: "#fbbf24", bg: "#1c1702" },
        ux:       { DEFAULT: "#ec4899", light: "#f472b6", bg: "#1f0b17" },
        data:     { DEFAULT: "#10b981", light: "#34d399", bg: "#052e16" },
      },
    },
  },
  plugins: [],
};

export default config;
