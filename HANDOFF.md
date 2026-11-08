# Handoff

Last updated 2026-11-08. Resume with: **"Read HANDOFF.md and continue."**

## State

`npm run check` is green: **1045 tests, lint, contrast, build**.
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
2. **`docs/ADDING_A_LESSON.md`**, written for a mentor who does not know TypeScript.
   `npm run new-lesson <tier> <slug>` already scaffolds all six files and registers the
   lesson in `pathway.json`; the doc should walk through that and through reading a
   failing check.
3. **`README.md`**: setup, `npm run check`, deploy to Pages, how to add a lesson.
4. **Polish pass.** Walk every page at 1366×768 and 1024×768 touch-only, check focus order
   and contrast in situ, confirm reduced motion, run Lighthouse for the ≥95 accessibility
   target. The gamepad and the Watch step have had the least real-browser use.
5. **Push and watch CI.** Neither workflow has ever run. `deploy.yml` needs Pages enabled
   with "GitHub Actions" as the source.

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
