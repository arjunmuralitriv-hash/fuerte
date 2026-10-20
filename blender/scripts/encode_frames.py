"""Encode a rendered film cut (PNG frames from build_film.py) to the AVIF sequence the website's scroll-film player loads.

  python -P blender/scripts/encode_frames.py <png dir> <public dir> <width> <height> <quality>

Frames are renumbered 0000, 0001, ... in film order (the render keeps every 3rd frame plus each beat's composed frame,
so the player's manifest lists beats by position in this sequence: lib/film.ts). Prints the total weight, which the
plan budgets at about 5-10 MB per desktop cut and 3-5 MB per phone cut.
"""
import pathlib
import sys

from PIL import Image

src, dst = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
size, quality = (int(sys.argv[3]), int(sys.argv[4])), int(sys.argv[5])
dst.mkdir(parents=True, exist_ok=True)
frames = sorted(src.glob("film_*.png"))
total = 0
for i, f in enumerate(frames):
    out = dst / f"{i:04d}.avif"
    Image.open(f).convert("RGB").resize(size, Image.LANCZOS).save(out, quality=quality, speed=4)
    total += out.stat().st_size
print(f"{len(frames)} frames, {total / 1e6:.1f} MB, {total / len(frames) / 1e3:.0f} KB average")
