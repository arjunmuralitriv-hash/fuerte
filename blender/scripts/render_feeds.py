"""CCTV-style stills for the control room's video wall, rendered from the film's own scene: office floors, the lobby,
the plaza. Each view is a high corner camera like a real CCTV install.

Run on a .blend built by build_film.py:
  blender --background <film.blend> --python render_feeds.py -- <out dir>
Then label them with label_feeds.py and keep them in blender/assets/feeds/.
"""
import math
import pathlib
import sys

import bpy
from mathutils import Vector

FLOOR_H = 4.2
VIEWS = {  # name: (camera, look-at)
    "office_l10": ((-17.5, -16.5, 10 * FLOOR_H + 3.3), (6, 6, 10 * FLOOR_H + 0.4)),
    "office_l27": ((16.5, -16.0, 27 * FLOOR_H + 3.3), (-6, 7, 27 * FLOOR_H + 0.4)),
    "office_l41": ((-16.0, 15.5, 41 * FLOOR_H + 3.2), (6, -6, 41 * FLOOR_H + 0.4)),
    "lobby_gates": ((12.0, -20.5, 3.7), (-2, -13, 0.8)),
    "lobby_entry": ((-13.0, -12.0, 3.7), (4, -20, 0.6)),
    "plaza": ((32.0, -38.0, 7.5), (0, -24, 1.0)),
}

out = pathlib.Path(sys.argv[sys.argv.index("--") + 1])
out.mkdir(parents=True, exist_ok=True)
sc = bpy.context.scene
sc.frame_set(295)
# Real CCTV sees the building, not our data visualisation: hide the fibre, data lines and device highlights.
for ob in sc.objects:
    if ob.name.startswith(("fibre_spine", "device_lines", "device_cabling", "tray_fibre", "device_highlights", "aisle_guides")):
        ob.animation_data_clear()  # visibility may be keyframed (visible_between)
        ob.hide_render = True
sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = 640, 360, 100
sc.cycles.samples = 32
sc.render.image_settings.file_format = "PNG"
cam_data = bpy.data.cameras.new("cctv")
cam_data.lens = 14  # wide CCTV lens
cam = bpy.data.objects.new("cctv", cam_data)
sc.collection.objects.link(cam)
sc.camera = cam
for name, (loc, look) in VIEWS.items():
    cam.location = loc
    d = Vector(look) - Vector(loc)
    cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    sc.render.filepath = str(out / f"{name}.png")
    bpy.ops.render.render(write_still=True)
    print("FEED", name, flush=True)
