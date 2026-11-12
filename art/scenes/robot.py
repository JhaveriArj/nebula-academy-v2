"""The two robots, top down, as sprite sheets: public/art/robot-mecanum and robot-tank
(.webp, @2x.webp). The mecanum robot drives Tiers 3 to 5, the tank robot Tiers 0 to 2 and the
home page demo; they share the chassis, arm, claw and sensors and differ in the drive.

Sheet: 8 columns x 4 rows of square cells.
  Column k: heading k * 45 degrees, counter-clockwise from forward (= image up), like the sim.
  Row 0: arm down, claw open    Row 1: arm down, claw closed
  Row 2: arm raised, claw open  Row 3: arm raised, claw closed
Each cell is 1.6 x the robot's 18 in footprint, centred on the robot's centre, so the arm,
the claw and the shadow fit at every heading. src/ui/components/field.ts reads it this way.

Every part is named after the hardware it is (frontLeft, armMotor, clawServo, imu...).
Built from primitives and modifiers only. Run in Blender; see docs/ART_PIPELINE.md.
"""
import importlib
import math
import os
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common  # noqa: E402

importlib.reload(common)
C = common

FOOT = 0.4572             # 18 in, ROBOT_CM in src/sim/field.ts
CELL = 1.6 * FOOT         # one sprite cell, in metres
CELL_PX = 192             # at 2x; the 1x sheet is half
STATES = [(False, False), (False, True), (True, False), (True, True)]  # (arm raised, claw closed)


def put(obj, coll, parent=None):
    for c in obj.users_collection:
        c.objects.unlink(obj)
    coll.objects.link(obj)
    if parent:
        obj.parent = parent
    return obj


def box(coll, name, size, loc, mat, bev=0.003, parent=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = size
    bpy.ops.object.transform_apply(scale=True)
    obj.data.materials.append(mat)
    if bev:
        C.bevel(obj, bev)
    return put(obj, coll, parent)


def cyl(coll, name, radius, depth, loc, rot, mat, verts=32, bev=0.002, parent=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=radius, depth=depth, location=loc, rotation=rot)
    obj = bpy.context.active_object
    obj.name = name
    obj.data.materials.append(mat)
    C.smooth(obj)
    if bev:
        C.bevel(obj, bev)
    return put(obj, coll, parent)


def mats():
    return {
        "plate": C.material("suit", "suit", rough=0.5),
        "rail": C.material("space_wall", "space_wall", rough=0.4, metal=0.3),
        "dark": C.material("space_raised", "space_raised", rough=0.6),
        "hub": C.material("space_line", "space_line", rough=0.45, metal=0.2),
        "roller": C.material("rim", "rim", rough=0.7),
        "motor": C.material("line", "line", rough=0.35, metal=0.4),
        "arm": C.material("helmet", "helmet", rough=0.45),
        "claw": C.material("star", "star", rough=0.5),
        "chip": C.material("visor", "visor", rough=0.5),
        "lens": C.material("go", "go", rough=0.3, emit=0.6),
        "ink": C.material("space_ink", "space_ink", rough=0.6),
    }


def wheel(coll, m, name, x, y, hand):
    """A mecanum wheel: two side plates and nine rollers at 45 degrees to the axle.

    hand +1 puts the top roller along (1, -1) seen from above, -1 along (1, 1), which gives
    the usual X pattern: frontLeft and backRight one way, frontRight and backLeft the other."""
    r, width = 0.048, 0.038
    root = bpy.data.objects.new(name, None)
    coll.objects.link(root)
    root.location = (x, y, r)
    for side in (-1, 1):
        cyl(coll, f"{name}_plate", 0.036, 0.004, (side * width / 2, 0, 0), (0, math.pi / 2, 0), m["hub"], parent=root)
    cyl(coll, f"{name}_hub", 0.014, width + 0.006, (0, 0, 0), (0, math.pi / 2, 0), m["motor"], parent=root)
    n = 9
    for i in range(n):
        t = 2 * math.pi * i / n + math.pi / 2
        offset = Vector((0, 0.036 * math.cos(t), 0.036 * math.sin(t)))
        tangent = Vector((0, -math.sin(t), math.cos(t)))
        axis = (Vector((1, 0, 0)) + hand * tangent).normalized()
        bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, radius=1, location=offset)
        roller = bpy.context.active_object
        roller.name = f"{name}_roller"
        roller.scale = (0.0115, 0.0115, 0.026)
        roller.rotation_mode = "QUATERNION"
        roller.rotation_quaternion = axis.to_track_quat("Z", "X")
        roller.data.materials.append(m["roller"])
        C.smooth(roller)
        put(roller, coll, root)
    return root


