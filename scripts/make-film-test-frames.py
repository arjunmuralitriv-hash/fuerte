"""Writes numbered AVIF test frames to public/film-test/{landscape,portrait} for the /dev/film player page."""
import colorsys
import pathlib
import sys

from PIL import Image, ImageDraw, ImageFont

COUNT = 192
OUT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "public/film-test")
font = ImageFont.truetype("arial.ttf", 120)

for name, size in (("landscape", (1600, 900)), ("portrait", (810, 1440))):
    folder = OUT / name
    folder.mkdir(parents=True, exist_ok=True)
    w, h = size
    for i in range(COUNT):
        t = i / (COUNT - 1)
        r, g, b = (int(c * 255) for c in colorsys.hsv_to_rgb(t * 0.8, 0.65, 0.45))
        img = Image.new("RGB", size, (r, g, b))
        d = ImageDraw.Draw(img)
        # A disc sweeping across and a horizon band, so motion and direction are obvious while scrubbing.
        cx = int(w * (0.1 + 0.8 * t))
        d.ellipse((cx - 90, h * 0.3 - 90, cx + 90, h * 0.3 + 90), fill=(255, 90, 60))
        d.rectangle((0, int(h * 0.62), w, int(h * 0.64)), fill=(255, 255, 255))
        d.text((w * 0.06, h * 0.06), f"{i:04d}", font=font, fill=(255, 255, 255))
        img.save(folder / f"{i:04d}.avif", quality=50)
print("wrote", COUNT * 2, "frames to", OUT)
