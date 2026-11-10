# Nebula Academy — Architecture

## The one decision that shapes everything: how Java runs

The brief says to run real Java in the browser via CheerpJ, to check its current release and
in-browser compilation approach first, to decide once, and to write down what I found. Here is
what I found and what I decided.

### What CheerpJ can actually do (checked November 2026)

- **CheerpJ 5.0** is current. It is a full JVM compiled to WebAssembly, built from OpenJDK, and
  it now **ships the complete JDK rather than just the JRE for every supported version** — so
  `javac` and `jshell` run client-side. Java 8, 11, 17, 21 and 25 are supported, with a new
  WasmGC engine behind `{ wasmGC: true }` (Chrome/Edge 137+, Firefox 153+, Safari 27+).
- **In-browser compilation works like this.** CheerpJ's virtual filesystem has three mounts:
  `/app/` (your web server, read-only), `/files/` (IndexedDB, read-write from Java), and `/str/`
  (written from JavaScript, read-only from Java). You write the kid's source into `/str/`, invoke
  `javac` to compile into `/files/`, then run the resulting main class. Because `javac` is itself
  written in Java, the entire compiler runs in the tab.
- **Interop** is through "library mode" (`cheerpjRunLibrary()`), which exposes Java methods,
  objects and arrays to JavaScript across `async`/`await`, plus JNI native methods implemented in
  JavaScript (added in 4.0).
- **Licensing** is fine for us: the free Community licence explicitly covers personal,
  educational and hobby use and non-commercial open-source projects, loading from the CheerpJ CDN.
- **A real precedent exists.** `aadilanwar95/client-side-java-ide` is a 2025 MSc project doing
  precisely this — CodeMirror 6, `javac` under CheerpJ, compile errors mapped back to editor
  lines. Its documented limitations are the useful part, below.

So: live in-browser compilation of real Java **is** technically workable. I am still not using it
as the lesson runtime, for four reasons that are specific to *this* project rather than to
CheerpJ.

### Why not, for this project

**1. It cannot run our test suite, and the test suite is the quality gate.**
CLAUDE.md requires that `npm run check` be green before every commit, and the brief requires
`tests/solutions.test.ts` to run **every one of the 42 `solution.java` files against its own
`tests.json` in the sim**. CheerpJ is browser-only. Putting it on the test path means booting
headless Chrome, loading a WASM JVM, warming `javac`, and compiling and running 84 Java files
through a bridged simulator on every commit — minutes per run, and flaky in CI. With an engine
that runs in Node, that suite is seconds and deterministic. A gate that is slow and flaky is a
gate that gets skipped, and then a broken lesson ships to a kid.

**2. An infinite loop must not cost a kid their work.**
Tier 1 teaches `while` to nine-year-olds, so runaway loops are not an edge case, they are
Tuesday. The precedent project lists exactly this: *"a running program can't be stopped, so an
infinite loop means reloading the page."* A reload loses the kid's code. Running CheerpJ inside a
Web Worker does let us `terminate()` it, but then the next Run pays full JVM boot and `javac`
warm-up again — many seconds, after the kid already made a mistake. The brief itself asks for a
10 s timeout; we should be able to enforce it in milliseconds and keep the editor contents.

**3. First-run weight on a school Chromebook on school wifi.**
The full JDK is fetched lazily in chunks from a third-party CDN, and the precedent notes the
first load "takes a few seconds while cheerpj loads java and warms up javac." Our baseline device
is a 1366×768 school Chromebook, frequently on a filtered network where an unrecognised CDN is
simply blocked. The first Run in the first lesson is the moment the whole project is won or lost;
it should be instant and it should work offline.

**4. The sim is TypeScript, and the bridge would be the hardest code in the project.**
Our mocked FTC SDK has to drive a 2D sim bidirectionally at a fixed timestep: motor powers out,
encoders, IMU, distance, color and gamepad in, every tick. Under CheerpJ that is an async JNI
bridge across a Worker boundary at 50 Hz, and `async` interop plus a fixed-timestep deterministic
sim is a genuinely unpleasant combination to make reproducible. Native classes inside our own
interpreter call the sim synchronously, in-process, and determinism is free.

### What I am building instead

**A Java interpreter in TypeScript** at `src/runtime/java/`, covering the language subset these
42 lessons use, with the mocked FTC SDK implemented as native TypeScript classes registered under
their **real** fully-qualified names and real signatures.

```
kid's source ──▶ lexer ──▶ parser ──▶ resolver ──▶ tree-walking interpreter
                   │          │           │                   │
              javac-shaped diagnostics            native classes:
              (code, line, col, message)          com.qualcomm.robotcore.hardware.DcMotor
                   │                              …Servo, …CRServo, Gamepad, Telemetry,
                   ▼                              ElapsedTime, IMU, DistanceSensor,
            errorTranslator.ts                    ColorSensor, OpMode, LinearOpMode
                   │                                        │
              kid-friendly message              ───▶  src/sim/  (fixed timestep, 50 Hz)
              + line number + likely fix                      │
                                                     robot state exposed to testRunner.ts
```

