/** @type {import('tailwindcss').Config} */
// Colors and type come from NEWU's ef-app/src/styles/tokens.css (DESIGN §4.4),
// exposed as CSS variables in src/styles/index.css.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: 'var(--ink)', 2: 'var(--ink-2)', 3: 'var(--ink-3)' },
        bone: { DEFAULT: 'var(--bone)', 2: 'var(--bone-2)', 3: 'var(--bone-3)' },
        gold: 'var(--gold)',
        blood: { DEFAULT: 'var(--blood)', deep: 'var(--blood-deep)' },
        cash: { DEFAULT: 'var(--cash)', deep: 'var(--cash-deep)' },
      },
      fontFamily: {
        display: ['"Archivo Black"', 'Archivo', 'system-ui', 'sans-serif'],
        sans: ['Archivo', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
