"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { preload } from "react-dom";

/** A cut's frames are `${path}0000.${ext}` … ; with `loops`, each beat N also has a seamless idle loop at `${path}loop-N.mp4`;
 * `beats` overrides the manifest's beat positions for this cut; `version` is added to every URL so a re-render is never
 * served from the browser cache (frames are cached for a week). `rests` are frames between beats with their own idle loop
 * (`loop-m0.mp4` …), so a visitor who stops mid-transition also sees the scene alive. `video` is the same cut as one video, scrubbed in place of
 * the frames when given. */
export type FilmFormat = { path: string; ext: string; count: number; loops?: boolean; beats?: number[]; version?: string; video?: string; rests?: number[] };
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
const REST_EASE = 0.06; // Slower easing when the film settles on a rest point by itself: a drift, not a jump.
const ARRIVE = 0.25; // Distance from beat N, in beats, that still counts as resting on it (its card comes in).
const FPS = 30; // Frame rate of the cut videos (scripts/encode_film_video.py).

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
 * so transitions glide. When the cut has a video, the canvas shows only the beat stills while the whole video downloads,
 * then the video takes over and is scrubbed instead (?film=frames keeps the frames, to compare). When scrolling rests
 * on a beat, that beat's idle loop (same first frame, effects running) fades in over the film and plays until the
 * visitor scrolls again. Reduced motion and Save-Data load only the beat stills and no loops. Signals
 * "fuerte:film-beat" (detail: N, also <html data-film-beat>)
 * each time the film lands on beat N, so that beat's card comes in once the camera move has arrived.
 */
