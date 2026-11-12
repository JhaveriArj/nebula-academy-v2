# The art pipeline

How the pictures on the site are made, and how a mentor makes a new one. No coding needed
beyond running two commands.

## The swap-in rule

Every picture in `public/art/` starts life as a hand-drawn SVG, `<name>.svg`. That file never
goes away: it is the fallback. A nicer version rendered in Blender sits beside it as two files,
`<name>.webp` and `<name>@2x.webp` (twice the size, for sharp screens).

The site asks for a picture by its name only, through `src/ui/art.ts`. When the build starts it
lists which `.webp` files exist in `public/art/`; for those it loads the render, for the rest the
SVG. If a render fails to load in the browser, it falls back to the SVG on its own. So:

- **To swap a render in:** put the two `.webp` files in `public/art/`. No code changes.
- **To take one out:** delete them. The SVG shows again. No code changes.

After either, rebuild (`npm run build`) or restart `npm run dev`, because the list is read when
the build starts.

## The folders

| Folder | What is in it | In git? |
|---|---|---|
| `art/scenes/` | One Python script per asset that builds the Blender scene from plain shapes, renders it and saves it. `common.py` holds the shared look: palette, light, camera. | Yes |
| `art/blend/` | The saved Blender file for each asset, written by its script. Open it to look around or tweak by hand. | Yes |
| `art/renders/` | The raw PNG straight out of Blender, at 2x size. | No: they are large and the script makes them again in under a minute. |
| `public/art/` | What the site loads: the SVGs and the exported `.webp` files. | Yes |
| `content/art-alt.json` | The alt text for every picture, one line each. | Yes |
| `art/ASSETS.md` | Where every picture came from and its license. | Yes |

## Re-render an asset, step by step

You need Blender (5.2 or newer) and, for the export step, `cwebp` (on a Mac:
`brew install webp`).

1. Open Blender. Any file is fine; the script makes its own scene and leaves yours alone.
2. Go to the **Scripting** tab. Click **Open**, pick the asset's script in `art/scenes/`
   (for example `robot.py`), then click **Run Script** (the play button).
3. Wait. The robot takes about a minute. When it is done, the raw picture is in `art/renders/`
   and the scene is saved to `art/blend/`.
4. In a terminal in the project folder, run
   `node scripts/export-art.mjs robot-mecanum robot-tank` (the pictures' names, no extension).
   It writes both `.webp` files into `public/art/` and prints their sizes. It lowers the
   quality step by step until each file is under 150 KB.
5. Run `npm run check`, then look at the page in the browser, in light and dark mode.
6. Commit the script change, the `.blend` and the two `.webp` files together.

**To change how it looks** (a colour, a part's size), edit the script and run it again. The
colours come from `PALETTE` in `art/scenes/common.py`, copied from `src/ui/theme.css`; a test
fails if one of them is no longer in `theme.css`, so change both together.

**To add a new picture:** draw `public/art/<name>.svg` first and add its alt text to
`content/art-alt.json`. The export refuses a render without both. Then write its scene script.

## The look every render shares

- **Camera:** straight down for the field, the robot and game elements; true isometric
  (35.264 degrees down, 45 degrees round) for badges. Orthographic, so sizes are true.
- **Light:** one soft sun from the top left, and a lavender fill so shadows read violet, never
  black. The same sun for every copy in a sprite sheet, so the robot looks the same at every
  heading.
- **Colour:** only the palette in `theme.css`, with Blender's "Standard" view so the colours come
  out as written.
- **Background:** transparent where the picture sits on something else (robot, elements,
  badges); the shadow is kept, the floor is not. Faint speckle from the denoiser is cleared so
  the file stays small.
- **No text in any render.** Words belong in the page, where they can be read aloud and
  translated.

## Rules for every file in public/art

- Under 150 KB where possible (`tests/art.test.ts` checks every render).
- An SVG fallback beside every render, and alt text in `content/art-alt.json` (also tested).
- Check it against both page themes. The field is always dark (the space palette), so field
  art is checked on `--space`; anything that sits on the page is checked on `--bg` light and dark.
## The robot sprite sheets

`robot-mecanum.webp` and `robot-tank.webp` (both made by `art/scenes/robot.py`) are not one
picture each but 32: eight columns by four rows of square cells.
Column `k` is the robot turned `k x 45` degrees counter-clockwise from facing up. The rows are
arm down with the claw open, arm down closed, arm raised open, arm raised closed. Each cell is
1.6 times the robot's 18 inch footprint, with the robot's centre in the middle, so the arm and
its shadow fit at every heading. `src/ui/components/field.ts` picks the nearest heading, turns
the last few degrees itself, and picks the row from `armMotor` and `clawServo`. If the sheet is
missing, it draws the SVG robot and the claw lines instead, as before. A render of any robot
must use this layout, because the field view reads every robot render as a sheet.

## The home page hero

The hero has no rendered picture, on purpose. It is the product working: a live copy of the
lesson screen whose robot drives the square, beside the mascot. A still render would replace
the one thing that proves the product, so the hero gets the new art through its field instead
(the tank robot, the tiles), and the mascot stays the supplied artwork.

## The field

No season game is chosen, so the field art is one foam tile, `field-tile`, which the field view
repeats 6 by 6 (the real 12 ft field) and then lays the seams, walls and painted alliance tiles
over. Every game element is its own transparent file (`element-cube`, `element-ball`), so the
sim can put it anywhere and move it; their starting places are in `src/sim/field.ts`. Element
renders keep the SVG's box: the cube fills 69% of its frame and the ball 75%, so a render drops
in at the same size. The tile uses the space palette rather than FTC grey, because the field is
one of the site's dark screens; `TILE_COLOR` in `art/scenes/field.py` changes that.
