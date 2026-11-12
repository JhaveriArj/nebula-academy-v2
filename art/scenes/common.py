"""Shared look for every Nebula Academy render: palette, materials, light, camera, output.

Run from Blender (Scripting tab > Open > Run Script) through one of the scene scripts next
to this file. Nothing here touches files outside art/ or the network. docs/ART_PIPELINE.md.
"""
import math
import os

import bpy

ART = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # .../art
RENDERS = os.path.join(ART, "renders")
BLEND = os.path.join(ART, "blend")

# Copied from src/ui/theme.css (Blender cannot read it). tests/art.test.ts checks each value
# is still in theme.css, so a palette change there is caught here.
PALETTE = {
    "space": "#0B0A3A",          # --space
    "space_raised": "#17145A",   # --space-raised
    "space_line": "#2E2A78",     # --space-line
    "space_wall": "#4C468F",     # --space-wall
    "space_mute": "#B3ACD6",     # --space-mute
    "space_ink": "#ECE8FA",      # --space-ink
    "star": "#FEBC02",           # --star
    "line": "#06063D",           # --mascot-line
    "helmet": "#5351F9",         # --mascot-helmet
    "visor": "#A08DC9",          # --mascot-visor
    "rim": "#C3B9E3",            # --mascot-rim
    "eye": "#8061C3",            # --mascot-eye
    "suit": "#553B8C",           # --mascot-suit
    "hand": "#DDA8DB",           # --mascot-hand
    "badge": "#C66BC2",          # --mascot-badge
    "go": "#5FD4BE",             # --space-go
}


def linear(hex_color):
    """sRGB hex to the linear RGBA Blender's shader inputs expect."""
    h = hex_color.lstrip("#")
    out = []
    for i in (0, 2, 4):
        c = int(h[i:i + 2], 16) / 255
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return (*out, 1.0)


def material(name, color, rough=0.55, metal=0.0, emit=0.0):
    """A Principled material in a palette colour, reused if it already exists."""
    key = f"nb_{name}"
    mat = bpy.data.materials.get(key) or bpy.data.materials.new(key)
    mat.use_nodes = True
    bsdf = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    rgba = linear(PALETTE.get(color, color) if not color.startswith("#") else color)
    bsdf.inputs["Base Color"].default_value = rgba
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    for key_in in ("Emission Color", "Emission"):
        if key_in in bsdf.inputs and bsdf.inputs[key_in].type == "RGBA":
            bsdf.inputs[key_in].default_value = rgba
            break
    if "Emission Strength" in bsdf.inputs:
        bsdf.inputs["Emission Strength"].default_value = emit
    mat.diffuse_color = rgba
    return mat


def fresh_scene(name):
    """A new empty scene called `name`, replacing an earlier build of the same scene only."""
    old = bpy.data.scenes.get(name)
    if old:
        for obj in list(old.objects):
            bpy.data.objects.remove(obj, do_unlink=True)
        for coll in list(old.collection.children_recursive):
            bpy.data.collections.remove(coll)
        bpy.data.scenes.remove(old)
    scene = bpy.data.scenes.new(name)
    bpy.context.window.scene = scene
    return scene


def collection(scene, name, parent=None):
    coll = bpy.data.collections.new(name)
    (parent or scene.collection).children.link(coll)
    return coll


def setup_render(scene, width, height, samples=96):
    """Cycles, transparent background, palette-true colour (Standard, not AgX)."""
    try:
        scene.render.engine = "CYCLES"
    except TypeError as err:
        print("Cycles unavailable:", err)
    if scene.render.engine == "CYCLES":
        scene.cycles.samples = samples
        scene.cycles.use_denoising = True
        scene.cycles.max_bounces = 6
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    try:
        scene.view_settings.view_transform = "Standard"
    except TypeError as err:
        print("Standard view transform unavailable:", err)
    scene.view_settings.look = "None"
    scene.view_settings.exposure = 0
    scene.view_settings.gamma = 1


