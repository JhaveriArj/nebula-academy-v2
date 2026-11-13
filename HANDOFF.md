# Handoff

Last updated 2026-11-08. Resume with: **"Read HANDOFF.md and continue."**

## State

`npm run check` is green: **1054 tests, lint, design lint, contrast (53 pairs, light and dark), build**.

Everything is on `main`, pushed, and deployed.
`npm run verify:javac` is green: **all 84 lesson files compile with real javac**.

A JDK is now installed (`brew install openjdk@17`). `scripts/verify-javac.mjs` finds a
Homebrew keg-only JDK without it being on `PATH`, so the gate just runs.

## Done

- **Docs.** `docs/PATHWAY.md`, `docs/DESIGN.md` (with the review pass that changed five
  things), `docs/ARCHITECTURE.md` (CheerpJ findings and the runtime decision),
  `docs/FTC_MOCK_COVERAGE.md` (generated).
- **Engine.** Java lexer, parser, compile-time checker and tree-walking interpreter in
  TypeScript, with javac-shaped diagnostics. Runs in a Web Worker in the browser and
  in-process under Vitest, which is what makes the 42-solution gate take a second.
- **Mocked FTC SDK.** Real package names and signatures, declaration and implementation in
  one object, with `ftc-stubs/` and the coverage doc generated from it.
- **Sim.** Deterministic 20 ms fixed timestep, tank and mecanum, encoders, IMU, distance
  and colour sensors, pushable elements. The mecanum robot's right-hand motors are
  mirror-mounted, as on a real robot, so Tier 3 lesson 05 is a real lesson.
- **All 42 lessons**, six tiers, every solution passing its own tests.json, every starter
  compiling and leaving work to do. Glossary and six mentor guides.
- **App.** Hash router, home with a live hero, the star-chart Level Map, the lesson page
  (six steps, CodeMirror with Explorer locks, console, telemetry, touch gamepad, hints),
  mentor, about, progress export/import.
- **Verified in a real browser**: edited a number, pressed Check, watched it fail with
  "It travelled 50.0 cm", fixed it, watched it pass and the waypoint light on the chart.

## Next, in order

1. ~~Wire the sprites into the field view.~~ Done: the art is recolored to the mascot palette;
   the field draws the robots, tiles and elements from it; the tier badges are on the home
   tier list and the chart stations.
2. ~~`docs/ADDING_A_LESSON.md`~~ Done.
3. ~~`README.md`~~ Done.
4. ~~Polish pass.~~ Done on `design-polish`; see **Design polish (2026-11-08)** below.
5. ~~Push and watch CI.~~ Done. Repo: https://github.com/JhaveriArj/nebula-academy-v2 (public).
   **Live site: https://jhaveriarj.github.io/nebula-academy-v2/**. Every push to `main` runs CI
   (check + real javac) and redeploys. The first CI run caught a missing `@types/node`
   dev dependency, now declared.

## Design polish (2026-11-08)

First a mascot redesign (palette sampled from `logo.png`, Fredoka, rounded, dark mode; see
`docs/DESIGN.md`), then a review in three passes (design-review, the Apple HIG lens, the
better-interface skills) and a fix per finding. Verified in a real browser at 1366×768 and
1024×768, light and dark, and with reduced motion on; 200% zoom (683×384) checked separately.

**Fixed, in commit order**
- **The Watch demo never played** on any lesson: a negative first frame index threw. One
  `frameIndex()` helper now serves Watch and the home hero, with a test.
- **The lesson page is held to the screen.** Before, Run, the results and the console sat below
  the fold at 1366×768, and at 1024 the gamepad started 1283 px down and was clipped. At 1024 the
  side column now narrows (320 px, 352 with a gamepad) and stays beside the code; the gamepad is
  two rows; the side column runs field, gamepad, telemetry.
- The narrow step rail kept no accessible names (`display: none` labels); it now shows each
  label under its mark at 14 px.
