# Handoff

Last updated 2026-11-08. Resume with: **"Read HANDOFF.md and continue."**

## State

`npm run check` is green: **1054 tests, lint, design lint, contrast (53 pairs, light and dark), build**.

Work is on branch **`design-polish`** (15 commits on top of `main`, not pushed).
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

1. **Wire the sprites into the field view.** `public/art/*.svg` are drawn and documented;
   `src/ui/components/field.ts` still draws the robot, tiles and elements procedurally in
   canvas with the same shapes. Swap to an image cache + `drawImage`, and use
   `badge-t0..t5.svg` on the star-chart stations and the home tier list.
2. ~~`docs/ADDING_A_LESSON.md`~~ Done.
3. ~~`README.md`~~ Done.
4. ~~Polish pass.~~ Done on `design-polish`; see **Design polish (2026-11-08)** below.
5. **Push and watch CI.** Neither workflow has ever run. `deploy.yml` needs Pages enabled
   with "GitHub Actions" as the source.

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
- Reset acts at once with Undo; Clear everything asks inline. `confirm()`, `alert()` and
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
- **Waypoints sit 25 viewBox units apart**, so a waypoint's own target is about 21 px at 1024.
  Stations and the "Every lesson" list are the full-size routes (WCAG 2.5.8's equivalent-control
  exception). A redraw with more room between waypoints would fix it properly.
- **The field is small in TeleOp lessons** (200 px tall at 1366) because the gamepad needs the
  room, and telemetry scrolls under it. Check this on real Chromebook hardware.
- **The main JS bundle is 568 KB.** It drives LCP (about 2.6 s on Fast 3G with a 4× slower CPU).
  Splitting CodeMirror and the interpreter out of the home route would fix it.
- The sprite and badge SVGs in `public/art` still use the old grey-green and amber palette
  (they are not wired in; item 1 above).
- Not yet tested: a real screen reader (only the accessibility tree was read), forced-colors
  mode, and a physical touch Chromebook.
- The home headline wraps with "A" alone at the end of the first line at 1366; a copy tweak.

## Open decisions for you

1. **The runtime is a TypeScript Java interpreter, not CheerpJ.** This is the big one, and
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
   but a kid writing their own code can omit one and only find out in Android Studio.
3. **The tank robot is not mirror-mounted; the mecanum robot is.** Deliberate: Tiers 0–2
   keep drivetrain wiring as locked boilerplate, so a reversal a nine-year-old is told to
   ignore would buy nothing. Documented in `docs/ARCHITECTURE.md`.
4. **Lesson 04 of Tier 0 and the Tier 2 checkpoint quote sim-specific numbers** (785 ms for
   a 90° tank turn, 17.8 ticks per cm). They are correct for this simulator and are
   explained as such in the Builder panels, but they are not your robot's numbers.