def tank_wheel(coll, m, name, x, y):
    """A plain traction wheel: a tyre with ribs straight across it, so from above it reads
    as "rolls forwards only", where the mecanum rollers read as diagonal."""
    r, width = 0.05, 0.032
    root = bpy.data.objects.new(name, None)
    coll.objects.link(root)
    root.location = (x, y, r)
    cyl(coll, f"{name}_tyre", r, width, (0, 0, 0), (0, math.pi / 2, 0), m["roller"], verts=48, bev=0.006, parent=root)
    cyl(coll, f"{name}_hub", 0.022, width + 0.006, (0, 0, 0), (0, math.pi / 2, 0), m["hub"], parent=root)
    for i in range(16):
        t = 2 * math.pi * i / 16
        rib = box(coll, f"{name}_rib", (width * 0.9, 0.008, 0.004), (0, r * math.cos(t), r * math.sin(t)), m["hub"], bev=0, parent=root)
        rib.rotation_euler = (t - math.pi / 2, 0, 0)
    return root


def build_robot(scene, parent_coll, arm_up, claw_closed, kind="mecanum"):
    m = mats()
    coll = C.collection(scene, f"{kind}_arm{'Up' if arm_up else 'Down'}_claw{'Closed' if claw_closed else 'Open'}", parent_coll)
    half = FOOT / 2

    # Chassis: two side rails, a deck plate, a rear battery and the Control Hub (with the imu).
    for side, label in ((-1, "left"), (1, "right")):
        box(coll, f"chassis_rail_{label}", (0.026, FOOT - 0.03, 0.04), (side * 0.155, 0, 0.055), m["rail"])
    box(coll, "chassis_deck", (0.30, FOOT - 0.07, 0.008), (0, -0.005, 0.079), m["plate"], bev=0.006)
    box(coll, "chassis_front_bumper", (0.30, 0.022, 0.03), (0, half - 0.03, 0.06), m["dark"])
    box(coll, "battery", (0.13, 0.06, 0.035), (0, -half + 0.075, 0.1), m["dark"])
    box(coll, "controlHub", (0.11, 0.105, 0.022), (-0.045, -0.035, 0.094), m["dark"], bev=0.004)
    box(coll, "imu", (0.03, 0.03, 0.006), (-0.045, -0.035, 0.108), m["chip"], bev=0.001)
    box(coll, "expansionHub", (0.09, 0.07, 0.018), (0.07, -0.04, 0.092), m["dark"], bev=0.004)

    # Drive: a motor behind each wheel, named as the code names it.
    wx, wy = half - 0.026, half - 0.085
    if kind == "tank":
        for name, x in (("leftDrive", -wx), ("rightDrive", wx)):
            tank_wheel(coll, m, f"{name}_wheel", x, 0)
            cyl(coll, name, 0.018, 0.075, ((-1 if x < 0 else 1) * 0.105, 0, 0.05), (0, math.pi / 2, 0), m["motor"])
    else:
        for name, x, y, hand in (("frontLeft", -wx, wy, 1), ("frontRight", wx, wy, -1),
                                 ("backLeft", -wx, -wy, -1), ("backRight", wx, -wy, 1)):
            wheel(coll, m, f"{name}_wheel", x, y, hand)
            side = -1 if x < 0 else 1
            cyl(coll, name, 0.018, 0.075, (side * 0.105, y, 0.048), (0, math.pi / 2, 0), m["motor"])

    # Sensors: distanceSensor on the front bumper, colorSensor under the front right corner.
    box(coll, "distanceSensor", (0.04, 0.014, 0.02), (-0.07, half - 0.015, 0.075), m["dark"], bev=0.002)
    cyl(coll, "distanceSensor_lens", 0.005, 0.004, (-0.07, half - 0.008, 0.075), (math.pi / 2, 0, 0), m["lens"], bev=0)
    box(coll, "colorSensor", (0.03, 0.03, 0.012), (0.11, half - 0.06, 0.03), m["dark"], bev=0.002)

    # The arm: armMotor turns it about a cross axle near the front; down reaches past the
    # bumper to the floor, raised lifts the claw up over the deck.
    pivot_y, pivot_z, arm_len = 0.08, 0.13, 0.2
    cyl(coll, "armMotor", 0.02, 0.07, (0.075, pivot_y, pivot_z), (0, math.pi / 2, 0), m["motor"])
    for side in (-1, 1):
        box(coll, "arm_tower", (0.012, 0.04, pivot_z - 0.08), (side * 0.03, pivot_y, (pivot_z + 0.08) / 2), m["rail"], bev=0.002)
    pivot = bpy.data.objects.new("arm", None)
    coll.objects.link(pivot)
    pivot.location = (0, pivot_y, pivot_z)
    pivot.rotation_euler = (math.radians(68 if arm_up else -28), 0, 0)
    cyl(coll, "arm_axle", 0.007, 0.08, (0, 0, 0), (0, math.pi / 2, 0), m["motor"], parent=pivot)
    for side in (-1, 1):
        box(coll, "arm_bar", (0.012, arm_len, 0.018), (side * 0.022, arm_len / 2, 0), m["arm"], parent=pivot)
    box(coll, "arm_cross", (0.056, 0.014, 0.014), (0, arm_len * 0.55, 0), m["arm"], parent=pivot)

    # The claw: clawServo at the arm's end and two yellow fingers, open or closed. The claw
    # stays level with the floor whatever the arm does, so it reads the same from above.
    claw = bpy.data.objects.new("claw", None)
    coll.objects.link(claw)
    claw.parent = pivot
    claw.location = (0, arm_len, 0)
    claw.rotation_euler = (-pivot.rotation_euler.x, 0, 0)
    box(coll, "clawServo", (0.05, 0.026, 0.024), (0, 0.006, 0), m["dark"], bev=0.003, parent=claw)
    spread = 0.014 if claw_closed else 0.03
    turn = 0 if claw_closed else math.radians(24)
    for side in (-1, 1):
        finger = bpy.data.objects.new("clawServo_finger", None)
        coll.objects.link(finger)
        finger.parent = claw
        finger.location = (side * spread, 0.016, 0)
        finger.rotation_euler = (0, 0, -side * turn)
        box(coll, "clawServo_finger_bar", (0.01, 0.05, 0.016), (0, 0.025, 0), m["claw"], bev=0.002, parent=finger)
        box(coll, "clawServo_finger_tip", (0.016, 0.01, 0.016), (-side * 0.004, 0.048, 0), m["claw"], bev=0.002, parent=finger)
    return coll


def main(render=True, kinds=("mecanum", "tank")):
    for kind in kinds:
        scene = C.fresh_scene(f"nebula_robot_{kind}")
        C.setup_render(scene, CELL_PX * 8, CELL_PX * 4, samples=64)
        C.soft_light(scene)
        C.top_camera(scene, CELL * 8)
        C.shadow_catcher(scene, size=30)

        parts = C.collection(scene, f"{kind}_parts")
        for row, (arm_up, claw_closed) in enumerate(STATES):
            src = build_robot(scene, parts, arm_up, claw_closed, kind)
            for k in range(8):
                inst = bpy.data.objects.new(f"{kind}_r{row}_h{k * 45}", None)
                inst.instance_type = "COLLECTION"
                inst.instance_collection = src
                inst.location = ((k - 3.5) * CELL, (1.5 - row) * CELL, 0)
                inst.rotation_euler = (0, 0, math.radians(k * 45))
                scene.collection.objects.link(inst)
        scene.view_layers[0].layer_collection.children[f"{kind}_parts"].exclude = True

        if render:
            C.render(scene, f"robot-{kind}")
            C.save_blend(scene, f"robot-{kind}")


if __name__ == "__main__":
    main()
