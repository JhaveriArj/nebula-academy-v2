# Security headers, and where we host

## Vercel (main site, since 2026-11-12)

The site is served by Vercel from its own domain's root (`vite.config.ts` sets `base` to `/` when
`VERCEL` is set). `vercel.json` sends real headers on every response, on top of the build's
`<meta>` CSP and referrer policy described below:

| Header | Value | Why |
|---|---|---|
| `Content-Security-Policy` | `frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'` | stops other sites framing ours; a meta tag cannot set `frame-ancestors`. Browsers enforce both policies, so this one only adds limits |
| `X-Frame-Options` | `DENY` | the same, for older browsers |
| `X-Content-Type-Options` | `nosniff` | no type guessing |
| `Referrer-Policy` | `no-referrer` | as the meta tag |
| `Permissions-Policy` | camera, microphone, location, payment, USB off | nothing on the site needs them |
| `Cross-Origin-Opener-Policy` | `same-origin` | a page we link to cannot reach back into ours |
| `Strict-Transport-Security` | two years | HTTPS only |
| `Cache-Control` on `/assets/*` | one year, immutable | file names carry a content hash |

Vercel Web Analytics and Speed Insights stay off (CLAUDE.md: no analytics). The class-code
settings (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, both public by design) are set as
Vercel environment variables; the Supabase service_role key is never set anywhere.

Its own domain also fixes a GitHub Pages problem: every project under one `github.io` name shares
one origin, and so one localStorage. The GitHub Pages copy still deploys from `main` for anyone
with the old link.

## Before: GitHub Pages


GitHub Pages does not let a site set its own HTTP headers. What it sends on its own (checked with
`curl -I` on 2026-11-12): `Strict-Transport-Security: max-age=31556952`, `Cache-Control:
max-age=600`, `Access-Control-Allow-Origin: *`. No `X-Frame-Options`, no
`X-Content-Type-Options`, no `Permissions-Policy`.

What we add, as `<meta>` tags written by `vite.config.ts` at build time (the dev server is left
alone because it needs inline scripts and a websocket):

- **Content-Security-Policy.** Scripts only from this site, plus the one inline script in
  `index.html` by its SHA-256 hash (computed from the built HTML, so it cannot go stale). Fonts,
  images, workers and fetches only from this site; `connect-src` adds the class-code server's
  origin when `VITE_SUPABASE_URL` is set at build time. `object-src 'none'`, `base-uri 'self'`,
  `form-action 'self'`. Styles allow `'unsafe-inline'`: code sets style attributes and CodeMirror
  falls back to `<style>` tags in browsers without constructable stylesheets; no untrusted HTML
  reaches the page (nicknames and class names are set as text, lesson Markdown is escaped).
- **Referrer-Policy: `no-referrer`.** A link out of the site (FTC docs, GitHub) tells the other
  site nothing about which page or lesson the kid came from.

Checked on the built site: every route, a lesson run (the Java worker), the editor, and making and
deleting a class work with no CSP violation; an injected inline script, a script from another
origin and a fetch to another origin are all refused.

What a `<meta>` tag cannot do, so is missing on GitHub Pages:

| Missing | What it would stop | How much it matters here |
|---|---|---|
| `frame-ancestors` / `X-Frame-Options` | another site framing ours and tricking a click | Low. The only actions that change anything (delete a class, remove a kid, leave a class) are behind a confirm dialog, and none moves money or reveals data |
| `Permissions-Policy` | the page or a script it loads using the camera, microphone, location | Low. We load no third-party script, and our own code asks for none of these |
| `X-Content-Type-Options: nosniff` | a browser guessing a file's type | Low. Every file is served with its real type and there are no user uploads |

## Hosting decision history

On 2026-11-12 the recommendation was to stay on GitHub Pages; the owner then chose Vercel, which
sends real headers and gives the site an origin of its own.
