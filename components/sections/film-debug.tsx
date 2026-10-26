"use client";

import { useEffect, useState } from "react";

import type { FilmDebug as FilmReport } from "@/components/sections/scroll-film";

/** Whether this device can decode a film still, draw it on a canvas, and play a loop from memory and from its URL. */
async function selfTest(cut: string, out: Record<string, string>) {
  const frame = `${cut}0000.avif?v=2`;
  const loop = `${cut}loop-0.mp4?v=2`;
  try {
    const img = new Image();
    img.src = frame;
    await img.decode();
    out.still = `decoded ${img.naturalWidth}x${img.naturalHeight}`;
    const c = document.createElement("canvas");
    c.width = c.height = 8;
    const x = c.getContext("2d");
    if (!x) out.canvas = "no 2d context";
    else {
      x.drawImage(img, 0, 0, 8, 8);
      const d = x.getImageData(0, 0, 8, 8).data;
      let sum = 0;
      for (let i = 0; i < d.length; i += 4) sum += d[i] + d[i + 1] + d[i + 2];
      out.canvas = `drew, average ${Math.round(sum / 192)}`;
    }
  } catch (e) {
    out.still = `failed: ${String(e)}`;
  }
  const play = async (src: string) => {
    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.src = src;
    try {
      await new Promise<void>((ok, no) => {
        v.onloadeddata = () => ok();
        v.onerror = () => no(new Error(`error ${v.error?.code}`));
        setTimeout(() => no(new Error(`timeout, readyState ${v.readyState}`)), 15000);
      });
      await v.play();
      return `plays ${v.videoWidth}x${v.videoHeight}`;
    } catch (e) {
      return String((e as Error).message ?? e);
    }
  };
  out.loopFromUrl = await play(loop);
  try {
    const blob = await (await fetch(loop)).blob();
    out.loopFromMemory = await play(URL.createObjectURL(blob));
  } catch (e) {
    out.loopFromMemory = `download failed: ${String(e)}`;
  }
}

const videoState = (v: HTMLVideoElement | undefined) =>
  v
    ? `${v.currentSrc ? (v.currentSrc.startsWith("blob:") ? "memory" : "url") : "none"} ready ${v.readyState} net ${v.networkState} err ${v.error?.code ?? "-"} shown ${v.dataset.shown} ${v.paused ? "paused" : "playing"}`
    : "missing";

/**
 * Diagnostic panel for the home film, shown only with ?filmdebug in the URL, so a visitor's screenshot says which part
 * of the film failed on their device: what the film got to (scroll-film.tsx), what its elements show, errors, and
 * self-tests of stills, canvas and video. It never takes a touch, so the page scrolls under it.
 */
export function FilmDebug() {
  const [lines, setLines] = useState<string[] | null>(null);

  useEffect(() => {
    if (!location.search.includes("filmdebug")) return;
    const errors: string[] = [];
    const tests: Record<string, string> = { tests: "running in 2 s" };
    const onError = (e: ErrorEvent) => errors.push(`error: ${e.message}`);
    const onRejection = (e: PromiseRejectionEvent) => errors.push(`rejected: ${String(e.reason)}`);
    const onCsp = (e: SecurityPolicyViolationEvent) => errors.push(`blocked: ${e.violatedDirective} ${e.blockedURI}`);
    addEventListener("error", onError);
    addEventListener("unhandledrejection", onRejection);
    addEventListener("securitypolicyviolation", onCsp);
    const film = () => (window as Window & { __film?: FilmReport }).__film;
    const start = setTimeout(() => {
      const cut = film()?.state?.().cut;
      if (typeof cut !== "string") return void (tests.tests = "skipped: the film never started");
      delete tests.tests;
      void selfTest(cut, tests);
    }, 2000);
    const report = () => {
      const root = document.documentElement;
      const canvas = document.querySelector<HTMLCanvasElement>('canvas[data-film="canvas"]');
      const filmVideo = document.querySelector<HTMLVideoElement>('video[data-film="video"]') ?? undefined;
      const loopVideo = document.querySelector<HTMLVideoElement>('video[data-film="loop"]') ?? undefined;
      let centre = "-";
      try {
        const px = canvas?.getContext("2d")?.getImageData((canvas.width / 2) | 0, (canvas.height / 2) | 0, 1, 1).data;
        if (px) centre = `${px[0]},${px[1]},${px[2]}`;
      } catch (e) {
        centre = `unreadable: ${String(e)}`;
      }
      const state = film()?.state?.() ?? {};
      return [
        `ua: ${navigator.userAgent.replace(/^Mozilla\/5\.0 /, "")}`,
        `screen: ${innerWidth}x${innerHeight} dpr ${devicePixelRatio} reduced-motion ${matchMedia("(prefers-reduced-motion: reduce)").matches}`,
        `film: ${film()?.effect ?? "never started"}`,
        ...Object.entries(state).map(([k, v]) => `  ${k}: ${String(v)}`),
        `canvas: ${canvas ? `${canvas.width}x${canvas.height}, centre ${centre}` : "missing"}`,
        `film video: ${videoState(filmVideo)}`,
        `loop video: ${videoState(loopVideo)}`,
        `html: ready ${root.dataset.filmReady ?? "-"} cards ${root.dataset.filmCards ?? "-"} beat ${root.dataset.filmBeat ?? "-"}`,
        ...Object.entries(tests).map(([k, v]) => `test ${k}: ${v}`),
        ...(errors.length ? errors.slice(-6) : ["errors: none"]),
      ];
    };
    const timer = setInterval(() => setLines(report()), 500);
    return () => {
      clearTimeout(start);
      clearInterval(timer);
      removeEventListener("error", onError);
      removeEventListener("unhandledrejection", onRejection);
      removeEventListener("securitypolicyviolation", onCsp);
    };
  }, []);

  if (!lines) return null;
  return (
    <pre className="pointer-events-none fixed inset-x-2 top-16 z-50 max-h-[70dvh] overflow-hidden rounded-xl bg-black/85 p-3 font-mono text-xs leading-snug whitespace-pre-wrap text-white">
      {lines.join("\n")}
    </pre>
  );
}
