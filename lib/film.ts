import { existsSync } from "node:fs";
import { join } from "node:path";

import type { FilmFormat, FilmManifest } from "@/components/sections/scroll-film";

/**
 * The home page film (docs/film-plan.md), rendered by blender/scripts/build_film.py and encoded by encode_frames.py
 * into public/film/<theme>/<format>/. Light theme = dusk cut, dark theme = night cut; Arabic pages on wide screens use
 * the landscape-rtl cut (subject on the left, clear of the right-hand copy). Each cut has an idle loop per beat
 * (loop-N.mp4, rendered by build_film.py --loop) that plays while the visitor rests on that beat.
 *
 * The v2 render has every film frame (528). While it is still being rendered, a cut whose v2 frames are not encoded yet
 * still holds the v1 render (every 3rd frame plus the beats: 180), so each cut is detected by its last v2 frame. Called
 * per render: in dev each finished cut switches over on the next page load.
 */
const V1 = { count: 180, beats: [0, 47, 73, 100, 127, 156, 179], version: undefined };
const V2 = { count: 528, beats: [0, 139, 214, 294, 374, 459, 527], version: "2" };

const cut = (theme: "light" | "dark", format: "landscape" | "landscape-rtl" | "portrait"): FilmFormat => {
  const path = `/film/${theme}/${format}/`;
  const v = existsSync(join(process.cwd(), "public", path, "0527.avif")) ? V2 : V1;
  return { path, ext: "avif", loops: true, ...v };
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
