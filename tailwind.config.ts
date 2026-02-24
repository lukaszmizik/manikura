import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#fdf4f6",
          100: "#fbe8ec",
          200: "#f9d5de",
          300: "#f4b4c4",
          400: "#ec86a0",
          500: "#e05a7d",
          600: "#cb3a5f",
          700: "#ab2b4b",
          800: "#8f2740",
          900: "#7b2439",
          950: "#450f1a",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
