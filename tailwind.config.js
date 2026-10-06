/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0d1117',
        surface: '#161c26',
        surface2: '#1f2734',
        line: '#2b3546',
        ink: '#e8edf5',
        muted: '#93a1b5',
        accent: '#ff7a3d',
        accentSoft: '#ff7a3d33',
        ok: '#3ddc97',
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
