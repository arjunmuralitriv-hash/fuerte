import { existsSync, statSync } from "node:fs";
import { join } from "node:path";

import type { FilmFormat, FilmManifest } from "@/components/sections/scroll-film";

/**
 * The home page film (docs/film-plan.md), rendered by blender/scripts/build_film.py and encoded by encode_frames.py
 * into public/film/<theme>/<format>/. Light theme = dusk cut, dark theme = night cut; Arabic pages on wide screens use
 * the landscape-rtl cut (subject on the left, clear of the right-hand copy). Each cut is also encoded as one video
 * (public/film-video/<theme>-<format>.mp4), which the player scrubs in place of the frames. Each cut has an idle loop per beat
 * (loop-N.mp4, rendered by build_film.py --loop) that plays while the visitor rests on that beat.
 *
 * The v2 render has every film frame (528). While it is still being rendered, a cut whose v2 frames are not encoded yet
 * still holds the v1 render (every 3rd frame plus the beats: 180), so each cut is detected by its last v2 frame. Called
 * per render: in dev each finished cut switches over on the next page load.
 */
const V1 = { count: 180, beats: [0, 47, 73, 100, 127, 156, 179], version: undefined, skip: undefined };
// Frame 187 is a one-frame white flash at the cut from the tower to the data centre, in every cut: the player skips it.
const V2 = { count: 528, beats: [0, 139, 214, 294, 374, 459, 527], version: "2", skip: [187] };
const REST_FRAMES = [95, 195, 274, 339, 397, 491]; // film frames 96, 196, 275, 340, 398, 492 (build_film.py MIDS)

const cut = (theme: "light" | "dark", format: "landscape" | "landscape-rtl" | "portrait"): FilmFormat => {
  const path = `/film/${theme}/${format}/`;
  const dir = join(process.cwd(), "public", path);
  const v = existsSync(join(dir, "0527.avif")) ? V2 : V1;
  // Idle loops only once they are rendered (all seven, loop-0 … loop-6), so the player never requests a missing file.
  const loops = [0, 1, 2, 3, 4, 5, 6].every((n) => existsSync(join(dir, `loop-${n}.mp4`)));
  // Rest points between beats (build_film.py MIDS, as frame positions), once all six of their loops are rendered.
  const rests = v === V2 && loops && [0, 1, 2, 3, 4, 5].every((n) => existsSync(join(dir, `loop-m${n}.mp4`))) ? REST_FRAMES : undefined;
  // The cut as one video (scripts/encode_film_video.py), scrubbed instead of the frames when present: H.264 for every
  // browser, and AV1 and HEVC, sharper at the same size, for devices that decode them in hardware. Each file's size is
  // its cache key, so a re-encode is never served from the browser cache.
  const videoFile = (suffix: string) => {
    const file = join(process.cwd(), "public", "film-video", `${theme}-${format}${suffix}`);
    return existsSync(file) ? `/film-video/${theme}-${format}${suffix}?v=${statSync(file).size}` : undefined;
  };
  return { path, ext: "avif", loops, video: videoFile(".mp4"), av1: videoFile(".av1.mp4"), hevc: videoFile(".hevc.mp4"), rests, ...v };
};

export function homeFilm(): FilmManifest {
  return {
    beats: V2.beats,
    themes: {
      light: { landscape: cut("light", "landscape"), landscapeRtl: cut("light", "landscape-rtl"), portrait: cut("light", "portrait") },
      dark: { landscape: cut("dark", "landscape"), landscapeRtl: cut("dark", "landscape-rtl"), portrait: cut("dark", "portrait") },
    },
  };
}
