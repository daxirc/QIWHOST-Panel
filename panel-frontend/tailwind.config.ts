import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        background: "#f1f5f9",
        foreground: "var(--foreground)",
        sidebar: "#1a1f2e",
        surface: "#ffffff",
        primary: {
          DEFAULT: "#f97316",
          hover: "#ea6c0a",
        },
        "primary-hover": "#ea6c0a",
      },
    },
  },
  plugins: [],
};
export default config;
