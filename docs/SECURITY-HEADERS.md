# Security headers, and where we host

## What the site sends now (GitHub Pages)

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

## GitHub Pages or Cloudflare Pages?

| | GitHub Pages (now) | Cloudflare Pages |
|---|---|---|
| Real headers (`_headers` file) | no; meta CSP and referrer only | yes: all of the above, including `frame-ancestors` and `Permissions-Policy` |
| Cost | free | free tier covers this site |
| Who sees each visitor's IP | GitHub | Cloudflare (instead of GitHub) |
| New accounts | none | a Cloudflare account; its analytics must stay off |
| Work to move | none | new project, change the deploy workflow, move the URL (and tell mentors) |

**Recommendation: stay on GitHub Pages for now.** The meta CSP and referrer policy cover the risks
that matter for a static site with no third-party code. What Cloudflare adds is real but small
here, and moving swaps one company that sees visitor IPs for another, adds an account, and
changes the address mentors already have. Revisit if the site adds anything a framed click could
abuse, or loads anything from another origin. Nothing has been moved.
