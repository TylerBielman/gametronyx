import { configDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Dev: VITE_API_BASE is empty (.env.development), so the site calls /api on
// its own origin and Vite proxies it to a local API (backend/ in EFdungeon:
// `uvicorn app.main:app --port 8000`). Production builds call
// https://api.gametronyx.com directly (.env.production).
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8000',
    },
  },
  preview: {
    proxy: {
      '/api': 'http://127.0.0.1:8000',
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['tests/setup.ts'],
    // server/ (the leaderboard server) has its own package and tests.
    exclude: [...configDefaults.exclude, 'server/**'],
  },
});
