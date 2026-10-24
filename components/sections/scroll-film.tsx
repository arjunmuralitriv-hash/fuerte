"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { preload } from "react-dom";

/** A cut's frames are `${path}0000.${ext}` … ; with `loops`, each beat N also has a seamless idle loop at `${path}loop-N.mp4`;
 * `beats` overrides the manifest's beat positions for this cut; `version` is added to every URL so a re-render is never
 * served from the browser cache (frames are cached for a week). `rests` are frames between beats with their own idle loop
 * (`loop-m0.mp4` …), so a visitor who stops mid-transition also sees the scene alive. `video` is the same cut as one video, scrubbed in place of
 * the frames when given. `skip` lists frames never shown (a flash at a cut): the frame before stands in. */
export type FilmFormat = {
  path: string;
  ext: string;
  count: number;
  loops?: boolean;
  beats?: number[];
  version?: string;
  video?: string;
  rests?: number[];
  skip?: number[];
};
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
const EASE = 0.16; // Easing toward the scroll target per 60 Hz frame: smooths wheel steps without lag.
const FOLLOW = 0.4; // Easing when the page scroll is already smoothed (components/motion/smooth-scroll.tsx): film and copy move as one.
// The easing for a frame that took `ms`, so the film moves at the same speed on a 60, 120 or 165 Hz screen.
const easeFor = (rate: number, ms: number) => 1 - (1 - rate) ** (ms / (1000 / 60));
const SETTLE_MS = 200; // Scroll stillness before the page counts as resting.
const AT_POINT = 2; // Distance from a loop point, in frames, that counts as resting on it (its idle loop plays).
// When the page rests between loop points, it glides on to the next one over this long (ms), by distance in px.
const glideMs = (px: number) => Math.min(850, 400 + px * 0.5);
const CARD_AFTER = 300; // A beat's card comes in once its loop has played this long (ms).
const LOOP_WAIT = 2500; // A beat's card shows after this even if its loop never starts (a failed download).
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
 * so transitions glide. When the cut has a video, it is scrubbed instead (?film=frames keeps the frames, to compare):
 * Chromium and Firefox play it while it downloads, from the opening frames on, and hold the newest frame that has
 * arrived if the scroll runs ahead; WebKit (iOS stalls on seeks into a partly loaded video) waits for the whole file.
 * Until the video can show the current position, the canvas shows the beat stills. The film always shows the scroll
 * position. When scrolling rests on a beat or rest point, its idle loop (same first frame, effects running) fades in
 * over the film and plays until the visitor scrolls again; resting between points, the page glides on to the next point
 * in the direction it was moving (components/motion/smooth-scroll.tsx), and the film follows it there, so the film never
 * runs back against the scroll. Reduced motion and Save-Data load only the beat stills and no loops. Signals
 * "fuerte:film-beat" (detail: N, also <html data-film-beat>) when beat N's card may come in: once that beat's idle loop
 * has played for CARD_AFTER (the visitor has seen the scene alive), or, without loops, once the film lands on beat N.
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
    // WebKit gets the whole file first; elsewhere the video streams and is used as far as it has arrived.
    const whole = /AppleWebKit/.test(navigator.userAgent) && !/Chrome\/|Chromium\/|Edg\/|Android/.test(navigator.userAgent);
    let filmLoaded = false;
    const frames: (HTMLImageElement | undefined)[] = new Array(format.count);
    const sections = [...document.querySelectorAll<HTMLElement>("[data-beat]")].sort((a, b) => Number(a.dataset.beat) - Number(b.dataset.beat));
    let disposed = false;
    let raf = 0;
    let current = -1;
    let drawn = -1;
    let settle = 0;
    let looping = ""; // id of the loop showing (or loading): "3" for beat 3, "m2" for rest point 2, "" for none
    let dir = 1; // direction the page last moved: 1 down, -1 up
    let lastY = scrollY;
    let glideTo = -1; // page position the page is gliding to (a loop point), -1 when not gliding
    let cardTimer = 0;
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
      // The opening scene comes alive as soon as its loop has downloaded, if the visitor has not scrolled away.
      if (loops) rest(false);
    };
    // The whole video is downloaded before it is used, so a seek never waits on the network (a partly loaded video is
    // fetched in ranges, and iOS stalls on each seek). If it cannot load or play, the frames load instead.
    const loadFrames = () => {
      if (disposed) return;
      queue.push(...loadOrder(format.count, beats).filter((i) => !beats.includes(i)));
      for (let k = 0; k < CONCURRENCY; k++) pump();
    };
    const loadFilm = (url: string) => {
      film.onloadeddata = () => {
        // Playing once lets iOS paint the frames it seeks to; muted inline play is allowed, and refused in Low Power Mode.
        void film.play().catch(() => {}).finally(() => {
          film.pause();
          filmLoaded = true;
          schedule();
        });
      };
      film.onerror = loadFrames;
      // As more of a streaming video arrives, a film held at the newest frame moves on to the scroll position.
      film.onprogress = schedule;
      if (!whole) {
        film.src = url;
        return;
      }
      fetch(url, { signal: abort.signal })
        .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(`${r.status}`))))
        .then((blob) => (film.src = URL.createObjectURL(blob)))
        .catch(loadFrames);
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
    // The page position that shows a frame: the inverse of frameFor(beatValue()).
    const scrollYFor = (frame: number) => {
      let i = 0;
      while (i < beats.length - 2 && frame > beats[i + 1]) i++;
      const t = Math.min(1, Math.max(0, (frame - beats[i]) / (beats[i + 1] - beats[i])));
      const centre = (s: HTMLElement) => {
        const r = s.getBoundingClientRect();
        return r.top + r.height / 2 + scrollY;
      };
      const a = centre(sections[i]);
      return Math.max(0, Math.round(a + (centre(sections[i + 1]) - a) * t - innerHeight / 2));
    };
    const unflash = (i: number) => (format.skip?.includes(i) ? i - 1 : i);
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
      if (frames[a] && frames[a + 1] && t > 0.01 && unflash(a) === a && unflash(a + 1) === a + 1) {
        paint(frames[a]!, 1);
        paint(frames[a + 1]!, t);
      } else {
        const i = nearestLoaded(unflash(Math.round(pos)));
        if (i < 0) return;
        paint(frames[i]!, 1);
      }
      drawn = pos;
    };

    // Show a frame of the film video: one seek at a time, each starting from the newest scroll position once the last lands.
    // Last frame of the streaming video that has arrived, counting only the range from the start.
    const lastArrived = () => {
      if (whole) return format.count - 1;
      const b = film.buffered;
      for (let i = 0; i < b.length; i++) if (b.start(i) <= 0.05) return Math.floor(b.end(i) * FPS) - 1;
      return -1;
    };
    const seek = (pos: number) => {
      drawn = pos;
      const f = Math.min(unflash(Math.round(pos)), lastArrived());
      if (f < 0 || f === seekFrame || film.seeking) return;
      seekFrame = f;
      film.currentTime = (f + 0.5) / FPS;
    };
    film.onseeked = () => {
      if (disposed) return;
      if (!ready && loops) fetchAround(current); // the film is on screen: its nearest loops may download now
      ready = true;
      film.dataset.shown = "true";
      seek(drawn);
    };

    // Idle loops: fade a beat's loop in once scrolling has rested on it; fade out (and pause) as soon as it moves.
    // Each loop is downloaded once and kept in memory, and the ones around where the visitor is are fetched ahead, so a
    // loop starts as soon as the film comes to rest.
    const points = [...beats.map((f, i) => [f, String(i)] as const), ...(format.rests ?? []).map((f, i) => [f, `m${i}`] as const)].sort(
      (a, b) => a[0] - b[0],
    );
    const loopUrls = new Map<string, Promise<string>>();
    const fetchLoop = (id: string) => {
      let url = loopUrls.get(id);
      if (!url) {
        url = fetch(`${format.path}loop-${id}.mp4${bust(format)}`, { signal: abort.signal })
          .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(`${r.status}`))))
          .then((blob) => URL.createObjectURL(blob));
        url.catch(() => loopUrls.delete(id));
        loopUrls.set(id, url);
      }
      return url;
    };
    const nearestPoint = (frame: number) => points.reduce((a, b) => (Math.abs(b[0] - frame) < Math.abs(a[0] - frame) ? b : a));
    // The loop at this point and the ones either side of it: wherever the visitor stops next is most likely one of them.
    const fetchAround = (frame: number) => {
      const i = points.indexOf(nearestPoint(frame));
      for (const p of [points[i], points[i + 1], points[i - 1]]) if (p) void fetchLoop(p[1]).catch(() => {});
    };
    const showLoop = (id: string) => {
      if (looping === id) return;
      looping = id;
      // A beat's card follows its loop; if the loop never fades in, it still comes in after LOOP_WAIT.
      clearTimeout(cardTimer);
      if (/^\d+$/.test(id)) cardTimer = window.setTimeout(() => looping === id && cardFor(Number(id)), LOOP_WAIT);
      fetchLoop(id)
        .then((url) => {
          if (disposed || looping !== id) return;
          video.src = url;
          video.oncanplay = () => {
            if (disposed || looping !== id || video.dataset.shown === "true") return;
            void video.play().then(() => {
              if (disposed || looping !== id) return;
              video.dataset.shown = "true";
              // Once the beat's scene has been alive on screen for a moment, its card follows, even if the visitor
              // moves on straight away; while they read it, the loops ahead download (ontransitionend).
              if (/^\d+$/.test(id)) {
                clearTimeout(cardTimer);
                window.setTimeout(() => cardFor(Number(id)), CARD_AFTER);
              }
            }, () => {});
          };
          video.load();
        })
        .catch(() => {});
    };
    const hideLoop = () => {
      if (!looping) return;
      looping = "";
      clearTimeout(cardTimer);
      video.oncanplay = null;
      video.dataset.shown = "false";
    };
    // Signals that beat N's card may come in (components/sections/reveal.tsx).
    const cardFor = (n: number) => {
      root.dataset.filmBeat = String(n);
      window.dispatchEvent(new CustomEvent("fuerte:film-beat", { detail: n }));
    };
    video.ontransitionend = () => {
      if (video.dataset.shown !== "true") return video.pause();
      // A loop is fully in: the loops ahead download while the visitor looks at it.
      const i = points.findIndex((p) => p[1] === looping);
      for (const p of [points[i + 1], points[i + 2]]) if (p) void fetchLoop(p[1]).catch(() => {});
    };

    let lastTick = 0; // time of the previous frame while the film is moving, 0 when it was at rest
    const tick = (now: number) => {
      raf = 0;
      const beat = beatValue();
      const target = stills ? frameFor(Math.round(beat)) : frameFor(beat);
      const k = easeFor(root.dataset.smoothScroll ? FOLLOW : EASE, lastTick ? Math.min(now - lastTick, 100) : 1000 / 60);
      lastTick = now;
      current = current < 0 || stills ? target : current + (target - current) * k;
      // The video takes over once it can show the current position; until then the canvas keeps the stills.
      if (!ready && filmLoaded && !film.seeking && seekFrame < 0 && lastArrived() >= Math.round(current)) seek(current);
      if (Math.abs(current - drawn) > 0.004 || drawn < 0 || (ready && seekFrame < Math.round(current))) (ready ? seek : draw)(current);
      // Arrived on beat N: the film has caught up with the scroll, which rests near N, and a frame is on screen.
      const n = Math.round(beat);
      const at = drawn >= 0 && Math.abs(target - current) < 0.5 && Math.abs(beat - n) < ARRIVE ? n : -1;
      if (at !== arrived) {
        arrived = at;
        if (at < 0) delete root.dataset.filmBeat;
        else if (!loops) cardFor(at); // with loops, the card waits for the beat's loop instead
      }
      if (!stills && Math.abs(target - current) > 0.02) schedule();
      else lastTick = 0;
    };
    function schedule() {
      if (!raf && !disposed) raf = requestAnimationFrame(tick);
    }
    // The page has come to rest. On a loop point, its loop plays. Between points (cuts with rest points), the page
    // glides on to the next point in the direction it was moving, never back against the visitor's own scroll, and the
    // film follows the page there. `glide` false only plays a loop (the first rest after load moves nothing).
    const rest = (glide = true) => {
      glideTo = -1;
      const at = frameFor(beatValue());
      fetchAround(at);
      const [f, id] = nearestPoint(at);
      if (Math.abs(f - at) <= AT_POINT) return showLoop(id);
      if (!glide) return;
      // Without rest points (a cut whose rest loops are not rendered yet), only a page resting just short of the beat it
      // is moving towards glides on to it; it never goes back to the beat it has just left.
      const b = beatValue();
      const ahead = dir > 0 ? Math.ceil(b) : Math.floor(b);
      const near = Math.abs(ahead - b) < ARRIVE ? beats[ahead] : undefined;
      const next = !format.rests ? near : dir > 0 ? points.find((p) => p[0] > at)?.[0] : points.findLast((p) => p[0] < at)?.[0];
      if (next === undefined) return;
      glideTo = scrollYFor(next);
      const ms = glideMs(Math.abs(glideTo - scrollY));
      // The smoothed page scroll glides on a timed ease; without it (touch, a coarse pointer), the browser's smooth scroll.
      if (root.dataset.smoothScroll) window.dispatchEvent(new CustomEvent("fuerte:glide-to", { detail: { top: glideTo, ms } }));
      else scrollTo({ top: glideTo, behavior: "smooth" });
    };
    const onScroll = () => {
      schedule();
      if (scrollY !== lastY) {
        dir = scrollY > lastY ? 1 : -1;
        lastY = scrollY;
      }
      if (!loops) return;
      hideLoop();
      clearTimeout(settle);
      // Arrived from a glide: rest at once (just long enough for the film to catch up), instead of waiting SETTLE_MS.
      const glided = glideTo >= 0 && Math.abs(scrollY - glideTo) < 1;
      settle = window.setTimeout(() => rest(), glided ? 60 : SETTLE_MS);
    };

    resize();
    // With rest points the page always comes to rest on a loop point, so every beat card can wait for its loop
    // (components/sections/reveal.tsx).
    if (loops && format.rests) root.dataset.filmLoops = "true";
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", resize);
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      clearTimeout(settle);
      hideLoop();
      abort.abort();
      delete root.dataset.filmLoops;
      film.onloadeddata = film.onseeked = film.onerror = film.onprogress = null;
      film.dataset.shown = "false";
      if (film.src) URL.revokeObjectURL(film.src);
      loopUrls.forEach((url) => void url.then(URL.revokeObjectURL, () => {}));
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
        className={`${LAYER} object-cover opacity-0 transition-opacity duration-300 data-[shown=true]:opacity-100`}
      />
    </>
  );
}
