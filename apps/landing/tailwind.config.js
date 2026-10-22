/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        cobalt: "#2457FF",
        canary: "#F5F749",
        vanilla: "#F6F5AE",
        ink: "#171717",
      },
      fontFamily: {
        // Free stand-ins for parse.bot's PP Mondwest (pixel serif) and PP Neue Bit (bitmap).
        display: ['"Pixelify Sans"', "ui-serif", "Georgia", "serif"],
        bit: ['"Silkscreen"', "ui-monospace", "monospace"],
        mono: ['"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
