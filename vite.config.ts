import { createHash } from 'node:crypto';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

// GitHub Pages serves this project from /<repo>/ unless a custom domain is set.
// Override with NEBULA_BASE=/ for a user-root or custom-domain deploy.
const base = process.env.NEBULA_BASE ?? '/nebula-academy-v2/';

/* The built page's security policy, as <meta> tags because GitHub Pages cannot send headers
   (docs/SECURITY-HEADERS.md says what that costs and why). Build only: the dev server needs its
   own inline scripts and a websocket. Scripts run only from this site, plus each inline script by
   its hash; nothing loads from anywhere else, except the class-code server when one is set. */
function securityMeta(supabaseUrl: string | undefined) {
  return {
    name: 'nebula-security-meta',
    apply: 'build' as const,
    transformIndexHtml(html: string) {
      const hashes = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
        .map((m) => `'sha256-${createHash('sha256').update(m[1]!).digest('base64')}'`);
      const connect = ["'self'", supabaseUrl ? new URL(supabaseUrl).origin : ''].filter(Boolean).join(' ');
      const csp = [
        "default-src 'self'",
        `script-src 'self' ${hashes.join(' ')}`.trim(),
        // Style attributes are set from code, and CodeMirror adds <style> where a browser has no
        // constructable stylesheets. No untrusted HTML reaches the page, so this stays.
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data:",
        "font-src 'self'",
        `connect-src ${connect}`,
        "worker-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; ');
      return [
        { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: csp }, injectTo: 'head-prepend' as const },
        { tag: 'meta', attrs: { name: 'referrer', content: 'no-referrer' }, injectTo: 'head-prepend' as const },
      ];
    },
  };
}

export default defineConfig(({ mode }) => ({
  base,
  plugins: [securityMeta(loadEnv(mode, process.cwd(), 'VITE_').VITE_SUPABASE_URL)],
  build: {
    target: 'es2022',
    outDir: 'dist',
    assetsInlineLimit: 2048,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
}));