- **Star chart** at full width (it rendered about 800 px wide), SVG text that renders at 14 px or
  more at 1024, badges that fit their names, and each open station is a big link to its tier's
  next lesson.
- A 14 px floor everywhere (gamepad labels were 11 px), now a lint rule.
- Focus moves to the new step's heading after a next-step button; switching Explorer/Builder no
  longer throws the kid back to Mission.
- One filled button per moment in the run bar; a disabled Stop no longer looks heavier than Run.
- Hints have their own "Show hint 2 of 3" button; Stuck reports `aria-expanded`.
- A run plays back at the robot's own clock speed (`frameDue` in `src/ui/frames.ts`), so
  `sleep(2000)` takes two real seconds on the field. Stop cancels the playback.
- Reset robot puts the robot back at the start and keeps the code. Reset code acts at once
  with Undo; Clear everything asks inline. `confirm()`, `alert()` and
  `prompt()` are now a lint error in `src/ui/`.
- One `<h1>` on the mentor page; a kid-readable not-found page with the real error behind a
  toggle; the sticky header lets go below 561 px of height (it covered a third of a 200% screen).
- **First visit asks the kid's age** ("I am 9 to 12" / "I am 13 to 18") instead of starting
  everyone in Builder. The progress file gains `modeChosen`; older files with a pass count as
  chosen.
- Explorer marks the lines a kid may change (yellow gutter bar and tint), and typing on a locked
  line says why nothing happened.
- Home tier rows are links; polish on icons, plurals, telemetry units, the empty results strip,
  inline code on tinted panels, the hero edge in dark mode, rem type tokens, and the star-chart
  ARIA that Lighthouse flagged.

**Load time.** The lesson page (CodeMirror and the Java runtime) is now loaded on first use and
prefetched when the browser is idle. The first-load script went from 568 KB to 80 KB (22 KB
gzipped), and home-page LCP on Fast 3G with a 4× slower CPU went from 2.6 s to 1.5 s.

**Lighthouse** (production build via `vite preview`, desktop, 2026-11-08)

| Page | Accessibility | Best practices | SEO |
|---|---|---|---|
| Home | 100 | 100 | 100 |
| Star chart | 100 (was 96 before the last commit) | 100 | 100 |
| Lesson (`t3-gamepad-sticks`) | 100 | 100 | 100 |

A scripted sweep of home, chart, two lessons, mentor, about and progress at both sizes, both
themes and reduced motion found no horizontal overflow, no text under 14 px, no tap target under
44 px, no unnamed control and one `<h1>` per page.

**Skill advice rejected because of DESIGN.md:** SF Pro, iOS system colors, Apple tokens, an 8 pt
grid, blur and translucent materials; "replace borders with shadows"; a 0.96 press scale in
place of the existing 1 px press.

**Left in the polish column**
- **The field is small in TeleOp lessons** (200 px tall at 1366) because the gamepad needs the
  room, and telemetry scrolls under it. Check this on real Chromebook hardware.

- Not yet tested: a real screen reader (only the accessibility tree was read), forced-colors
  mode, and a physical touch Chromebook.

## Second design pass (2026-11-08)

- **Display panel**: one header button opens a native popover with a Larger text switch and
  Auto / Light / Dark. Replaces the lone "An" button.
- **Art in use**: robots (violet like the mascot), foam tiles and game elements on the field;
  tier patches on the home list and chart stations.
- **Star chart redrawn** as a switchback trail, one tier per row; every waypoint has a 49 px
  target at 1024 and none overlap.
- Craft: clearer panel-title hierarchy on home, the lesson column's first heading flush with the
  top, an icon on every nav link.
- `tests/layout-rules.test.ts` guards three layout rules after one of them was deleted by a big
  stylesheet edit during this pass (caught before it shipped).
- Lighthouse after this pass: accessibility, best practices and SEO all 100 on home, chart and
  a lesson page.

