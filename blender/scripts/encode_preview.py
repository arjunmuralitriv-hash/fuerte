"""Encode a rendered PNG sequence to an H.264 MP4 for review, using Blender's own FFmpeg (no system ffmpeg needed).

  blender --background --factory-startup --disable-autoexec --python encode_preview.py -- <frames dir> <prefix> <out.mp4> [fps]
"""
import pathlib
import sys

import bpy

args = sys.argv[sys.argv.index("--") + 1 :]
frames = sorted(pathlib.Path(args[0]).glob(f"{args[1]}*.png"))
out, fps = pathlib.Path(args[2]), int(args[3]) if len(args) > 3 else 24

scene = bpy.context.scene
seq = scene.sequence_editor_create()
strip = seq.strips.new_image("film", str(frames[0]), channel=1, frame_start=1)
for f in frames[1:]:
    strip.elements.append(f.name)
img = bpy.data.images.load(str(frames[0]))
scene.render.resolution_x, scene.render.resolution_y = img.size
scene.render.resolution_percentage = 100
scene.render.fps = fps
scene.frame_start, scene.frame_end = 1, len(frames)
r = scene.render.image_settings
r.media_type = "VIDEO"
r.file_format = "FFMPEG"
scene.render.ffmpeg.format = "MPEG4"
scene.render.ffmpeg.codec = "H264"
scene.render.ffmpeg.constant_rate_factor = "HIGH"
scene.view_settings.view_transform = "Standard"  # frames are already display-referred
scene.render.filepath = str(out)
bpy.ops.render.render(animation=True)
print("ENCODED", out, len(frames), "frames", flush=True)
