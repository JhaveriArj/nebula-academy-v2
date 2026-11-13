# Nebula Academy

Learn FTC robot programming in Java. Real Java runs in the browser against a mocked FTC SDK and
a 2D virtual robot, so a kid writes code, presses Run, and watches the robot drive. Six tiers,
42 lessons, ages 9 to 18, in two modes: **Explorer** (9 to 12) and **Builder** (13 to 18).

No accounts, no backend, no analytics. Progress lives in the browser's localStorage and can be
saved to a file and loaded on another computer.

## Run it

Needs Node 20.11 or newer.

```sh
npm install
npm run dev        # open the URL it prints
```

## Before every commit

```sh
npm run check      # lint, design lint, contrast, all tests, build
```

The tests run every lesson's `solution.java` against its own `tests.json`, so a lesson that does
not work cannot be committed. `npm run verify:javac` also compiles every starter and solution
with real `javac` (it needs a JDK, for example `brew install openjdk@17`); CI runs it too.

## Add a lesson

```sh
npm run new-lesson <tier> <slug>     # e.g. npm run new-lesson 1 counting-down
```

Then follow [docs/ADDING_A_LESSON.md](docs/ADDING_A_LESSON.md). Lessons are Markdown, Java and
JSON in `content/` only; no TypeScript.

## Deploy

The main site is on **Vercel** (`vercel.json`: build, security headers, caching). Deploy with
`vercel --prod` from a linked checkout, or connect the GitHub repo in Vercel so `main` deploys
itself. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the Vercel project for class
codes; leave Vercel Analytics off. See docs/SECURITY-HEADERS.md.

Pushing to `main` also runs two GitHub Actions workflows:

- **CI** (`.github/workflows/ci.yml`): `npm run check` and the real-javac gate.
- **Deploy to Pages** (`.github/workflows/deploy.yml`): builds and publishes `dist/` to GitHub
  Pages at `https://<user>.github.io/<repo>/`.

One-time setup: in the repository's **Settings → Pages**, set **Source** to **GitHub Actions**.
The site is built for `/<repo-name>/`. For a custom domain or a user site at the root, build
with `NEBULA_BASE=/`.

## Where things are

| Path | What |
|---|---|
| `content/` | Lessons, the pathway, the glossary and the mentor guides. Markdown, Java and JSON only. |
| `src/runtime/` | The Java lexer, parser, checker and interpreter, the test runner and the kid-friendly error translator. |
| `src/ftc-mock/` | The mocked FTC SDK, with real package names and signatures. |
| `src/sim/` | The 2D field and robot simulation. |
| `src/ui/` | The app. `theme.css` is the only file allowed to hold a color. |
| `docs/` | [Design](docs/DESIGN.md), [architecture](docs/ARCHITECTURE.md), [pathway](docs/PATHWAY.md), [FTC mock coverage](docs/FTC_MOCK_COVERAGE.md), [adding a lesson](docs/ADDING_A_LESSON.md). |
| `CLAUDE.md` | The project's hard rules and the voice for lesson text. |
| `HANDOFF.md` | Where the work stands and what is next. |
