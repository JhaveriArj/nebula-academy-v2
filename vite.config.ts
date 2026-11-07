import { defineConfig } from 'vitest/config';

// GitHub Pages serves this project from /<repo>/ unless a custom domain is set.
// Override with NEBULA_BASE=/ for a user-root or custom-domain deploy.
const base = process.env.NEBULA_BASE ?? '/nebula-academy-v2/';

export default defineConfig({
  base,
  build: {
    target: 'es2022',
    outDir: 'dist',
    assetsInlineLimit: 2048,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
