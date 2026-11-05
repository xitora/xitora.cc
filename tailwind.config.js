/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        mono: ['Consolas', 'D2Coding', 'D2 coding', 'monospace'],
        sans: ['Outfit', 'Pretendard', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