export function ScrollFilm({ manifest, className }: { manifest: FilmManifest; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const filmRef = useRef<HTMLVideoElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const theme = useSiteTheme();
  // Preload the opening frame for the theme actually on <html> (next-themes sets it before hydration): on the hydration
  // render `theme` is still the server snapshot ("dark"), which fetched the night cut for light-theme visitors too.
  if (typeof window !== "undefined") {
    const live: Theme = document.documentElement.classList.contains("dark") ? "dark" : "light";
    preload(frameUrl(pick(manifest.themes[live]), manifest.beats[0]), { as: "image", fetchPriority: "high" });
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    const film = filmRef.current;
    const video = videoRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !film || !video || !ctx) return;
    const root = document.documentElement;
    // The hydration pass still sees the server snapshot ("dark"); skip it so the wrong cut is never fetched.
    if (theme !== (root.classList.contains("dark") ? "dark" : "light")) return;
    const format = pick(manifest.themes[theme]);
    const stills =
      matchMedia("(prefers-reduced-motion: reduce)").matches || (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
    const loops = format.loops && !stills;
    // The cut videos are H.264 (High profile, 1080p): browsers built without it keep the frames.
    const scrub =
      !stills && new URLSearchParams(location.search).get("film") !== "frames" && film.canPlayType('video/mp4; codecs="avc1.640032"') ? format.video : undefined;
    const abort = new AbortController();
    let ready = false; // the film video is on screen and scrubbed instead of the canvas
    let seekFrame = -1; // frame the film video was last asked to show
    const frames: (HTMLImageElement | undefined)[] = new Array(format.count);
    const sections = [...document.querySelectorAll<HTMLElement>("[data-beat]")].sort((a, b) => Number(a.dataset.beat) - Number(b.dataset.beat));
    let disposed = false;
    let raf = 0;
    let current = -1;
    let drawn = -1;
    let settle = 0;
    let looping = ""; // id of the loop showing (or loading): "3" for beat 3, "m2" for rest point 2, "" for none
    let hold = -1; // frame the film settles on while the scroll rests between beats, -1 when following the scroll
    let holdId = ""; // loop to show once the film reaches `hold`
    let arrived = -1; // beat the film is resting on, -1 between beats

    // Load frames with a small concurrency limit, decoding each before it can be drawn (no decode jank on scrub).
    const beats = format.beats ?? manifest.beats; // a cut may carry its own beat positions
    const queue = stills || scrub ? [...beats] : loadOrder(format.count, beats);
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
      if (scrub) loadFilm(scrub);
      for (let k = 0; k < CONCURRENCY; k++) pump();
    };
    // The whole video is downloaded before it is used, so a seek never waits on the network (a partly loaded video is
    // fetched in ranges, and iOS stalls on each seek). If it cannot load or play, the frames load instead.
    const loadFrames = () => {
      if (disposed) return;
      queue.push(...loadOrder(format.count, beats).filter((i) => !beats.includes(i)));
      for (let k = 0; k < CONCURRENCY; k++) pump();
    };
    const loadFilm = (url: string) =>
      fetch(url, { signal: abort.signal })
        .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(`${r.status}`))))
        .then((blob) => {
          film.onloadeddata = () => {
            // Playing once lets iOS paint the frames it seeks to; muted inline play is allowed, and refused in Low Power Mode.
            void film.play().catch(() => {}).finally(() => {
              film.pause();
              seek(Math.max(current, 0));
            });
          };
          film.onerror = loadFrames;
          film.src = URL.createObjectURL(blob);
        })
        .catch(loadFrames);
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
    };

    // Show a frame of the film video: one seek at a time, each starting from the newest scroll position once the last lands.
    const seek = (pos: number) => {
      drawn = pos;
      const f = Math.round(pos);
      if (f === seekFrame || film.seeking) return;
      seekFrame = f;
      film.currentTime = (f + 0.5) / FPS;
    };
    film.onseeked = () => {
      if (disposed) return;
      ready = true;
      film.dataset.shown = "true";
      seek(drawn);
    };

    // Idle loops: fade a beat's loop in once scrolling has rested on it; fade out (and pause) as soon as it moves.
    const showLoop = (id: string) => {
      if (looping === id) return;
      looping = id;
      video.src = `${format.path}loop-${id}.mp4${bust(format)}`;
      video.oncanplaythrough = () => {
        if (disposed || looping !== id) return;
        void video.play().then(() => (video.dataset.shown = "true"), () => {});
      };
      video.load();
    };
    const hideLoop = () => {
      if (!looping) return;
      looping = "";
      video.oncanplaythrough = null;
      video.dataset.shown = "false";
    };
    video.ontransitionend = () => {
      if (video.dataset.shown !== "true") video.pause();
    };

    const tick = () => {
      raf = 0;
      const beat = beatValue();
      const target = hold >= 0 ? hold : stills ? frameFor(Math.round(beat)) : frameFor(beat);
      current = current < 0 || stills ? target : current + (target - current) * (hold >= 0 ? REST_EASE : EASE);
      if (Math.abs(current - drawn) > 0.004 || drawn < 0) (ready ? seek : draw)(current);
      // Arrived on beat N: the film has caught up with the scroll, which rests near N, and a frame is on screen.
      const n = Math.round(beat);
      const at = drawn >= 0 && Math.abs(target - current) < 0.5 && Math.abs(beat - n) < ARRIVE ? n : -1;
      if (at !== arrived) {
        arrived = at;
        if (at < 0) delete root.dataset.filmBeat;
        else {
          root.dataset.filmBeat = String(at);
          window.dispatchEvent(new CustomEvent("fuerte:film-beat", { detail: at }));
        }
      }
      if (!stills && Math.abs(target - current) > 0.02) schedule();
      else if (holdId) {
        // Settled on the rest point: its loop starts on exactly this frame.
        current = target;
        (ready ? seek : draw)(current);
        showLoop(holdId);
        holdId = "";
      }
    };
    function schedule() {
      if (!raf && !disposed) raf = requestAnimationFrame(tick);
    }
    const onScroll = () => {
      schedule();
      if (!loops) return;
      hideLoop();
      hold = -1;
      holdId = "";
      clearTimeout(settle);
      settle = window.setTimeout(() => {
        const beat = beatValue();
        const n = Math.round(beat);
        if (Math.abs(beat - n) < 0.04) return showLoop(String(n));
        if (!format.rests) return;
        // Resting between beats: settle the film (not the page) on the nearest beat or rest point, then play its loop.
        const at = frameFor(beat);
        const points = [...beats.map((f, i) => [f, String(i)] as const), ...format.rests.map((f, i) => [f, `m${i}`] as const)];
        const [f, id] = points.reduce((a, b) => (Math.abs(b[0] - at) < Math.abs(a[0] - at) ? b : a));
        hold = f;
        holdId = id;
        schedule();
      }, SETTLE_MS);
    };

    resize();
    if (loops) settle = window.setTimeout(() => Math.abs(beatValue() - Math.round(beatValue())) < 0.04 && showLoop(String(Math.round(beatValue()))), 2500);
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", resize);
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      clearTimeout(settle);
      hideLoop();
      abort.abort();
      film.onloadeddata = film.onseeked = film.onerror = null;
      film.dataset.shown = "false";
      if (film.src) URL.revokeObjectURL(film.src);
      film.removeAttribute("src");
      video.removeAttribute("src");
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", resize);
      removeEventListener("load", whenIdle);
      delete root.dataset.filmBeat;
    };
  }, [manifest, theme]);

  return (
    <>
      <canvas ref={canvasRef} aria-hidden className={className ?? LAYER} />
      <video
        ref={filmRef}
        aria-hidden
        muted
        playsInline
        preload="auto"
        data-shown="false"
        className={`${LAYER} object-cover opacity-0 transition-opacity duration-500 data-[shown=true]:opacity-100`}
      />
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