## Landing page overhaul (2026-11-08)

From a design audit: depth instead of flat navy (nebula glows from the mascot's colors, two
star layers, a fading grid, raised cards); the mascot large in front of a glowing live screen
(robot and route glow, elements pulse, a border beam); a glowing yellow start button with a
travelling shine and a breathing nebula behind it; electric indigo as the second accent;
feature cards with icons, tighter copy and hover lift; tier rows with a color per tier and
metadata chips; a clear header hierarchy; scroll reveals on CSS scroll timelines. Ported from
Magic UI (Border Beam, Shimmer Button, Magic Card, Blur Fade) and 21st.dev (Nebula CTA Glow) to
plain CSS and TypeScript, since the app is not React. Reduced motion is now handled per rule;
the global 0.001 ms override is gone. Lighthouse 100/100/100 (desktop and mobile); home LCP
1.6 s on Fast 3G with a 4× slower CPU, after preloading the hero mascot.

## Notebook pass (2026-11-09)

"Break the template": the landing page is now an FTC team's engineering notebook at night (see
docs/DESIGN.md, *Motion, icons, and the hero*). Asymmetric hero with the simulator framed as an
instrument (ruler ticks, mono grid references, scanline, vignette) running off the right edge,
the mascot leaning on it with a cast shadow; three alternating rows with real artifacts (lesson 1
code with the number inked, `sleep(1000)` vs `sleep(2000)` drawn to scale, the Tier 0 rubric on
paper); the six tiers on a ruled notebook page. One animation: the robot drives once and the
route draws in yellow ink. Lexend added (Google Fonts, home page and header). The nebula, glows,
tier colors, Magic UI ports and scroll reveals from the overhaul above are gone.
`field.ts` gained an `instrument` option and lost `glow`. Checks: lint, 71 contrast pairs, 1065
tests, build; Lighthouse 100 on a11y, best practices and SEO; local LCP 106 ms, CLS 0; no
horizontal scroll at 1440, 1366, 1024 and 390. `public/art/mascot-264.png` is no longer used
anywhere and can be deleted.

## Live demo hero (2026-11-09)

The notebook page read as empty, so the hero now shows the product working: a copy of the
lesson screen runs eight lines of Java (a square: one side and one corner, four times), with the
running lines highlighted, a live readout, and three Tier 0 checkpoint checks that pass when the
robot stops. It loops slowly, pauses off screen, has a Pause button, and starts finished under
reduced motion. `tests/hero-demo.test.ts` runs the same Java in the real interpreter so the demo
cannot drift. New "How a lesson works" band (read, change, run) built from lesson 1's own text,
code and checks; the old three editorial rows are gone and the mentor row moved below the
tiers. Proof row under the buttons; content column widened to 1520px. Lighthouse 100/100/100
desktop and mobile, local LCP 101 ms, CLS 0. The "six tiers" section is unchanged, waiting on the
rest of the brief (it was cut off in the message).

## Mascot as the operator (2026-11-09)

The supplied mascot was a 379x658 raster with a white matte fringe. It is now upscaled 4x with
Real-ESRGAN locally (art-source/mascot-4x.png), the fringe recoloured to its linework navy, and
the antenna yellow set to exactly --star. Its colours are --mascot-* tokens. In the hero it
stands beside the demo window at the window's height, on its baseline, and nods when the checks
pass; the header uses a new vector head on the wordmark baseline with a Fredoka wordmark. The
code panel now shows all of Square.java (loop at full strength, the rest dimmed) and the status
is a mono label with a dot. A short-screen layout keeps the whole stage above the fold at
1366x768. Unused: mascot-112.png, mascot-264.png, mascot-560.webp (kept until the owner says
to delete them).

## Motion pass (2026-11-09)

