# Nebula Academy — Design plan

Written before any CSS, as the brief requires. Reviewed against the brief once and changed; the
review and what it changed are in [After the review](#after-the-review).

**The brief in one line.** A space-mission academy for kids, run by a real FTC team, that feels
like a real control room game — not a SaaS landing page, not a template.

---

## The idea the whole design hangs on

Mission control is **painted metal in a bright room, watching a dark screen.**

The chrome of this site — bars, rails, panels, buttons — is pale instrument-panel paint under
fluorescent light. The two surfaces where work actually happens — the **star chart** and the
**code console** — are dark, because those are screens. Amber only glows on the dark surfaces,
because amber means *powered*. The painted chrome never lights up; paint does not glow.

That single rule decides the palette, where the accent may appear, and why the Level Map looks
different from everything else. It is a physical logic, not a style preference, which is what
keeps it from drifting into a generic dark theme with an accent color.

---

## Palette

Six named colors, three derived. All pairs used for text are measured, not estimated
(`npm run check:contrast` re-measures them).

| Token | Hex | Role |
|---|---|---|
| `--ink` | `#141C27` | All body text on light. The ground of the star chart and the console. |
| `--hull` | `#DCE0D8` | Page and panel paint. Cool grey-green, the color of real instrument bezels. |
| `--seam` | `#B6BDB2` | Every border and panel division. One hairline, never a shadow. |
| `--chart` | `#0E1620` | The dark working surfaces only: Level Map ground, editor, field view. |
| `--lamp` | `#F0A93B` | Amber indicator. Live state, current waypoint, the route already flown. **Dark surfaces only.** |
| `--go` | `#115E55` | A test passed. A checkpoint cleared. Deep teal, not a bright green. |

Derived: `--ink-mid #46505C` (secondary text), `--hull-soft #EDEFEA` (inset fields and raised
panels), `--alert #A82A15` (the robot got confused — errors only).

**Measured contrast** (WCAG 2.1, computed):

```
ink      on hull       12.81:1  AAA      go    on hull        5.70:1  AA
ink      on hull-soft  14.80:1  AAA      alert on hull        5.22:1  AA
ink-mid  on hull        6.13:1  AA       lamp  on chart       9.05:1  AAA
hull     on chart      13.60:1  AAA      seam  on chart       9.45:1  AAA
lamp     on hull        1.50:1  FAIL  ← enforced as a rule, see below
```

**The amber rule.** `--lamp` on `--hull` measures 1.50:1 and can never carry text or an icon on
light paint. Rather than patch this with a darker amber, the failure becomes the rule that gives
the design its logic: **amber appears only on dark surfaces.** A lesson card on the light chrome
shows "done" in `--go` and a filled square; the same lesson on the dark star chart shows it as a
lit amber waypoint. One state, two surfaces, two correct treatments.

Nothing is colored to decorate. A color on screen means a state the robot or the kid is actually
in.

---

## Type

Two families from Google Fonts, plus the system monospace. Three roles.

**Archivo** — headings, tier names, buttons, telemetry keys, numbers.
`font-family: 'Archivo', 'Helvetica Neue', Arial, sans-serif`
An industrial grotesque drawn for signage. At 600–800 with the width axis pulled in slightly it
reads like a stencilled panel label without being a novelty face. Variable, one file.

**Atkinson Hyperlegible Next** — all lesson prose, hints, glossary, mentor docs.
`font-family: 'Atkinson Hyperlegible Next', 'Atkinson Hyperlegible', Verdana, sans-serif`
Drawn by the Braille Institute to maximize character disambiguation for low vision. It is the
single best face available for a nine-year-old reading `1 l I` and `0 O` inside sentences about
Java identifiers. Choosing it is an accessibility decision that happens to also look specific.

**System monospace** — code only. No third webfont.
`font-family: ui-monospace, 'SF Mono', 'Cascadia Mono', Menlo, Consolas, monospace`
Saves roughly 60 KB on a school Chromebook's first load, and it is already the face the kid will
meet in Android Studio in Tier 5.

**Sizes.** Explorer in parentheses.

| | Builder | Explorer |
|---|---|---|
| Lesson prose | 18px / 1.6 | 21px / 1.65 |
| Code | 15px / 1.55 | 17px / 1.6 |
| Headings | 28 / 22 / 18 | 32 / 25 / 20 |
| Telemetry + labels | 14px | 16px |

18px is the floor for prose in either mode. Nothing shrinks below 14px anywhere, ever. A
"larger type" toggle scales the Explorer column again by 1.15 for low vision, independent of mode.

---

## Layout

### Level Map — the one bold thing

A hand-inked navigational star chart, drawn as inline SVG, on `--chart` ground. Tiers are
stations; lessons are waypoints on a flown route. Strokes are drawn with a slight hand wobble
(a seeded jitter on the path data, generated once at build time, not animated), hatched shading,
coordinate ticks and margin annotations in the chart's own handwriting. It is the only screen in
the project with drawing on it.

```
┌────────────────────────────────────────────────────────────────────────────┐
│ [logo] Nebula Academy             Explorer│Builder      Mentor    Progress │  hull, 56px
├────────────────────────────────────────────────────────────────────────────┤
│·     ·        ·      ·            ·        ·      ·        ·      ·        │  chart ground
│   ╭────────╮                                                               │
│   │   T0   │●━━━●━━━●━━━◉ ┄┄┄┄┄┄┄┄┄┄┄┐                 ·        ·          │
│   │LAUNCHPAD│                        ┆    ╭────────╮                       │
│   ╰────────╯   ·        ·            └┄┄┄▸│   T1   │○ ○ ○ ○ ○ ○ ○ ○        │
│        ·                     ·            │  ORBIT │                       │
│                 ·                         ╰────────╯      ·               │
│   ·       ╭────────╮  ·          ╭────────╮      ┆              ·          │
│           │   T3   │             │   T2   │◂┄┄┄┄┄┘                         │
│           │ FLIGHT │   ·         │ DOCKING│            ·        ·          │
│           ╰────────╯             ╰────────╯                                │
│      ·          ·        ·                    ·         ·                  │
│  7 of 42 waypoints logged                              N↑   0────────12 ft │  annotations
└────────────────────────────────────────────────────────────────────────────┘

  ●  flown      ◉  you are here      ○  open      ┄┄  locked route
```

Waypoint states are distinguishable **by shape alone** — filled, ringed, hollow, and a dashed
route — so the chart works in greyscale and for a colorblind kid. Amber is confirmation, never
the only signal.

**The only animation in the project that is not a state change:** completing a lesson extends
the route stroke to the next waypoint (`stroke-dashoffset`, 900 ms, ease-out), the new waypoint
lights amber, and that is the whole celebration — one second, then the next-lesson button, per
CLAUDE.md. Under `prefers-reduced-motion: reduce` the route is simply already extended.

### Lesson page — the console

Two states, because 768px of height is the real constraint. The step rail is always a rail, never
a row of tabs, so the six parts stay visible as a route of their own.

**Reading state** (Mission, Watch, Learn, Boost) — prose gets the room:

```
┌────────────────────────────────────────────────────────────────────────────┐
│ ‹ Chart    T1·05  Robot math            Explorer│Builder           Stuck? │
├──────────────┬─────────────────────────────────┬───────────────────────────┤
│ ● Mission    │  Robot math                     │ ┌───── FIELD ──────────┐ │
│ ● Watch      │                                 │ │                      │ │
│ ◉ Learn      │  You can do arithmetic right     │ │         ▭            │ │
│ ○ Try        │  inside the number you give the │ │                      │ │
│ ○ Check      │  motor. The robot drives for    │ │                      │ │
│ ○ Boost      │  cm / 10 seconds...             │ └──────────────────────┘ │
│              │                                 │ ┌─── TELEMETRY ────────┐ │
│              │  ┌ Why this works ─────────────┐│ │ heading      0.0     │ │
│              │  │ Integer division throws the ││ │ leftDrive    0.00    │ │
│              │  │ remainder away...           ││ │ distance     0.0 cm  │ │
│              │  └─────────────────────────────┘│ └──────────────────────┘ │
│              │                       [ Try it ]│                          │
└──────────────┴─────────────────────────────────┴───────────────────────────┘
   160px              reading column, 60ch max              400px
```

**Console state** (Try, Check) — the rail narrows to icons, prose collapses to a one-line
reminder, and the console takes the screen:

```
┌────────────────────────────────────────────────────────────────────────────┐
│ ‹ Chart    T1·05  Robot math            Explorer│Builder           Stuck? │
├────┬───────────────────────────────────────────┬───────────────────────────┤
│ ●  │ Drive exactly 50 cm.             [brief ▾]│ ┌───── FIELD ──────────┐ │
│ ●  ├───────────────────────────────────────────┤ │          ▭           │ │
│ ●  │  1  public class RobotMath {              │ │                      │ │
│ ◉  │  2      public static void main(String[]  │ └──────────────────────┘ │
│ ○  │  3          int cm = 50;                  │ ┌─── TELEMETRY ────────┐ │
│ ○  │  4          ▏                             │ │ leftDrive    0.50    │ │
│    │  5      }                                 │ │ distance    31.4 cm  │ │
│ 44 │  6  }                                     │ └──────────────────────┘ │
│ px ├───────────────────────────────────────────┤ ┌─── GAMEPAD ──────────┐ │
│    │ ▶ Run      ■ Stop          3 checks ✦     │ │  (  )   Ⓐ Ⓑ  Ⓧ Ⓨ   │ │
│    ├───────────────────────────────────────────┤ └──────────────────────┘ │
│    │ › Robot drove 31.4 cm. Expected 50.       │                          │
└────┴───────────────────────────────────────────┴───────────────────────────┘
```

At **1024×768** the field/telemetry column moves under the editor and the editor keeps full
width; the field view shrinks to 280px tall and stays visible while code runs, because a kid
must see the robot and the code at the same time. At **200% zoom** the layout is the 1024
arrangement in a single scrolling column, rail on top as a horizontal route.

**No cards.** Panels are divided by one `--seam` hairline and a change of paint. There is no
border-radius above 3px, no box-shadow anywhere in the project, and no panel that floats.

---

## Three principles

**1. The panel reports; it does not perform.**
Every number on screen is read from the robot or the test runner. No decorative metrics, no
sparkline that isn't data, no progress ring that isn't progress, no "42 lessons!" statistic on
the home page. If we cannot name the variable behind a number, it comes off the screen.

**2. One room is loud.**
The Level Map is drawn, hand-feeling and animated. Every other screen is flat paint, one
hairline, and type. Boldness spent twice is boldness wasted, and a kid should be able to picture
the chart with their eyes closed.

**3. Thumb-first, 18px floor.**
If it needs a mouse, a hover, or a squint, it is broken. 44×44 px minimum on everything
touchable, 18px minimum on prose, every state reachable by tap and by keyboard, focus always
visible.

---

## Motion, icons, and the hero

**Motion.** Four animations exist in the whole project: the route extending on the Level Map, the
robot moving in the sim (that's the product, not an effect), the Run button's amber lamp while
code runs, and hints sliding down as they are revealed (120 ms). No entrance animations. No
scroll-triggered anything. Every one of them is disabled or made instant under
`prefers-reduced-motion: reduce`.

**Icons.** Drawn by hand as SVG, 24×24, 1.75px stroke, square cap, no fill. Run, stop, locked,
passed, failed, hint, export, import, mentor, back-to-chart. No emoji anywhere in the UI — and
none in lesson prose either, where a screen reader would read them aloud mid-sentence.

**Focus.** 3px ring. `--ink` on light paint (12.81:1), `--lamp` on dark surfaces (9.05:1), always
with a 1px offset so it reads on both. Never removed, never only a color change.

**The hero is a live thing.** The home page opens with the virtual robot driving a short loop on
the field — the real sim, the real robot sprite, on a fixed-timestep loop, about six seconds,
repeating. One button: "Start your first mission." Under reduced motion the robot is parked
mid-field with its route drawn behind it as a static path. No headline over it, no tagline, no
gradient. The page's first sentence sits *below* the field and is specific: "Write real Java. A
real robot drives. Then put your code on your team's bot."

---

## Assets

All generated art in `public/art/`, with a README listing every file and where it is used. The
sprite set is designed to be replaced later with illustrated versions, so every sprite is a
single SVG with a fixed viewBox and a documented anchor point.

```
public/art/
  robot-tank.svg          top-down, 18×18 in footprint, anchor at center, wheels on the long sides
  robot-mecanum.svg       top-down, 18×18 in, four rollers drawn at 45° so rotation reads
  badge-t0..t5.svg        six mission patches — distinct silhouettes, not six colored circles
  field-tile.svg          24×24 in foam tile, seam + stud pattern, tiles seamlessly
  element-cube.svg        generic game element (no season trademarks)
  element-ball.svg        generic game element
  goal-zone.svg           corner scoring zone
  loading.svg             a horizon line sweeping — no spinner
  icons/*.svg             the UI icon set above
```

**Tier badges are patches, not dots.** Six shapes — shield, hexagon, circle-with-notch, delta,
octagon, diamond — each with its own internal mark. A kid can tell Tier 3 from Tier 4 across a
classroom, and so can a kid who cannot tell teal from amber. `logo.png` stays exactly as it is,
used only as the wordmark in the header at its native aspect ratio.

---

## After the review

The brief asks me to review this plan and change anything that reads as the default. Five things
were wrong on the first pass and are now different.

**1. It was a dark console with a cyan accent.** My first instinct was `#0B0E14` everywhere with
one bright cyan — which is exactly the brief's "near-black with one acid accent" tell, and it is
also wrong for the room: school fluorescent light plus a glossy Chromebook screen makes a dark UI
a mirror. **Changed:** the chrome is now *light painted metal* and only the two working surfaces
are dark. This is better for the actual device and it inverts the cliché instead of avoiding it.

**2. Every lesson step was a rounded card with a grey shadow.** **Changed:** no cards and no
shadows exist in the project. Panels are a paint change and one `--seam` hairline — how a real
bezel is actually divided.

**3. The accent was going to be everywhere.** A lit amber button on a light page, an amber
underline, an amber word in the headline. The measured 1.50:1 failure caught it. **Changed:**
amber is a lamp that only burns on dark surfaces, which means the light chrome has *no* accent
color at all and has to work on type, weight and the seam — which is what makes it read as
disciplined rather than decorated.

**4. Tier badges were six circles in six hues.** **Changed:** six patch silhouettes, because
color alone is not a signal, and because a real team's patch wall is a much better thing to be
imitating than a color-coded dashboard legend.

**5. Three webfonts, one of them a tracked-out mono for small labels.** **Changed:** the mono is
system-only and used for code exclusively. Small labels are Archivo at 14px, normal tracking.
Tracked-out mono micro-labels are on the brief's list for good reason, and the Chromebook keeps
60 KB.

Also struck, from the brief's list, before they could happen: no ALL-CAPS eyebrow above any
heading, no `→` on any button (buttons say "Try it", "Run", "Next lesson"), no fade-and-slide-up,
no hover-only transitions, no single word colored in a headline, no gradient blobs.

---

## Budgets this plan commits to

- Text contrast ≥ 4.5:1 everywhere; measured in CI, not eyeballed.
- Lighthouse accessibility ≥ 95.
- Two webfont files, variable, `font-display: swap`, subset to Latin.
- No `box-shadow`, no `border-radius > 3px`, no `:hover`-only affordance — all three are grep-able
  lint rules in `npm run check`.
- Tap targets ≥ 44×44 px, verified by a test that walks the rendered DOM.
