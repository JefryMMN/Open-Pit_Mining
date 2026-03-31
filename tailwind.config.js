/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gov: {
          blue: {
            DEFAULT: '#1a365d',
            dark: '#0f2443',
            light: '#2c5282',
          },
          gray: {
            DEFAULT: '#4a5568',
            light: '#e2e8f0',
            dark: '#2d3748',
          },
          accent: '#c53030',
          success: '#38a169',
          warning: '#d69e2e',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
