"use client";

import { useEffect, useRef } from "react";

import { DURATION, EASE_ENTRANCE, prefersReducedMotion } from "@/lib/motion";

/**
 * The site's one scroll reveal (anime.js, MASTER.md → Motion): blocks matching `selector` rise 16px and fade in as they
 * enter the viewport, staggered when several arrive together. Blocks already on screen at mount are never hidden, so
 * nothing flashes; without JavaScript, with reduced motion, or if anime.js fails to load, everything simply shows.
 */
export function ScrollReveal({ selector = "[data-rise]", className, children }: { selector?: string; className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root || prefersReducedMotion()) return;
    const items = [...root.querySelectorAll<HTMLElement>(selector)].filter((el) => el.getBoundingClientRect().top > window.innerHeight);
    if (!items.length) return;

    const show = (els: HTMLElement[]) => els.forEach((el) => el.style.removeProperty("opacity"));
    items.forEach((el) => (el.style.opacity = "0"));
    const lib = import("animejs");
    let queue: HTMLElement[] = [];
    let frame = 0;
    let done = false;

    const flush = () => {
      frame = 0;
      const batch = queue;
      queue = [];
      lib
        .then(({ animate, stagger, cubicBezier }) => {
          if (done) return;
          animate(batch, {
            opacity: [0, 1],
            y: [16, 0],
            duration: DURATION.slow,
            delay: stagger(60),
            ease: cubicBezier(...EASE_ENTRANCE),
            onComplete: () => batch.forEach((el) => el.style.removeProperty("transform")),
          });
        })
        .catch(() => show(batch));
    };
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          io.unobserve(e.target);
          queue.push(e.target as HTMLElement);
        }
        if (queue.length && !frame) frame = requestAnimationFrame(flush);
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    items.forEach((el) => io.observe(el));
    return () => {
      done = true;
      io.disconnect();
      cancelAnimationFrame(frame);
      show(items);
    };
  }, [selector]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
