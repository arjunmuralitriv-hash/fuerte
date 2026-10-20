"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { preload } from "react-dom";

/** A cut's frames are `${path}0000.${ext}` … ; with `loops`, each beat N also has a seamless idle loop at `${path}loop-N.mp4`;
 * `beats` overrides the manifest's beat positions for this cut; `version` is added to every URL so a re-render is never
 * served from the browser cache (frames are cached for a week). */
export type FilmFormat = { path: string; ext: string; count: number; loops?: boolean; beats?: number[]; version?: string };
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
const SETTLE_MS = 450; // Scroll stillness before a beat's idle loop takes over.

/** The cut for this screen and page direction (client only). */
function pick(formats: FilmFormats): FilmFormat {
  if (innerHeight > innerWidth) return formats.portrait;
  return document.documentElement.dir === "rtl" && formats.landscapeRtl ? formats.landscapeRtl : formats.landscape;
}

const bust = (f: FilmFormat) => (f.version ? `?v=${f.version}` : "");
const frameUrl = (f: FilmFormat, i: number) => `${f.path}${String(i).padStart(4, "0")}.${f.ext}${bust(f)}`;

/** Beat frames first (every beat paints early), then coarse-to-fine strides, so any scroll position has a near frame. */
function loadOrder(count: number, beats: number[]) {
  const order = new Set(beats);
  for (const stride of [16, 8, 4, 2, 1]) for (let i = 0; i < count; i += stride) order.add(i);
  return [...order];
}

const LAYER = "pointer-events-none fixed inset-x-0 top-0 -z-10 h-lvh w-full";

/**
 * Pre-rendered film scrubbed by scroll (docs/film-plan.md), fixed behind the page and driven by the data-beat
 * contract: the film sits on manifest.beats[N] when section N is centred. Between frames it blends the two nearest,
 * so transitions glide. When scrolling rests on a beat, that beat's idle loop (same first frame, effects running)
 * fades in over the canvas and plays until the visitor scrolls again. Reduced motion and Save-Data load only the beat
 * stills and no loops. Signals "fuerte:scene-ready" for Reveal.
 */
