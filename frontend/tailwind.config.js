/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Brand — clinical blue, navy for headings/nav accents, teal accent
        brand: {
          50: "#EFF6FF",
          100: "#DBEAFE",
          500: "#3B82F6",
          600: "#2563EB",
          700: "#1D4ED8",
        },
        navy: "#163A5F",
        teal: "#0F766E",
        // Surfaces
        surface: {
          bg: "#F7F9FC",
          card: "#FFFFFF",
          muted: "#F2F4F7",
        },
        // Text
        ink: {
          DEFAULT: "#172033",
          secondary: "#667085",
          muted: "#98A2B3",
          faint: "#B6BDCA",
        },
        page: "#F7F9FC",
        // Borders
        line: {
          DEFAULT: "#E5EAF0",
          strong: "#D0D5DD",
        },
        // Result bands (colour is never the only indicator)
        urgent: { text: "#B42318", bg: "#FEF2F2", line: "#FECACA", dot: "#D92D20" },
        review: { text: "#C2410C", bg: "#FFF7ED", line: "#FED7AA", dot: "#EA580C" },
        monitor: { text: "#027A48", bg: "#ECFDF3", line: "#ABEFC6", dot: "#12B76A" },
        inconclusive: { text: "#475467", bg: "#F2F4F7", line: "#D0D5DD", dot: "#667085" },
        ok: { text: "#027A48", bg: "#ECFDF3", line: "#ABEFC6", dot: "#12B76A" },
      },
      fontFamily: {
        sans: ["Manrope", "Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      borderRadius: {
        card: "16px",
        hero: "20px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(23, 32, 51, 0.04), 0 1px 3px rgba(23, 32, 51, 0.03)",
        raised: "0 4px 12px rgba(23, 32, 51, 0.06)",
      },
      maxWidth: {
        shell: "1200px",
      },
    },
  },
  plugins: [],
};
