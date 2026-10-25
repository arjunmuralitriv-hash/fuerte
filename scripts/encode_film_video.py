"""Encode each film cut's frames into one H.264 video for scroll scrubbing (docs/film-plan.md).

Reads public/film/<theme>/<format>/0000.avif ... (or any folder of numbered frames Pillow can open, e.g. the
lossless renders: --src) and writes public/film-video/<theme>-<format>.mp4, which the site then scrubs in place of the
frames (lib/film.ts). Re-run it whenever a cut's frames change.

Scrubbing jumps to any frame, forwards or backwards, so the encode favours seeking over size: a keyframe every
GOP frames and no B-frames, so a seek decodes at most GOP-1 frames. H.264 because every browser, iOS included, decodes it
in hardware. The video only shows while the film moves (at rest the 1080p idle loop plays over it), so it is scaled to
SHORT px on its short side: about 2.5x lighter than 1080p, softness hidden by the motion, and each seek decodes faster.

  python3 scripts/encode_film_video.py                 # every cut
  python3 scripts/encode_film_video.py dark/portrait   # one cut
  python3 scripts/encode_film_video.py dark/portrait --src ~/renders/dark/portrait
Needs ffmpeg (with libx264) and Pillow 11.2 or later (AVIF support).
"""

import argparse
import glob
import subprocess
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
CUTS = [f"{t}/{f}" for t in ("light", "dark") for f in ("landscape", "landscape-rtl", "portrait")]
CRF = 30
GOP = 8
SHORT = 720


def encode(cut: str, src: Path) -> None:
    frames = sorted(f for f in glob.glob(str(src / "[0-9][0-9][0-9][0-9].*")))
    if not frames:
        raise SystemExit(f"no frames in {src}")
    w, h = Image.open(frames[0]).size
    out = ROOT / "public" / "film-video" / f"{cut.replace('/', '-')}.mp4"
    out.parent.mkdir(exist_ok=True)
    scale = f"scale=-2:{SHORT}:flags=lanczos" if w > h else f"scale={SHORT}:-2:flags=lanczos"
    ffmpeg = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{w}x{h}", "-framerate", "30", "-i", "-",
         "-vf", scale, "-c:v", "libx264", "-preset", "slow", "-crf", str(CRF), "-g", str(GOP), "-bf", "0", "-pix_fmt", "yuv420p",
         "-movflags", "+faststart", "-an", str(out)],
        stdin=subprocess.PIPE,
    )
    for f in frames:
        ffmpeg.stdin.write(Image.open(f).convert("RGB").tobytes())
    ffmpeg.stdin.close()
    if ffmpeg.wait():
        raise SystemExit(f"ffmpeg failed on {cut}")
    print(f"{out.relative_to(ROOT)}: {len(frames)} frames, {out.stat().st_size / 1e6:.1f} MB")


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("cuts", nargs="*", default=CUTS, help="e.g. dark/portrait (default: every cut)")
    p.add_argument("--src", type=Path, help="frame folder for a single cut (default: public/film/<cut>)")
    a = p.parse_args()
    if a.src and len(a.cuts) != 1:
        raise SystemExit("--src takes exactly one cut")
    for cut in a.cuts:
        encode(cut, a.src or ROOT / "public" / "film" / cut)


if __name__ == "__main__":
    main()
