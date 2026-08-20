/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Neutral scale (warm gray)
        page: "#FAFAF9",
        ink: {
          DEFAULT: "#1C1917",
          secondary: "#57534E",
          muted: "#78716C",
          faint: "#A8A29E",
        },
        line: {
          DEFAULT: "#E7E5E4",
          strong: "#D6D3D1",
        },
        // Single brand color, used sparingly
        brand: {
          50: "#EEF2FB",
          100: "#DCE5F7",
          500: "#3D63C9",
          600: "#2F52B3",
          700: "#274494",
        },
        // Muted semantic urgency colors (WCAG AA on their tints)
        urgent: { text: "#B42318", bg: "#FEF3F2", line: "#F0C4BE", dot: "#D92D20" },
        review: { text: "#B54708", bg: "#FFF6ED", line: "#F2D3AC", dot: "#EA700D" },
        monitor: { text: "#854D0E", bg: "#FEFCE8", line: "#E8DCA5", dot: "#CA9A04" },
        inconclusive: { text: "#44403C", bg: "#F5F5F4", line: "#D6D3D1", dot: "#78716C" },
        ok: { text: "#067647", bg: "#ECFDF3", line: "#B7E5C8", dot: "#17B26A" },
        // Dark shell (navbar / hero)
        navy: {
          DEFAULT: "#14171F",
          soft: "#1B1F2A",
          line: "#2A2F3D",
          text: "#9CA3AF",
        },
      },
      fontFamily: {
        sans: ['"Instrument Sans"', "system-ui", "-apple-system", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(28, 25, 23, 0.04)",
        raised: "0 1px 3px rgba(28, 25, 23, 0.07), 0 1px 2px rgba(28, 25, 23, 0.04)",
      },
    },
  },
  plugins: [],
};
