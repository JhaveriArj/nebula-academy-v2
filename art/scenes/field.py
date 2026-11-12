"""Field art, top down: public/art/field-tile, element-cube, element-ball (.webp, @2x.webp).

No season game is chosen, so the field is plain foam tiles and every game element is its own
transparent file: the sim places and moves them, and src/sim/field.ts says where they start.
  field-tile    one 24 in foam tile, filling the frame edge to edge; the field view repeats
                it 6 x 6 (the real 12 ft field) and lays the seams and alliance tiles over it.
  element-cube  a generic cube, in the SVG's box: the cube is 69% of the frame.
  element-ball  a generic ball, in the SVG's box: the ball is 75% of the frame.
The tile is in the space palette (--space) rather than FTC grey, because the field is
one of the site's dark "space" screens (docs/DESIGN.md); change TILE_COLOR for real grey.
Built from primitives, modifiers and procedural shader nodes only. See docs/ART_PIPELINE.md.
"""
import importlib
import math
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common  # noqa: E402

importlib.reload(common)
C = common

TILE = 0.6096          # 24 in, TILE_CM in src/sim/field.ts
TILE_PX = 256          # at 2x
TILE_COLOR = "space"
CUBE_BOX = 0.114       # the cube sprite's box: r * 1.9 with r = 6 cm (field.ts)
BALL_BOX = 0.14        # the ball sprite's box: r * 2 with r = 7 cm
ELEMENT_PX = 64        # at 2x


def foam_material():
    """Foam: the palette colour with a fine pebbled bump, all procedural."""
    mat = C.material("foam", TILE_COLOR, rough=0.85)
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    bsdf = next(n for n in nodes if n.type == "BSDF_PRINCIPLED")
    noise = nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 220
    noise.inputs["Detail"].default_value = 4
    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.6
    bump.inputs["Distance"].default_value = 0.002
    links.new(noise.outputs["Fac"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


def main(render=True):
    scene = C.fresh_scene("nebula_field")
    C.soft_light(scene, sun_strength=2.6, elevation=65)
    cam = C.top_camera(scene, TILE)

    # The tile: a slab with soft bevelled edges, so neighbours meet in a shallow groove.
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, -0.006))
    tile = bpy.context.active_object
    tile.name = "field_tile"
    tile.scale = (TILE, TILE, 0.012)
    bpy.ops.object.transform_apply(scale=True)
    tile.data.materials.append(foam_material())
    C.bevel(tile, 0.005, 3)

    # The elements, away from the tile, on a floor that keeps only their shadows.
    ex = 5.0
    bpy.ops.mesh.primitive_cube_add(size=CUBE_BOX * 0.69, location=(ex, 0, CUBE_BOX * 0.69 / 2))
    cube = bpy.context.active_object
    cube.name = "element_cube"
    cube.data.materials.append(C.material("element_cube", "rim", rough=0.6))
    C.bevel(cube, 0.008, 4)

    bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=24, radius=BALL_BOX * 0.75 / 2, location=(ex + 1, 0, BALL_BOX * 0.75 / 2))
    ball = bpy.context.active_object
    ball.name = "element_ball"
    ball.data.materials.append(C.material("element_ball", "space_ink", rough=0.5))
    C.smooth(ball)

    bpy.ops.mesh.primitive_plane_add(size=3, location=(ex + 0.5, 0, 0))
    bpy.context.active_object.is_shadow_catcher = True
    bpy.context.active_object.name = "elements_shadow_catcher"

    if not render:
        return
    C.setup_render(scene, TILE_PX, TILE_PX, samples=64)
    # Transparent too: the bevelled corners let the field view's ground show, not the sky.
    C.render(scene, "field-tile")

    C.setup_render(scene, ELEMENT_PX, ELEMENT_PX, samples=64)
    for obj, box, name in ((cube, CUBE_BOX, "element-cube"), (ball, BALL_BOX, "element-ball")):
        cam.location.x, cam.location.y = obj.location.x, obj.location.y
        cam.data.ortho_scale = box
        C.render(scene, name)
    C.save_blend(scene, "field")


if __name__ == "__main__":
    main()
