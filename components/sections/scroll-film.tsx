"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { preload } from "react-dom";

export type FilmFormat = { path: string; ext: string; count: number };
/**
 * 16:9 for wide screens, 9:16 rendered separately for phones (framed for the copy at the bottom). Wide screens on RTL
 * pages use landscapeRtl when given: the same film composed with the subject on the left, clear of the copy.
 */
export type FilmFormats = { landscape: FilmFormat; landscapeRtl?: FilmFormat; portrait: FilmFormat };
export type FilmManifest = {
  /** Frame shown when data-beat section N is centred in the viewport; one entry per beat. */
  beats: number[];
  /** The scene follows the site theme (design system): a dusk film for light, a night film for dark. */
  themes: { light: FilmFormats; dark: FilmFormats };
};

type Theme = keyof FilmManifest["themes"];

/** The theme next-themes has applied (a class on <html>), updated when the visitor switches it. */
function useSiteTheme(): Theme {
  return useSyncExternalStore(
    (onChange) => {
      const observer = new MutationObserver(onChange);
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
      return () => observer.disconnect();
    },
    () => (document.documentElement.classList.contains("dark") ? "dark" : "light"),
    () => "dark",
  );
}

const MAX_DPR = 2;
const CONCURRENCY = 6;
const EASE = 0.16; // Per-frame easing toward the scroll target: smooths wheel steps without lag.

/** The cut for this screen and page direction (client only). */
function pick(formats: FilmFormats): FilmFormat {
  if (innerHeight > innerWidth) return formats.portrait;
  return document.documentElement.dir === "rtl" && formats.landscapeRtl ? formats.landscapeRtl : formats.landscape;
}

const frameUrl = (f: FilmFormat, i: number) => `${f.path}${String(i).padStart(4, "0")}.${f.ext}`;

/** Beat frames first (every beat paints early), then coarse-to-fine strides, so any scroll position has a near frame. */
function loadOrder(count: number, beats: number[]) {
  const order = new Set(beats);
  for (const stride of [16, 8, 4, 2, 1]) for (let i = 0; i < count; i += stride) order.add(i);
  return [...order];
}

/**
 * Pre-rendered film scrubbed by scroll (Fuerte-3D-Film-Plan.md). Fixed behind the page like the 3D scene and
 * driven by the same data-beat contract: the film sits on manifest.beats[N] when section N is centred.
 * Reduced motion and Save-Data load and show only the beat stills. Signals "fuerte:scene-ready" for Reveal.
 */
export function ScrollFilm({ manifest, className }: { manifest: FilmManifest; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const theme = useSiteTheme();
  if (typeof window !== "undefined") preload(frameUrl(pick(manifest.themes[theme]), manifest.beats[0]), { as: "image", fetchPriority: "high" });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const root = document.documentElement;
    const format = pick(manifest.themes[theme]);
    const stills =
      matchMedia("(prefers-reduced-motion: reduce)").matches || (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
    const frames: (HTMLImageElement | undefined)[] = new Array(format.count);
    const sections = [...document.querySelectorAll<HTMLElement>("[data-beat]")].sort((a, b) => Number(a.dataset.beat) - Number(b.dataset.beat));
    let disposed = false;
    let raf = 0;
    let current = -1;
    let drawn = -1;

    // Load frames with a small concurrency limit, decoding each before it can be drawn (no decode jank on scrub).
    const queue = stills ? [...manifest.beats] : loadOrder(format.count, manifest.beats);
    const pump = () => {
      const i = queue.shift();
      if (i === undefined || disposed) return;
      const img = new Image();
      img.src = frameUrl(format, i);
      img
        .decode()
        .then(() => {
          if (disposed) return;
          frames[i] = img;
          schedule();
        })
        .catch(() => {})
        .finally(pump);
    };
    for (let k = 0; k < CONCURRENCY; k++) pump();

    // Scroll position as a continuous beat value: exactly N when section N's centre is at the viewport centre.
    const beatValue = () => {
      const mid = innerHeight / 2;
      const centres = sections.map((s) => {
        const r = s.getBoundingClientRect();
        return r.top + r.height / 2;
      });
      if (!centres.length || mid <= centres[0]) return 0;
      for (let i = 0; i < centres.length - 1; i++) {
        if (mid <= centres[i + 1]) return i + (mid - centres[i]) / (centres[i + 1] - centres[i]);
      }
      return centres.length - 1;
    };
    const frameFor = (beat: number) => {
      const b = manifest.beats;
      const i = Math.min(Math.floor(beat), b.length - 1);
      const next = b[Math.min(i + 1, b.length - 1)];
      return b[i] + (next - b[i]) * (beat - i);
    };
    const nearestLoaded = (i: number) => {
      for (let d = 0; d < format.count; d++) {
        if (frames[i - d]) return i - d;
        if (frames[i + d]) return i + d;
      }
      return -1;
    };

    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, MAX_DPR);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      drawn = -1;
      schedule();
    };

    // Cover-fit the frame to the canvas, like object-fit: cover.
    const draw = (i: number) => {
      const img = frames[i]!;
      const scale = Math.max(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
      const w = img.naturalWidth * scale;
      const h = img.naturalHeight * scale;
      ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
      drawn = i;
      if (!root.dataset.scene) {
        root.dataset.scene = stills ? "fallback" : "ready";
        window.dispatchEvent(new Event("fuerte:scene-ready"));
      }
    };

    const tick = () => {
      raf = 0;
      const beat = beatValue();
      const target = stills ? frameFor(Math.round(beat)) : frameFor(beat);
      current = current < 0 || stills ? target : current + (target - current) * EASE;
      const i = nearestLoaded(Math.round(current));
      if (i >= 0 && i !== drawn) draw(i);
      if (!stills && Math.abs(target - current) > 0.05) schedule();
    };
    function schedule() {
      if (!raf && !disposed) raf = requestAnimationFrame(tick);
    }

    resize();
    addEventListener("scroll", schedule, { passive: true });
    addEventListener("resize", resize);
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      removeEventListener("scroll", schedule);
      removeEventListener("resize", resize);
      delete root.dataset.scene;
    };
  }, [manifest, theme]);

  return <canvas ref={canvasRef} aria-hidden className={className ?? "pointer-events-none fixed inset-x-0 top-0 -z-10 h-lvh w-full"} />;
}
