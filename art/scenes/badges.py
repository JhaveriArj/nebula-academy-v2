"""The six tier badges, isometric: public/art/badge-t0 ... badge-t5 (.webp, @2x.webp).

Each is a thick patch in its tier's own silhouette (the same six as the SVG badges, so a kid
can tell them apart without colour) with the tier's mark raised on top in antenna yellow:
  0 Launchpad       shield         a Run triangle (press Run and the robot moves)
  1 Orbit           notched disc   a loop with its arrowhead (numbers, choices, loops)
  2 Docking         hexagon        two blocks docking on a peg (methods and objects)
  3 First Flight    triangle       a gamepad (a TeleOp you drive)
  4 Mission Control octagon        a route and its flag (the robot drives itself)
  5 Deep Space      diamond        a four-point compass star (out to a real robot)
Navy top, lavender sides so the edge shows on the light page and the dark one alike.
Built from primitives and modifiers only. Run in Blender; see docs/ART_PIPELINE.md.
"""
import importlib
import math
import os
import sys

import bmesh
import bpy
from mathutils import Quaternion, Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common  # noqa: E402

importlib.reload(common)
C = common

PX = 256          # at 2x; the 1x file is 128
SPACING = 3.0     # metres between badges in the scene
THICK = 0.2       # patch thickness
TOP = THICK - 0.025  # the recessed middle the emblem sits on


def mats():
    return {
        "top": C.material("badge_top", "space", rough=0.6),
        "side": C.material("badge_side", "rim", rough=0.6),
        "mark": C.material("badge_mark", "star", rough=0.45, emit=0.15),
    }


def link(obj, coll):
    for c in obj.users_collection:
        c.objects.unlink(obj)
    coll.objects.link(obj)
    return obj


def prism(coll, name, outline, m):
    """Extrude a flat outline (list of x, y) into a patch with navy top and lavender sides."""
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bottom = [bm.verts.new((x, y, 0)) for x, y in outline]
    face = bm.faces.new(bottom)
    ext = bmesh.ops.extrude_face_region(bm, geom=[face])
    top_verts = [v for v in ext["geom"] if isinstance(v, bmesh.types.BMVert)]
    top = next(f for f in ext["geom"] if isinstance(f, bmesh.types.BMFace))
    bmesh.ops.translate(bm, verts=top_verts, vec=(0, 0, THICK))
    # A raised lavender border round a navy middle, like a stitched patch. The border is
    # what keeps the silhouette clear on the dark page as well as the light one.
    bmesh.ops.inset_region(bm, faces=[top], thickness=0.075, depth=-0.025)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces:
        f.material_index = 1 if f is top else 0
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    coll.objects.link(obj)
    obj.data.materials.append(m["side"])
    obj.data.materials.append(m["top"])
    C.bevel(obj, 0.035, 4)
    return obj


def ngon(n, r, turn=0.0):
    return [(r * math.cos(turn + 2 * math.pi * i / n), r * math.sin(turn + 2 * math.pi * i / n)) for i in range(n)]


def shield(r):
    pts = [(-r * 0.85, r * 0.8), (r * 0.85, r * 0.8)]
    for i in range(1, 12):  # the curved lower edge down to the point
        t = i / 12
        pts.append((r * 0.85 * math.cos(t * math.pi / 2), r * 0.8 - (r * 1.85) * math.sin(t * math.pi / 2) ** 1.4))
    pts.append((0, -r * 1.05))
    for x, y in reversed(pts[2:-1]):
        pts.append((-x, y))
    return pts


def notched_disc(r):
    """A circle with a notch cut at the top right, like the SVG badge."""
    pts = []
    for i in range(48):
        a = 2 * math.pi * i / 48
        if 0.55 < a < 1.0:
            continue
        pts.append((r * math.cos(a), r * math.sin(a)))
    mid = 0.775
    pts.insert(next(i for i, (x, y) in enumerate(pts) if math.atan2(y, x) > 1.0), (r * 0.72 * math.cos(mid), r * 0.72 * math.sin(mid)))
    return pts


def mark_box(coll, m, size, loc, rot=(0, 0, 0), bev=0.02):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    obj = bpy.context.active_object
    obj.scale = size
    bpy.ops.object.transform_apply(scale=True)
    obj.data.materials.append(m["mark"])
    C.bevel(obj, bev)
    return link(obj, coll)


def mark_cyl(coll, m, r, depth, loc, rot=(0, 0, 0), verts=32, bev=0.015):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth, location=loc, rotation=rot)
    obj = bpy.context.active_object
    obj.data.materials.append(m["mark"])
    C.smooth(obj)
    C.bevel(obj, bev)
    return link(obj, coll)