The same engine runs in both places, which is the point:

- **In the browser:** inside a Web Worker, with a 10 s wall-clock timeout *and* a step budget, so
  an infinite loop is caught in milliseconds, reported as "your loop never finishes — the robot
  is still waiting at line 12", and the editor contents are untouched. No download, no CDN, works
  offline after first visit.
- **In Vitest:** in-process. All 42 solutions run against their `tests.json` in about a second,
  so the gate is real and nobody is tempted to skip it.

Because tests and browser share one engine, "`solution.java` passes its own `tests.json`" means
the same thing the kid will experience, which is not true of any split-runtime design.

### How we keep the "real Java" guarantee honest

An interpreter for a subset could drift into accepting things that are not Java. Two mechanisms
stop that.

**A real `javac` gate.** `.github/workflows/ci.yml` installs a JDK and compiles **every**
`starter.java` and `solution.java` against real `.java` stub sources of the FTC mock
(`ftc-stubs/`, generated from the same signature table the interpreter registers). If a lesson
file is not genuinely valid Java that would compile in Android Studio, CI fails. This is the
guarantee that kid code pastes into a real `FtcRobotController` project unchanged.
Locally it is `npm run verify:javac`, which finds a Homebrew keg-only JDK without needing
it on `PATH`, and skips itself with a notice when no JDK is installed at all — the Vitest
path never depends on one.

Two things worth knowing about the gate. Java requires a public class to live in a file
named after it, and lesson files are called `starter.java` and `solution.java`, so each is
copied to `<ClassName>.java` before compiling. And the interpreter resolves SDK types by
simple name, so it does **not** require imports: a lesson missing one runs perfectly here
and fails in Android Studio. The gate caught exactly that on its first real run (a missing
`import com.qualcomm.robotcore.util.ElapsedTime`), and `tests/content.test.ts` now checks
imports directly so the same mistake is caught on a machine with no JDK.

**Builder asks for imports; Explorer does not** (decided 2026-11-08). Rather than make the
interpreter demand imports, `src/runtime/java/imports.ts` checks the source before Run and
Check in Builder mode, the same check that guards every lesson file. A missing import stops
the run with a kid-readable error naming the exact line to add, with javac's own "cannot find
symbol" text behind "Show the real error". Builder kids (13 to 18) are about to use Android
Studio, so their code should compile there unchanged; Explorer kids are not asked to manage
imports. A test proves no lesson's starting code trips the check.

**One signature table, three consumers.** `src/ftc-mock/signatures.ts` is the single source of
truth. The interpreter registers from it, `ftc-stubs/` is generated from it, and
`docs/FTC_MOCK_COVERAGE.md` is generated from it. A lesson may not call anything absent from it,
and `tests/content.test.ts` enforces that. Inventing a method that the real SDK does not have
therefore takes three deliberate edits and still fails review.

### What this costs, stated plainly

The browser runs a **subset** of Java, not all of it. Supported: classes, fields, methods,
constructors, `static`, interfaces (as the SDK needs them), `enum`, annotations, the primitives
plus `String`, arrays, operators, `if`/`else`, `while`, `for`, enhanced `for`, `switch`, `break`,
`continue`, `return`, `new`, casts, `Math`, `String.format`, `System.out.print*`, and the mocked
SDK. Not supported: generics beyond the `Class<T>` token that `hardwareMap.get` needs, lambdas,
inner and anonymous classes, threads, reflection, collections beyond arrays, file and network I/O,
and most of `java.util`.

Unsupported features fail with a deliberate, kind, specific message — *"Nebula's Java doesn't know
lambdas yet. For this lesson, a plain method will do what you want."* — never a parser crash and
never a silent wrong answer. Every one of those messages has a case in `errorTranslator.ts`.

**This is the single decision I most want reviewed.** It trades "literally the OpenJDK" for a
quality gate that actually runs, a `while` loop that cannot eat a kid's work, and an instant first
Run on a filtered school network. If the preference is the OpenJDK regardless, the swap point is
narrow by design: `src/runtime/JavaRuntime.ts` is an interface with one implementation today
(`InterpreterRuntime`), and a `CheerpJRuntime` can be added beside it — the sim, the test runner,
the lessons and the editor are all written against the interface, not the engine. The honest cost
of that swap is the test suite, which would then need a headless browser.

---

## Everything else

### Stack

