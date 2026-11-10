# Art

Every file here is SVG drawn with the palette in `docs/DESIGN.md`, so the whole set can be
replaced with illustrated versions without touching any code. Each sprite has a fixed
viewBox and a documented anchor point; keep both and a replacement drops straight in.

| File | What it is | Where it is used | Anchor |
|---|---|---|---|
| `logo.png` | The mascot, exactly as supplied. Source of the palette. Not loaded by the app. | — | — |
| `mascot-hero-560.webp`, `mascot-hero-1108.webp` | The mascot from `art-source/mascot-4x.png`, 560 and 1108 px wide (60 KB, 148 KB) | Home hero, chosen by `srcset` | Feet at the bottom edge |
| `mascot-112.png`, `mascot-264.png`, `mascot-560.webp` | Older resizes of `logo.png`; no longer loaded | — | — |
| `robot-tank.svg` | Tank drivetrain robot, top down, 18 in square | Field view, Tiers 0–2 | Box centre; forward is −y |
| `robot-mecanum.svg` | Mecanum robot, rollers drawn at 45° | Field view, Tiers 3–5 | Box centre; forward is −y |
| `field-tile.svg` | 24 in foam tile, tiles seamlessly | Field view background | Top-left |
| `element-cube.svg` | Generic game element | Field view | Centre |
| `element-ball.svg` | Generic game element | Field view | Centre |
| `goal-zone.svg` | Corner scoring zone | Field view | Top-left |
| `loading.svg` | A horizon line sweeping, not a spinner | Loading states | — |
| `badge-t0.svg` … `badge-t5.svg` | Six tier mission patches | Star chart stations, home tier list | Centre |
| `icons/favicon.svg` | Browser tab icon | `index.html` | — |

## The mascot master

`art-source/mascot-4x.png` (1108x2440, outside `public/` so it is not deployed) is the master.
It is `logo.png` upscaled 4x with Real-ESRGAN (`realesrgan-x4plus-anime`, run locally), with the
white matte fringe left by the original's removed background recoloured to the linework navy
and the antenna yellow set to exactly `--star` (`#FEBC02`). Its colours are the `--mascot-*`
tokens in `theme.css`. The header's head is a vector redrawn from it in `src/ui/mascot.ts`.

## Two things to keep if you redraw these

**Tier badges are patches, not dots.** Six different silhouettes — shield, circle with a
notch, hexagon, delta, octagon, diamond — so a kid can tell Tier 3 from Tier 4 across a
classroom, and so can a kid who cannot tell teal from amber. Colour is never the only
signal anywhere in this project.

**Yellow only glows in space.** `--star` (`#FEBC02`) measures about 1.5:1 against the
light page and may not carry text or an icon there. The field and the star chart are space
surfaces, so they use it freely. See `docs/DESIGN.md`.

The sprites and badges use the mascot palette's hex values (they are image files, so they
cannot read `theme.css`; keep them in step with its `--space-*` and `--star` tokens). The field
canvas draws the robots, the foam tile and the game elements from these files, falling back to
drawn shapes until they load. The tier badges appear on the home tier list and the star-chart
stations.

## The UI icons are not here

`src/ui/icons.ts` draws the interface icons inline as SVG paths rather than loading files,
so they inherit `currentColor` and change with the surface they sit on. They are drawn to
the same rules: 24×24, 1.75 px stroke, square cap, no fill. Add a new one by adding a path
to that file.

## Current wiring

The field view in `src/ui/components/field.ts` currently draws the robot, tiles and
elements procedurally in canvas using the same shapes and palette as these sprites. The
sprites are the reference art and the replacement target; swapping the renderer over to
`drawImage` is a contained change, noted in `HANDOFF.md`.