def soft_light(scene, sun_strength=3.2, world_strength=0.9, elevation=65):
    """One soft sun from the top left (the page's light comes from there) and a navy fill.

    A sun, not an area light, so every copy of an object in a sheet is lit the same way."""
    w = bpy.data.worlds.new(f"{scene.name}_world")
    w.use_nodes = True
    bg = next(n for n in w.node_tree.nodes if n.type == "BACKGROUND")
    # The fill is the lavender rim, so shadows read violet, never black.
    bg.inputs["Color"].default_value = linear(PALETTE["rim"])
    bg.inputs["Strength"].default_value = world_strength
    scene.world = w

    data = bpy.data.lights.new(f"{scene.name}_sun", "SUN")
    data.energy = sun_strength
    data.angle = math.radians(18)  # soft edges
    sun = bpy.data.objects.new(f"{scene.name}_sun", data)
    # Light travels toward +x, -y: it comes from the top left of the picture.
    sun.rotation_euler = (-math.radians(90 - elevation), 0, math.radians(45))
    scene.collection.objects.link(sun)
    return sun


def camera(scene, location, rotation, ortho_scale):
    data = bpy.data.cameras.new(f"{scene.name}_cam")
    data.type = "ORTHO"
    data.ortho_scale = ortho_scale
    data.clip_end = 100
    cam = bpy.data.objects.new(f"{scene.name}_cam", data)
    cam.location = location
    cam.rotation_euler = rotation
    scene.collection.objects.link(cam)
    scene.camera = cam
    return cam


def top_camera(scene, ortho_scale, x=0.0, y=0.0):
    """Straight down, image up = world +Y = the robot's forward."""
    return camera(scene, (x, y, 10), (0, 0, 0), ortho_scale)


def iso_camera(scene, ortho_scale, target=(0, 0, 0), distance=10):
    """True isometric: 35.264 degrees down, 45 degrees round."""
    tilt = math.radians(90 - 35.264)
    turn = math.radians(45)
    tx, ty, tz = target
    loc = (tx + distance * math.sin(tilt) * math.sin(turn),
           ty - distance * math.sin(tilt) * math.cos(turn),
           tz + distance * math.cos(tilt))
    return camera(scene, loc, (tilt, 0, turn), ortho_scale)


def shadow_catcher(scene, size=20, z=0.0):
    """An invisible floor that keeps only the shadows, so renders sit on any background."""
    bpy.ops.mesh.primitive_plane_add(size=size, location=(0, 0, z))
    plane = bpy.context.active_object
    plane.name = f"{scene.name}_shadow_catcher"
    plane.is_shadow_catcher = True
    return plane


def render(scene, name):
    path = os.path.join(RENDERS, f"{name}.png")
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True, scene=scene.name)
    if scene.render.film_transparent:
        clean_alpha(path)
    print("rendered", path)
    return path


def clean_alpha(path, floor=0.05):
    """Zero the faint alpha speckle the denoiser leaves in empty space. Without this the
    "transparent" background is 97% barely-there pixels and the WebP doubles in size."""
    import numpy as np

    img = bpy.data.images.load(path, check_existing=False)
    px = np.empty(len(img.pixels), dtype=np.float32)
    img.pixels.foreach_get(px)
    px = px.reshape(-1, 4)
    px[px[:, 3] < floor] = 0
    img.pixels.foreach_set(px.ravel())
    img.filepath_raw = path
    img.file_format = "PNG"
    img.save()
    bpy.data.images.remove(img)


def save_blend(scene, name):
    """Write only this scene (and what it uses) to art/blend/<name>.blend."""
    path = os.path.join(BLEND, f"{name}.blend")
    bpy.data.libraries.write(path, {scene}, path_remap="NONE", compress=True)
    print("saved", path, os.path.getsize(path), "bytes")
    return path


def bevel(obj, width=0.004, segments=3):
    mod = obj.modifiers.new("bevel", "BEVEL")
    mod.width = width
    mod.segments = segments
    mod.limit_method = "ANGLE"
    return mod


def smooth(obj):
    for poly in obj.data.polygons:
        poly.use_smooth = True
