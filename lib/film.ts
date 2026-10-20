import type { FilmFormat, FilmManifest } from "@/components/sections/scroll-film";

/**
 * The home page film (Fuerte-3D-Film-Plan.md), rendered by blender/scripts/build_film.py and encoded by encode_frames.py
 * into public/film/<theme>/<format>/. Each cut keeps every 3rd frame of the 528-frame film plus each beat's composed
 * frame: 180 frames, with the beats at these positions. Light theme = dusk cut, dark theme = night cut; Arabic pages on
 * wide screens use the landscape-rtl cut (subject on the left, clear of the right-hand copy).
 */
const COUNT = 180;
const cut = (theme: "light" | "dark", format: "landscape" | "landscape-rtl" | "portrait"): FilmFormat => ({ path: `/film/${theme}/${format}/`, ext: "avif", count: COUNT });

export const HOME_FILM: FilmManifest = {
  beats: [0, 47, 73, 100, 127, 156, 179],
  themes: {
    light: { landscape: cut("light", "landscape"), landscapeRtl: cut("light", "landscape-rtl"), portrait: cut("light", "portrait") },
    dark: { landscape: cut("dark", "landscape"), landscapeRtl: cut("dark", "landscape-rtl"), portrait: cut("dark", "portrait") },
  },
};
