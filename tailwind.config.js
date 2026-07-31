/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['TT Norms Pro', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['Georgia', '"Times New Roman"', 'serif'],
        label: ['Fk Raster Grotesk Compact Blended', 'JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}
