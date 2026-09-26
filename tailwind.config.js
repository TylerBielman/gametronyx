/** @type {import('tailwindcss').Config} */
// The GT-01 handheld look (DESIGN §4.4): beige plastic, paper manuals, a
// charcoal bezel, a red A key and an LCD. Values are CSS variables in
// src/styles/index.css.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        page: 'var(--page)',
        casing: 'var(--casing)',
        paper: 'var(--paper)',
        field: 'var(--field)',
        line: { DEFAULT: 'var(--line)', 2: 'var(--line-2)' },
        char: { DEFAULT: 'var(--char)', 2: 'var(--char-2)', 3: 'var(--char-3)' },
        fg: { DEFAULT: 'var(--fg)', 2: 'var(--fg-2)', 3: 'var(--fg-3)', inverse: 'var(--fg-inverse)' },
        red: { DEFAULT: 'var(--red)', deep: 'var(--red-deep)', text: 'var(--red-text)' },
        amber: 'var(--amber)',
        teal: { DEFAULT: 'var(--teal)', text: 'var(--teal-text)' },
        lcd: { DEFAULT: 'var(--lcd)', ink: 'var(--lcd-ink)', dim: 'var(--lcd-dim)' },
        ok: { DEFAULT: 'var(--ok)', bg: 'var(--ok-bg)' },
      },
      fontFamily: {
        display: ['"PT Sans Narrow"', '"Arial Narrow"', 'system-ui', 'sans-serif'],
        sans: ['"PT Sans Narrow"', '"Arial Narrow"', 'system-ui', 'sans-serif'],
        mono: ['"PT Mono"', 'ui-monospace', 'monospace'],
        pixel: ['"Press Start 2P"', '"PT Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
