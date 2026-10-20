/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brandNavy: "#0B1B2B",
        brandNavy2: "#0F2438",
        brandGold: "#D4AF37",
        brandSteel: "#94A3B8"
      }
    }
  },
  plugins: []
}
