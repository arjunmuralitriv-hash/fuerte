"use client";

import { useEffect, useRef, useState } from "react";

/** The scene sets <html data-scene="ready|fallback"> and fires this event once its first frame is on screen. */
const SCENE_EVENT = "fuerte:scene-ready";
const HERO_MAX_WAIT = 3500;

/**
 * Lets the 3D scene play before the copy appears, then fades the copy in (home page).
 * - waitForScene (hero copy below the headline): shows after the scene's first frame, or after HERO_MAX_WAIT at most.
 * - otherwise (beats): shows a beat after the card is half in view, so the camera move lands first.
 * Reduced motion, no JavaScript and keyboard focus all show the copy at once (CSS in globals.css).
 */
export function Reveal({ waitForScene, className, children }: { waitForScene?: boolean; className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const pause = matchMedia("(width < 48rem)").matches ? 1200 : 900;
    let timer: number | undefined;
    const showIn = (ms: number) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setShown(true), ms);
    };

    if (waitForScene) {
      const state = document.documentElement.dataset.scene;
      if (state === "ready") showIn(300);
      else if (state === "fallback") showIn(0);
      else showIn(HERO_MAX_WAIT);
      const onReady = () => showIn(document.documentElement.dataset.scene === "fallback" ? 0 : pause);
      window.addEventListener(SCENE_EVENT, onReady, { once: true });
      return () => {
        window.clearTimeout(timer);
        window.removeEventListener(SCENE_EVENT, onReady);
      };
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        showIn(pause);
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      window.clearTimeout(timer);
    };
  }, [waitForScene]);

  return (
    <div ref={ref} data-reveal={shown ? "shown" : "pending"} className={className}>
      {children}
    </div>
  );
}