def mark_tube(coll, m, points, radius):
    """A raised line through `points` (x, y), as a curve with a round bevel."""
    curve = bpy.data.curves.new("mark_tube", "CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = radius
    curve.bevel_resolution = 4
    curve.use_fill_caps = True
    spline = curve.splines.new("NURBS")
    spline.points.add(len(points) - 1)
    for p, (x, y) in zip(spline.points, points):
        p.co = (x, y, TOP + radius, 1)
    spline.use_endpoint_u = True
    spline.order_u = 3
    obj = bpy.data.objects.new("mark_tube", curve)
    coll.objects.link(obj)
    obj.data.materials.append(m["mark"])
    return obj


def emblem(tier, coll, m):
    h = 0.09  # relief height
    z = TOP + h / 2
    if tier == 0:  # Run triangle
        mark_cyl(coll, m, 0.36, h, (0.06, 0.04, z), (0, 0, -math.pi / 2), verts=3, bev=0.03)  # a 3-sided cylinder points +y; turn it to point right
    elif tier == 1:  # a loop with its arrowhead
        pts = [(0.36 * math.cos(a), 0.36 * math.sin(a)) for a in [math.radians(d) for d in range(60, 360 + 20, 20)]]
        mark_tube(coll, m, pts, 0.055)
        # The arrowhead, a flat triangle pointing along the loop at its open end.
        a = math.radians(32)
        mark_cyl(coll, m, 0.13, h, (0.36 * math.cos(a), 0.36 * math.sin(a), z), (0, 0, a), verts=3, bev=0.02)
    elif tier == 2:  # two blocks docking on a peg
        mark_box(coll, m, (0.26, 0.4, h), (-0.25, 0, z))
        mark_box(coll, m, (0.26, 0.4, h), (0.27, 0, z))
        mark_box(coll, m, (0.2, 0.1, h * 0.7), (-0.03, 0, TOP + h * 0.35), bev=0.015)
    elif tier == 3:  # a gamepad, low in the triangle where it is widest
        y0 = -0.17
        mark_box(coll, m, (0.56, 0.28, h), (0, y0 + 0.02, z), bev=0.07)
        for x in (-0.19, 0.19):
            mark_box(coll, m, (0.16, 0.2, h), (x, y0 - 0.09, z), bev=0.07)
        dark = C.material("badge_top", "space")
        for x in (-0.13, 0.13):
            bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.05, depth=0.04, location=(x, y0 + 0.02, TOP + h + 0.015))
            stick = bpy.context.active_object
            stick.data.materials.append(dark)
            C.smooth(stick)
            link(stick, coll)
    elif tier == 4:  # a route and its flag
        mark_tube(coll, m, [(-0.42, -0.36), (-0.1, -0.36), (0.0, -0.05), (0.12, 0.2), (0.3, 0.2)], 0.05)
        mark_cyl(coll, m, 0.07, h, (-0.42, -0.36, z), verts=24)
        # The flag lies flat like the rest of the mark, so it reads face on: a pole and a pennant.
        mark_tube(coll, m, [(0.3, 0.2), (0.3, 0.38), (0.3, 0.52)], 0.03)
        mark_cyl(coll, m, 0.13, h, (0.39, 0.45, z), (0, 0, -math.pi / 2), verts=3, bev=0.015)
    elif tier == 5:  # a four-point compass star
        for turn in (0, math.pi / 2):
            bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=1, depth=h * 1.4, location=(0, 0, TOP + h * 0.7), rotation=(0, 0, turn))
            star = bpy.context.active_object
            star.scale = (0.46, 0.12, 1)
            star.data.materials.append(m["mark"])
            C.bevel(star, 0.01)
            link(star, coll)


SHAPES = [
    lambda: shield(0.62),
    lambda: notched_disc(0.66),
    lambda: ngon(6, 0.68, math.pi / 6),
    lambda: [(0, 0.66), (-0.72, -0.5), (0.72, -0.5)],
    lambda: ngon(8, 0.66, math.pi / 8),
    lambda: ngon(4, 0.74, math.pi / 2),
]


def main(render=True, only=None):
    scene = C.fresh_scene("nebula_badges")
    C.setup_render(scene, PX, PX, samples=96)
    C.soft_light(scene, sun_strength=3.0, elevation=55)
    m = mats()
    # Each badge stands tilted 40 degrees toward the camera, so its silhouette reads almost
    # face on while the isometric view still shows its thickness. No floor: badges sit on
    # cards and pages, not on the field.
    tilt_axis = Vector((1, 1, 0)).normalized()  # the camera's left-right axis
    for tier, shape in enumerate(SHAPES):
        coll = C.collection(scene, f"badge_t{tier}")
        prism(coll, f"badge_t{tier}_patch", shape(), m)
        emblem(tier, coll, m)
        root = bpy.data.objects.new(f"badge_t{tier}", None)
        coll.objects.link(root)
        for obj in coll.objects:
            if obj is not root and obj.parent is None:
                obj.parent = root
        root.location = (tier * SPACING, 0, 0)
        root.rotation_mode = "QUATERNION"
        # Turn the shape's up (+y) to the screen's up, then tip it toward the camera.
        root.rotation_quaternion = Quaternion(tilt_axis, math.radians(40)) @ Quaternion((0, 0, 1), math.radians(45))
    cam = C.iso_camera(scene, 2.0)
    base = cam.location.copy()
    for tier in range(6):
        if only is not None and tier != only:
            continue
        cam.location = (base.x + tier * SPACING, base.y, base.z)
        if render:
            C.render(scene, f"badge-t{tier}")
    if render:
        C.save_blend(scene, "badges")


if __name__ == "__main__":
    main()
