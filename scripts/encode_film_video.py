"""Encode each film cut into the videos the site scrubs on scroll (docs/film-plan.md).

Reads the lossless renders (blender/build/full/<theme>_<format>/film_0001.png ...), or, without them, the site's
stills (public/film/<theme>/<format>/0000.avif ...), and writes three 1080p videos of the cut to public/film-video/:
<theme>-<format>.av1.mp4, .hevc.mp4 and .mp4 (H.264). The player picks AV1 or HEVC where the device decodes it in
hardware (sharper at the same size), else H.264, which every browser plays (lib/film.ts, scroll-film.tsx). Re-run it
whenever a cut's frames change.

Scrubbing jumps to any frame, forwards or backwards, so the encode favours seeking over size: a keyframe every GOP
frames, so a seek decodes at most GOP-1 frames, which hardware decoders do in a few milliseconds. 1080p because the
video shows whenever the film moves: at 720p it went visibly soft next to the 1080p idle loop that plays at rest.

  python3 scripts/encode_film_video.py                       # every cut, every codec
  python3 scripts/encode_film_video.py dark/portrait         # one cut
  python3 scripts/encode_film_video.py dark/portrait --codec hevc
Needs an ffmpeg with libsvtav1, libx265 and libx264 (FFMPEG=path/to/ffmpeg to choose one), and Pillow 11.2 or later
(AVIF) when encoding from the stills.
"""

import argparse
import glob
import os
import subprocess
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
CUTS = [f"{t}/{f}" for t in ("light", "dark") for f in ("landscape", "landscape-rtl", "portrait")]
FFMPEG = os.environ.get("FFMPEG", "ffmpeg")
GOP = 16
# Quality per codec, about equal sharpness at 10-12 MB a cut (SSIM 0.95-0.96 against the lossless render; the old
# 720p H.264 scored 0.93). Suffix of the output file, encoder arguments.
CODECS = {
    "av1": (".av1.mp4", ["-c:v", "libsvtav1", "-preset", "5", "-crf", "42", "-svtav1-params", "scd=0:enable-tf=0"]),
    "hevc": (".hevc.mp4", ["-c:v", "libx265", "-preset", "slow", "-crf", "30", "-tag:v", "hvc1",
                           "-x265-params", f"keyint={GOP}:min-keyint={GOP}:bframes=3:scenecut=0:log-level=error"]),
    "h264": (".mp4", ["-c:v", "libx264", "-preset", "slow", "-crf", "30", "-keyint_min", str(GOP), "-sc_threshold", "0"]),
}


def encode(cut: str, codec: str) -> None:
    suffix, args = CODECS[codec]
    out = ROOT / "public" / "film-video" / f"{cut.replace('/', '-')}{suffix}"
    out.parent.mkdir(exist_ok=True)
    tail = [*args, "-g", str(GOP), "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", str(out)]
    renders = ROOT / "blender" / "build" / "full" / cut.replace("/", "_")
    if (renders / "film_0001.png").exists():
        subprocess.run([FFMPEG, "-v", "error", "-y", "-framerate", "30", "-start_number", "1", "-i", str(renders / "film_%04d.png"), *tail],
                       check=True)
        source = "renders"
    else:
        frames = sorted(glob.glob(str(ROOT / "public" / "film" / cut / "[0-9][0-9][0-9][0-9].avif")))
        if not frames:
            raise SystemExit(f"no frames for {cut}")
        w, h = Image.open(frames[0]).size
        ffmpeg = subprocess.Popen([FFMPEG, "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{w}x{h}", "-framerate", "30",
                                   "-i", "-", *tail], stdin=subprocess.PIPE)
        for f in frames:
            ffmpeg.stdin.write(Image.open(f).convert("RGB").tobytes())
        ffmpeg.stdin.close()
        if ffmpeg.wait():
            raise SystemExit(f"ffmpeg failed on {cut}")
        source = "stills"
    print(f"{out.relative_to(ROOT)}: from {source}, {out.stat().st_size / 1e6:.1f} MB")


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("cuts", nargs="*", default=CUTS, help="e.g. dark/portrait (default: every cut)")
    p.add_argument("--codec", choices=[*CODECS], action="append", help="default: every codec")
    a = p.parse_args()
    for cut in a.cuts:
        for codec in a.codec or CODECS:
            encode(cut, codec)


if __name__ == "__main__":
    main()
