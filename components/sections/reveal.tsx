"use client";

import { useEffect, useRef, useState } from "react";

/** The film fires this (detail: N) and sets <html data-film-beat="N"> when it lands on beat N (scroll-film.tsx). */
const BEAT_EVENT = "fuerte:film-beat";
/** A beat card in view shows after this even if the film never lands on its beat (resting between beats, no film). */
const BEAT_MAX_WAIT = 2500;

/**
 * Lets the film play before a beat's copy appears, then fades the copy in (home page). The hero copy does not wait:
 * it fades in with CSS from first paint, so it never becomes a late LCP (app/[locale]/page.tsx).
 * - beat N: shows when the film lands on beat N, so the camera move arrives first; or BEAT_MAX_WAIT after the card is
 *   half in view, at most.
 * - otherwise: shows a beat after the card is half in view.
 * Reduced motion, no JavaScript and keyboard focus all show the copy at once (CSS in globals.css).
 */
export function Reveal({ beat, className, children }: { beat?: number; className?: string; children: React.ReactNode }) {
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

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        showIn(beat === undefined ? pause : BEAT_MAX_WAIT);
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    const onBeat = (e: Event) => {
      if ((e as CustomEvent<number>).detail !== beat) return;
      io.disconnect();
      showIn(0);
    };
    if (beat !== undefined) {
      if (document.documentElement.dataset.filmBeat === String(beat)) showIn(0);
      else window.addEventListener(BEAT_EVENT, onBeat);
    }
    return () => {
      io.disconnect();
      window.clearTimeout(timer);
      window.removeEventListener(BEAT_EVENT, onBeat);
    };
  }, [beat]);

  return (
    <div ref={ref} data-reveal={shown ? "shown" : "pending"} className={className}>
      {children}
    </div>
  );
}
