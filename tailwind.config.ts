import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#FAF8F5",
        card: "#FFFFFF",
        border: "#E4DFD6",
        text: "#2A2622",
        muted: "#8A8074",
        accent: "#C1622E",
        accentbg: "#F3E4DA",
        green: "#3F7D5C",
        greenbg: "#E7F2EC",
        red: "#B23A2E",
        redbg: "#FBEAE7",
        chip: "#F0EBE2",
        interne: "#8A5A3A",
        internebg: "#FBF1E7",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "14px",
      },
    },
  },
  plugins: [],
};
export default config;
