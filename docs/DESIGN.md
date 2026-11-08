# Nebula Academy — Design plan

The visual identity comes from the mascot in `public/art/logo.png`. It was redrawn on
2026-11-08; the earlier "painted metal" plan and what changed are in
[The 2026-11-08 redesign](#the-2026-11-08-redesign).

**The brief in one line.** A space-mission academy for kids, run by a real FTC team, that feels
like a friendly mission you join, not a SaaS landing page and not a template.

---

## The idea the whole design hangs on

**A friendly astronaut-bot drifting through deep space.** The mascot is rounded, soft violet,
outlined in deep navy, with two yellow antennae that look switched on. The site borrows all of
that.

The page is the inside of the ship: a pale lavender-white, rounded white panels, violet buttons.
The places where work happens (the **star chart**, the **code editor**, the **field** and the
**console**) are windows into *space*: deep navy, the same in light and dark mode. Yellow is the
antenna light. It means *powered* and it only glows in space, or as a fill behind dark text on
the one start button. It never carries text on the light page.

---

## Palette

Every color is sampled from the mascot. All text pairs are measured in both modes by
`scripts/check-contrast.mjs`, which runs in `npm run check`. `src/ui/theme.css` is the only
file in the project allowed to contain a color value; the design lint rejects a hex or `rgb()`
anywhere else, and the canvas and the code editor read their colors from it at runtime.

| Token | Light | Dark | From the mascot | Role |
|---|---|---|---|---|
| `--bg` | `#F5F3FC` | `#100E3E` | suit, lightened | The page |
| `--surface` | `#FFFFFF` | `#1A1752` | | Panels on the page |
| `--surface-soft` | `#EAE5F8` | `#221F60` | visor | Inset fields, current step |
| `--line` | `#D3CAEE` | `#35317F` | visor | Hairlines |
| `--line-strong` | `#7A6DB3` | `#8F88C8` | | Control borders (3:1) |
| `--ink` | `#15123F` | `#ECE8FA` | outline navy | Body text |
| `--ink-mid` | `#4A4472` | `#BDB6E0` | | Secondary text |
| `--primary` | `#4B3590` | `#B9A6F5` | suit violet | Main buttons, current state |
| `--link` | `#3F3DD6` | `#A8A6FF` | helmet indigo | Links, focus ring |
| `--star` | `#FEBC02` | same | antennae | The light. Space only, or behind `--ink` |
| `--badge` | `#A62961` | `#EE8DB8` | chest badge | The one-second celebration |
| `--go` | `#0F6B5C` | `#5FD4BE` | | A test passed |
| `--alert` | `#B3261E` | `#FF8A80` | | The robot got confused |
| `--space` | `#0B0A3A` | `#07062A` | outline navy | Chart, editor, field, console |

`--space-*` tokens (`raised`, `line`, `ink`, `mute`, `dim`, `go`, `alert`, `route`, `wall`) and
the `--syn-*` code colors live alongside them in `theme.css`.

**Dark mode** follows the device (`prefers-color-scheme`). `:root[data-theme='light' | 'dark']`
overrides it, so a toggle can be added later without touching any other stylesheet.

**The yellow rule.** `--star` on `--bg` measures about 1.5:1. The contrast script requires that
pair to *fail*: yellow is a light, not a text color. If someone darkens it until it passes, the
rule has been deleted and the stylesheet needs re-reading.

Nothing is colored to decorate. A color on screen means a state the robot or the kid is actually
in, or it is the mascot.

---

## Type

Two families from Google Fonts, plus the system monospace.

**Fredoka** — headings, buttons, navigation, tier names, telemetry keys.
`font-family: 'Fredoka', 'Nunito', 'Trebuchet MS', sans-serif`
Round terminals and soft bowls, like the helmet and antennae. Used at 500–600, never above
46px. Variable, one file.

**Atkinson Hyperlegible Next** — all lesson prose, hints, glossary, mentor docs.
`font-family: 'Atkinson Hyperlegible Next', 'Atkinson Hyperlegible', Verdana, sans-serif`
Drawn by the Braille Institute to maximize character disambiguation for low vision. It is the
single best face available for a nine-year-old reading `1 l I` and `0 O` inside sentences about
Java identifiers. It stays through any restyle.

**System monospace** — code only. No third webfont.
`font-family: ui-monospace, 'SF Mono', 'Cascadia Mono', Menlo, Consolas, monospace`

**Sizes.** Explorer in parentheses.

| | Builder | Explorer |
|---|---|---|
| Lesson prose | 18px / 1.6 | 21px / 1.65 |
| Code | 15px / 1.55 | 17px / 1.6 |
| Headings | 30 / 23 / 19 | 34 / 26 / 21 |
| Telemetry + labels | 15px | 16px |

18px is the floor for prose in either mode. Nothing a kid has to read shrinks below 14px. A
"larger type" toggle scales again for low vision, independent of mode.

---

## Shape

| Token | Value | Used for |
|---|---|---|
| `--radius-xs` | 5px | Inline code |
| `--radius-sm` | 8px | Code blocks, problem boxes |
| `--radius` | 12px | Panels, the field, telemetry |
| `--radius-lg` | 20px | The hero window, the star chart, home lists |
| `--radius-pill` | 999px | Every button, nav link, step, toggle |
| `--shadow-sm` / `--shadow` / `--shadow-lift` | violet-tinted | Header / panels / the screens |

The lint accepts a radius only as one of these tokens (or `50%` for circles) and a shadow only
through a `--shadow-*` token.

---

## Layout

### Level Map — the one bold thing

A hand-inked navigational star chart, drawn as inline SVG, on `--space` ground. Tiers are
stations; lessons are waypoints on a flown route. Strokes are drawn with a slight hand wobble
(a seeded jitter on the path data, generated once at build time, not animated), hatched shading,
coordinate ticks and margin annotations in the chart's own handwriting. It is the only screen in
the project with drawing on it.

```
┌────────────────────────────────────────────────────────────────────────────┐
│ [logo] Nebula Academy             Explorer│Builder      Mentor    Progress │ surface, 64px
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
route — so the chart works in greyscale and for a colorblind kid. Yellow is confirmation, never
the only signal.

**The only animation in the project that is not a state change:** completing a lesson extends
the route stroke to the next waypoint (`stroke-dashoffset`, 900 ms, ease-out), the new waypoint
lights yellow, and that is the whole celebration — one second, then the next-lesson button, per
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

**The lesson page is fixed to the screen.** From 761 px wide and 561 px tall up, the page
itself never scrolls: the reading column, the editor, the results and the side column each
scroll inside their own box. Run, Check, the results and the field are therefore always on a
768 px screen, and pressing Check never looks like nothing happened.

At **1024×768** the side column narrows to 320 px (352 px when the lesson has a gamepad) and
stays beside the work, because a kid must see the robot and the code at the same time. The side
column is ordered field, gamepad, telemetry: driving by hand needs the field and the gamepad on
screen together, and telemetry is the part allowed to scroll. The gamepad is always two rows,
sticks over buttons, because one row of four is wider than any side column. At **200% zoom**
and on phones the layout becomes a single scrolling column, rail on top as a horizontal route.

**Few cards.** Panels are a white surface on the lavender page with one `--line` hairline and a
soft violet shadow. Three things float (the hero window, the star chart frame, the field) because
they are screens. Lists stay lists, inside one rounded panel, never chopped into a card each.

---

## Three principles

**1. The panel reports; it does not perform.**
Every number on screen is read from the robot or the test runner. No decorative metrics, no
sparkline that isn't data, no progress ring that isn't progress. If we cannot name the variable
behind a number, it comes off the screen.

**2. Space is loud; the ship is calm.**
The hero window and the star chart are the bold surfaces: deep navy, yellow light, the mascot.
Everything on the light page is white panels, one hairline, violet, and type.

**3. Thumb-first, 18px floor.**
If it needs a mouse, a hover, or a squint, it is broken. 44×44 px minimum on everything
touchable, 18px minimum on prose, every state reachable by tap and by keyboard, focus always
visible.

---

## Motion, icons, and the hero

**Motion.** The route extending on the Level Map, the robot moving in the sim (that is the
product, not an effect), the mascot drifting slowly at the edge of the hero, and 120–160 ms
color transitions on buttons. No entrance animations. No scroll-triggered anything. Every one of
them is disabled or made instant under `prefers-reduced-motion: reduce`.

**Icons.** Drawn by hand as SVG in `src/ui/icons.ts`, 24×24, 1.75px stroke, no fill, inheriting
`currentColor`. No emoji anywhere in the UI or lesson prose.

**Focus.** 3px ring with a 2px offset. `--link` on the page, `--star` in space. Never removed,
never only a color change.

**The hero is a window into space.** The home page opens with a deep-navy panel: the virtual
robot driving a short loop on the real sim, the page's one `<h1>` beside it ("Write real Java. A
real robot drives. Then put your code on your team's bot."), one yellow button, and the mascot
floating at the edge. Under reduced motion the robot is parked with its route drawn behind it
and the mascot holds still.

---

## Assets

All art is in `public/art/`, with a README listing every file and where it is used.

- `logo.png` is the mascot, kept exactly as supplied. The page loads two resized copies,
  `mascot-112.png` (header, 10 KB) and `mascot-264.png` (hero, 43 KB), so a Chromebook never
  downloads the 191 KB original.
- `icons/favicon.svg` is the mascot's helmet and antennae, drawn in palette colors.
- The tier badges and field sprites are reference art; the field itself is drawn on canvas from
  the `--space-*` tokens.

**Tier badges are patches, not dots.** Six shapes, so a kid can tell Tier 3 from Tier 4 across a
classroom, and so can a kid who cannot tell one color from another.

---

## The 2026-11-08 redesign

The first plan was "mission control: painted metal in a bright room, watching a dark screen":
grey-green `#DCE0D8` chrome, an amber lamp, square 3px corners and no shadows at all. It was
disciplined, but it did not look like the mascot, a purple, rounded, cartoon astronaut-bot. A kid
who saw the logo and then the site saw two different brands.

**What changed:** the palette is sampled from the mascot; Archivo became Fredoka; corners and
pill buttons replaced 3px squares; soft violet shadows replaced the no-shadow rule; dark mode
was added; the hero became a space window with a real `<h1>`; the mascot is now visible in the
header (it rendered at 17×30 px before).

**What stayed:** Atkinson Hyperlegible for every word a kid reads, the dark working surfaces,
"yellow is a light, never text on the page", shape-not-color state on the chart, the 44 px tap
floor, the layout and its breakpoints.

---

## Budgets this plan commits to

- Text contrast ≥ 4.5:1 in light and dark mode; measured in CI, not eyeballed.
- Lighthouse accessibility ≥ 95.
- Two webfont files, variable, `font-display: swap`.
- No color literal outside `theme.css`; radius and shadow only from tokens; no `:hover`-only
  affordance. All grep-able lint rules in `npm run check`.
- Tap targets ≥ 44×44 px, verified by a test that walks the rendered DOM.
