/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fdf4ec',
          100: '#fdeadd',
          500: '#c26321',
          600: '#a3501a',
          700: '#854215',
        },
        sidebar: '#282520',
        bg: '#f9f8f6',
        header: '#f4f3ef',
      },
      fontFamily: {
        sans: ['Roboto', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      rotation: {
        '5': '5deg',
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