| Choice | Why |
|---|---|
| Vite + TypeScript, **no UI framework** | Plain DOM and small component functions. Nothing here needs a virtual DOM, and a Chromebook appreciates the absence. |
| Hash router | GitHub Pages serves no rewrites, so `#/lesson/t1-05` is the only thing that reliably deep-links. |
| CodeMirror 6, Java mode | Read-only ranges outside `// TODO` blocks in Explorer mode, large-font and high-contrast options. |
| Vitest | Runs the interpreter in-process; that is the whole reason the gate is fast. |
| GitHub Actions | `ci.yml` (lint, test, build, javac gate, contrast check on PR) and `deploy.yml` (build and deploy to Pages on push to main). |

### Directory map

```
content/            Markdown + Java + JSON only. Never imports from src/.
  tiers/<n>-<name>/<nn>-<slug>/   lesson.md starter.java solution.java
                                  tests.json watch.json hints.json
  glossary.md       every bolded term in every Learn section
  mentor/           tier-0.md … tier-5.md
  pathway.json      tier order, lesson order, unlocks
src/
  runtime/java/     lexer, parser, resolver, interpreter, diagnostics
  runtime/          JavaRuntime.ts (interface), testRunner.ts, errorTranslator.ts, worker.ts
  ftc-mock/         signatures.ts (source of truth) + native class implementations
  sim/              field, physics at fixed 50 Hz, robot models (tank, mecanum), sensors
  ui/               router, components, pages, theme
  progress/         localStorage + export/import
  classes/          optional mentor class codes over Supabase REST (docs/CLASSES.md)
ftc-stubs/          generated real .java stubs, for the CI javac gate only
public/art/         all SVG art + README
docs/               PATHWAY, DESIGN, ARCHITECTURE, FTC_MOCK_COVERAGE, ADDING_A_LESSON
scripts/            new-lesson, gen-stubs, gen-coverage, check-contrast
```

**The content/src wall.** `content/` holds Markdown, Java and JSON and nothing else, per
CLAUDE.md. A lint rule fails the build if anything under `content/` is a `.ts` file or if
anything in `src/` hardcodes a lesson id.

### Drivetrain fidelity: the mirrored right side

On a real mecanum robot the right-hand motors are bolted on mirrored, so four positive
powers make it spin rather than drive. Teams fix that with two lines in `init()`:

```java
frontRight.setDirection(DcMotor.Direction.REVERSE);
backRight.setDirection(DcMotor.Direction.REVERSE);
```

The sim models this: `frontRight` and `backRight` carry a `mountInverted` flag, and
without reversing them the robot spins exactly as it would on the field. That is what
makes Tier 3 lesson 05 a real lesson rather than a description of something the simulator
pretends not to need, and it keeps Tier 3+ code paste-compatible with Android Studio.

The tank robot used by Tiers 0-2 is deliberately **not** mirrored. Its drivetrain setup is
locked boilerplate in those tiers and is not the subject of any lesson there, so adding a
reversal a nine-year-old is told to ignore would cost confusion and buy nothing. The
inconsistency is a deliberate teaching simplification, confined to the training robot, and
it ends the moment the lessons start talking about hardware.

### Determinism

The sim steps at a fixed **20 ms (50 Hz)** and never reads wall-clock time. `ElapsedTime` and
`sleep()` are backed by the sim clock, not `Date.now()`. Gamepad input during tests comes from a
scripted input track in `tests.json`. The same source therefore produces bit-identical robot
state on a Chromebook and in CI, which is what lets `robotWithinCmOf` have a 2 cm tolerance
instead of a 20 cm one.

### Dependency budget

CLAUDE.md requires a note here for anything over 100 KB. Current list:

| Package | Size | Note |
|---|---|---|
| `codemirror` 6 + `@codemirror/lang-java` | ~380 KB min | Over budget, and justified: a real editor with read-only ranges, accessible keyboard handling and a Java grammar is the core of the product, and writing one is not a reasonable alternative. Loaded lazily — the Level Map and Home never pull it. |
| `motion` (only `scroll` is imported) | 8.8 KB min, 3.9 KB gzip | Under budget. Supplies scroll progress for the home page's scrubbed scenes (`src/ui/homeMotion.ts`) and uses the browser's ScrollTimeline where it can. Its `animate()` is not imported (it would add about 25 KB gzip); one-shot animations use the Web Animations API instead. |

Everything else (`vite`, `typescript`, `vitest`, `eslint`) is dev-only and ships nothing. The
runtime bundle is first-party apart from Motion's `scroll`: interpreter, sim and UI. No framework, no CheerpJ CDN, no polyfills.

## Mentor class codes (optional backend)

The one network feature. Classes, nicknames and passes live in a Supabase Postgres project
(`supabase/migrations/0001_classes.sql`); the browser reaches it with plain `fetch` to the
REST endpoint for database functions, so there is no Supabase SDK and no new dependency. The
tables are closed to the public key and every function checks a mentor key or a kid token.
Unset `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` and the feature does not render. Passes
are queued locally and sent after a lesson passes, after a progress import, and once the
browser is idle on start-up. Details, data list and setup: docs/CLASSES.md.
