import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // dark base
        threshold: "#1A0E22",   // page background (deeper than the palette base)
        shadow: "#0C0420",
        // palette
        ledger: "#5D3C64",      // deep plum (panel surface)
        landlord: "#7B466A",    // landlord side
        tenant: "#9F6496",      // tenant side
        brass: "#D391B0",       // accent / primary
        pin: "#BA6E8F",         // secondary accent
        clay: "#D391B0",        // danger / red flag (warm pink)
        inspection: "#BA6E8F",  // resolved (kept on-palette)
        // light text / card paper
        paper: "#F3E4EC",
        plaster: "#3A1F44",     // raised card surface
        ink: "#F7E8EE",
      },
      fontFamily: {
        display: ["var(--font-bodoni)", "serif"],
        body: ["var(--font-manrope)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      fontWeight: {
        body: "600",
      },
      boxShadow: {
        brass: "0 2px 0 #5D3C64, inset 0 1px 0 rgba(255,255,255,0.25)",
        plaque: "0 1px 0 #0C0420, 0 8px 24px rgba(12,4,32,0.55)",
        pin: "0 4px 12px rgba(12,4,32,0.6)",
      },
    },
  },
  plugins: [],
};
export default config;