Researched first (Motion, GSAP and native scroll timelines; Magic UI), then built with Motion's
`scroll()` only (3.9 KB gzip) plus the Web Animations API. The full list of animations, their
triggers and their fallbacks is in docs/DESIGN.md under Motion. The signature is the hero's field
travelling into step 03 and becoming lesson 1's run as you scroll. New section: "The same file
runs on your team's robot". Cut on purpose: number tickers, word-by-word blur headings, hero
parallax, the mascot's idle breathe (decorative, or a loop with no meaning). Fonts now have
metric-matched fallbacks, which took Lighthouse CLS from 0.052 to 0.0003. Tests check that the
step 03 run matches lesson 1's solution and each tier's typed line exists in that tier.

## Audit fixes (2026-11-09)

From a 22-item live walkthrough, audited with addyosmani/web-quality-skills (installed in
~/.claude/skills). Landing: pins halved (720px and 630px of scroll), the file merge now slides
both panels and swaps the header in two beats, the tier rows reveal together within 600ms, one
paper shadow, a footer (brand, links, "Built by an FTC team", FIRST trademark note), no wrapped
hero code at 1400px and up. Lesson: checks scroll with Next lesson and Chart pinned below them,
the side column grows with the window so the field fills it, the demo caption reads "Demo:
Stop" instead of looking like a button, the empty console folds to 32px, Mission is centred,
and at 900px and below the lesson stacks (field, then editor; telemetry folds behind Show).
Mentor: a print stylesheet and Print this guide button, previous and next tier links, rubric
row headers. Chart: no margin ticks or "N 0 — 12 ft"; below 1040px it scrolls sideways so its
targets stay 49px. Progress: "Last saved 3 minutes ago". About: the mascot and Start lesson 1.
Global: mode tooltips on hover and focus, a favicon from the mascot head, the hero's title.
Found on the way: a wide table could widen a phone's page (prose pages now have a definite
width), the hero preload ran on every route (now home only), and Atkinson's swap rewrapped
mentor guides (it now loads with font-display: optional over a metric-matched fallback).
Lighthouse 100 in every category with no failed audits on home, a lesson and a mentor guide,
desktop and mobile.

## Decisions

Decided 2026-11-08: **keep the TypeScript interpreter** (decision 1), and **Builder asks for
imports, Explorer does not** (decision 2, now built; see `docs/ARCHITECTURE.md`). The site
targets Macs and home computers, not Chromebooks.

1. **The runtime is a TypeScript Java interpreter, not CheerpJ.** Kept. This is the big one, and
   it is written up in full at the top of `docs/ARCHITECTURE.md`. CheerpJ 5.0 can genuinely
   compile and run Java in the browser; I did not use it because it cannot run the
   42-solution test suite in Node, a kid's infinite `while` loop would cost them their
   work, and the first Run would pull a large runtime from a third-party CDN on a filtered
   school network. The cost is that the browser runs a documented subset of Java. The swap
   point is deliberately narrow: `src/runtime/client.ts` and `engine.ts` are the only
   places that know how code runs.
2. **The browser does not require imports; real javac does.** The interpreter resolves SDK
   types by simple name. Lesson files are protected by the javac gate and by an import
   check in `tests/content.test.ts` — this already caught a missing `ElapsedTime` import —
   but a kid writing their own code could omit one and only find out in Android Studio.
   **Now:** Builder mode checks imports before Run and Check; Explorer stays lenient.
3. **The tank robot is not mirror-mounted; the mecanum robot is.** Deliberate: Tiers 0–2
   keep drivetrain wiring as locked boilerplate, so a reversal a nine-year-old is told to
   ignore would buy nothing. Documented in `docs/ARCHITECTURE.md`.
4. **Lesson 04 of Tier 0 and the Tier 2 checkpoint quote sim-specific numbers** (785 ms for
   a 90° tank turn, 17.8 ticks per cm). They are correct for this simulator and are
   explained as such in the Builder panels, but they are not your robot's numbers.
