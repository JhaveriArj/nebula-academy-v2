# Art sources and licenses

Every picture the site loads, where it came from, and its license. Add a row when you add a
picture. "Primitives" means built in Blender from its own cubes, cylinders, spheres and
modifiers by a script in `art/scenes/`: no downloaded models, textures, HDRIs or generated
meshes. How to re-render: `docs/ART_PIPELINE.md`.

| Picture (public/art) | Source | Made with | License |
|---|---|---|---|
| `*.svg` (robots, tile, elements, goal zone, badges, loading) | Hand-drawn SVG for this project | Text editor | Same as the repo |
| `logo.png` | The mascot as supplied by the team | — | The team's own |
| `mascot-*.webp`, `mascot-*.png` | Resized from `art-source/mascot-4x.png`, which is `logo.png` upscaled with Real-ESRGAN (`realesrgan-x4plus-anime`, BSD-3-Clause), run locally | — | The team's own |
| `icons/*` | Drawn for this project from the mascot | — | Same as the repo |
| `robot-mecanum.webp`, `robot-mecanum@2x.webp` | `art/scenes/robot.py`, saved as `art/blend/robot-mecanum.blend` | Blender 5.2, Cycles, primitives | Same as the repo |
| `badge-t0` … `badge-t5` `.webp`, `@2x.webp` | `art/scenes/badges.py`, saved as `art/blend/badges.blend` | Blender 5.2, Cycles, primitives | Same as the repo |