export function ScrollFilm({ manifest, className }: { manifest: FilmManifest; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const theme = useSiteTheme();
  if (typeof window !== "undefined") preload(frameUrl(pick(manifest.themes[theme]), manifest.beats[0]), { as: "image", fetchPriority: "high" });

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !video || !ctx) return;
    const root = document.documentElement;
    const format = pick(manifest.themes[theme]);
    const stills =
      matchMedia("(prefers-reduced-motion: reduce)").matches || (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
    const loops = format.loops && !stills;
    const frames: (HTMLImageElement | undefined)[] = new Array(format.count);
    const sections = [...document.querySelectorAll<HTMLElement>("[data-beat]")].sort((a, b) => Number(a.dataset.beat) - Number(b.dataset.beat));
    let disposed = false;
    let raf = 0;
    let current = -1;
    let drawn = -1;
    let settle = 0;
    let looping = -1; // beat whose loop is showing (or loading), -1 for none

    // Load frames with a small concurrency limit, decoding each before it can be drawn (no decode jank on scrub).
    const beats = format.beats ?? manifest.beats; // a cut may carry its own beat positions
    const queue = stills ? [...beats] : loadOrder(format.count, beats);
    const fetchFrame = (i: number) => {
      const img = new Image();
      img.src = frameUrl(format, i);
      return img
        .decode()
        .then(() => {
          if (disposed) return;
          frames[i] = img;
          drawn = -1;
          schedule();
        })
        .catch(() => {});
    };
    const pump = () => {
      const i = queue.shift();
      if (i === undefined || disposed) return;
      void fetchFrame(i).finally(pump);
    };
    // The opening frame (already preloaded) loads now; the rest wait until the page has loaded and the main thread is
    // idle, so the film never competes with the page's own resources.
    const startRest = () => {
      for (let k = 0; k < CONCURRENCY; k++) pump();
    };
    const whenIdle = () => ("requestIdleCallback" in window ? requestIdleCallback(startRest, { timeout: 2000 }) : setTimeout(startRest, 200));
    void fetchFrame(queue.shift()!);
    if (document.readyState === "complete") whenIdle();
    else addEventListener("load", whenIdle, { once: true });

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
      const b = beats;
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
      ctx.imageSmoothingQuality = "high";
      drawn = -1;
      schedule();
    };

    // Cover-fit a frame to the canvas, like object-fit: cover, at the given opacity.
    const paint = (img: HTMLImageElement, alpha: number) => {
      const scale = Math.max(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
      const w = img.naturalWidth * scale;
      const h = img.naturalHeight * scale;
      ctx.globalAlpha = alpha;
      ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
      ctx.globalAlpha = 1;
    };
    // Draw the film at a fractional position: the frame below, with the frame above blended in by the fraction.
    const draw = (pos: number) => {
      const a = Math.floor(pos);
      const t = pos - a;
      if (frames[a] && frames[a + 1] && t > 0.01) {
        paint(frames[a]!, 1);
        paint(frames[a + 1]!, t);
      } else {
        const i = nearestLoaded(Math.round(pos));
        if (i < 0) return;
        paint(frames[i]!, 1);
      }
      drawn = pos;
      if (!root.dataset.scene) {
        root.dataset.scene = stills ? "fallback" : "ready";
        window.dispatchEvent(new Event("fuerte:scene-ready"));
      }
    };

    // Idle loops: fade a beat's loop in once scrolling has rested on it; fade out (and pause) as soon as it moves.
    const showLoop = (beat: number) => {
      if (looping === beat) return;
      looping = beat;
      video.src = `${format.path}loop-${beat}.mp4${bust(format)}`;
      video.oncanplaythrough = () => {
        if (disposed || looping !== beat) return;
        void video.play().then(() => (video.dataset.shown = "true"), () => {});
      };
      video.load();
    };
    const hideLoop = () => {
      if (looping < 0) return;
      looping = -1;
      video.oncanplaythrough = null;
      video.dataset.shown = "false";
    };
    video.ontransitionend = () => {
      if (video.dataset.shown !== "true") video.pause();
    };

    const tick = () => {
      raf = 0;
      const beat = beatValue();
      const target = stills ? frameFor(Math.round(beat)) : frameFor(beat);
      current = current < 0 || stills ? target : current + (target - current) * EASE;
      if (Math.abs(current - drawn) > 0.004 || drawn < 0) draw(current);
      if (!stills && Math.abs(target - current) > 0.02) schedule();
    };
    function schedule() {
      if (!raf && !disposed) raf = requestAnimationFrame(tick);
    }
    const onScroll = () => {
      schedule();
      if (!loops) return;
      hideLoop();
      clearTimeout(settle);
      settle = window.setTimeout(() => {
        const beat = beatValue();
        const n = Math.round(beat);
        if (Math.abs(beat - n) < 0.04) showLoop(n);
      }, SETTLE_MS);
    };

    resize();
    if (loops) settle = window.setTimeout(() => Math.abs(beatValue() - Math.round(beatValue())) < 0.04 && showLoop(Math.round(beatValue())), 2500);
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", resize);
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      clearTimeout(settle);
      hideLoop();
      video.removeAttribute("src");
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", resize);
      removeEventListener("load", whenIdle);
      delete root.dataset.scene;
    };
  }, [manifest, theme]);

  return (
    <>
      <canvas ref={canvasRef} aria-hidden className={className ?? LAYER} />
      <video
        ref={videoRef}
        aria-hidden
        muted
        loop
        playsInline
        preload="none"
        data-shown="false"
        className={`${LAYER} object-cover opacity-0 transition-opacity duration-500 data-[shown=true]:opacity-100`}
      />
    </>
  );
}
