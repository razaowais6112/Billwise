import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17202a",
        muted: "#667085",
        line: "#d9dee7",
        surface: "#f7f8fb",
        brand: "#1c6e8c",
        accent: "#d66b32",
        positive: "#18794e",
        warning: "#9a6700",
        danger: "#c2410c"
      },
      boxShadow: {
        panel: "0 1px 2px rgba(16, 24, 40, 0.06)"
      }
    }
  },
  plugins: []
} satisfies Config;
