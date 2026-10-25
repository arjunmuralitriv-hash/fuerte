"use client";

import { useEffect, useState } from "react";

import { Loader } from "@/components/ui/loader";
import { cn } from "@/lib/utils";

let loaded = false; // once per visit: returning to the home page never shows it again

/**
 * The home page's first-load screen (plan section 11: `working · gyro`, 48 px, centred, red). Server-rendered, so it
 * covers the page from the first paint until the film's opening frame is drawn ("fuerte:film-ready", scroll-film.tsx) and
 * the fonts are in, then fades out. CSS fades it out by itself after 2.5 s (no script, a stalled frame), so it never
 * holds the page back; it never takes a click.
 */
export function FilmLoader() {
  const [state, setState] = useState<"on" | "out" | "gone">(loaded ? "gone" : "on");

  useEffect(() => {
    if (state !== "on") return;
    let cancelled = false;
    const film = new Promise<void>((done) => {
      if (document.documentElement.dataset.filmReady) return done();
      addEventListener("fuerte:film-ready", () => done(), { once: true });
    });
    void Promise.all([film, document.fonts.ready]).then(() => {
      if (cancelled) return;
      loaded = true;
      setState("out");
    });
    return () => {
      cancelled = true;
    };
  }, [state]);

  if (state === "gone") return null;
  return (
    <div
      onTransitionEnd={() => setState("gone")}
      onAnimationEnd={() => {
        loaded = true;
        setState("gone");
      }}
      className={cn(
        "pointer-events-none fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-background duration-300",
        // The fallback fade only while waiting: its delay class also delays transitions, so the ready fade drops it.
        state === "on" ? "animate-out fade-out fill-mode-forwards delay-2500" : "opacity-0 transition-opacity",
      )}
    >
      {/* The orb draws its dots only once scripts run; the mark (the header's placeholder logo) shows from the first paint. */}
      <span aria-hidden className="grid size-12 place-items-center rounded-xl bg-primary text-body font-semibold text-primary-foreground">
        ft
      </span>
      <Loader state="working" variant="gyro" size={48} />
    </div>
  );
}
