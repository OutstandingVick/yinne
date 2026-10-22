/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        cobalt: "#2457FF",
        canary: "#F5F749",
        ink: "#171717",
      },
    },
  },
  plugins: [],
};
