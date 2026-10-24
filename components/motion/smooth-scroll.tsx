"use client";

import { useEffect } from "react";

import { prefersReducedMotion } from "@/lib/motion";

/** Share of the remaining distance the page covers each frame (pear.no uses 0.085): wheel steps become one glide. */
const LERP = 0.085;

/** True when the wheel is over something that scrolls by itself (a panel, a dialog body): leave that to the browser. */
function scrollsInside(target: EventTarget | null) {
  for (let el = target instanceof Element ? target : null; el && el !== document.body; el = el.parentElement) {
    const { overflowY } = getComputedStyle(el);
    if ((overflowY === "auto" || overflowY === "scroll") && el.scrollHeight > el.clientHeight) return true;
  }
  return false;
}

/**
 * Smoothed wheel scrolling for the home page, so the copy and the film move as one glide instead of the copy jumping a
 * wheel step at a time (MASTER.md → Motion). Fine pointers only: touch, reduced motion, zoom (ctrl + wheel), open
 * dialogs and scrollable panels keep native scrolling, and any scroll the page did not make itself (scrollbar, keys,
 * anchor links) is followed. Sets <html data-smooth-scroll> so the film follows the page closely (scroll-film.tsx).
 */
export function SmoothScroll() {
  useEffect(() => {
    if (prefersReducedMotion() || !matchMedia("(pointer: fine)").matches) return;
    const root = document.documentElement;
    let target = scrollY;
    let current = scrollY;
    let raf = 0;

    const step = () => {
      raf = 0;
      current += (target - current) * LERP;
      if (Math.abs(target - current) < 0.5) current = target;
      scrollTo({ top: current, behavior: "instant" });
      if (current !== target) raf = requestAnimationFrame(step);
    };
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY) || document.querySelector("dialog[open]") || scrollsInside(e.target)) return;
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1;
      target = Math.min(Math.max(target + e.deltaY * unit, 0), root.scrollHeight - innerHeight);
      if (!raf) raf = requestAnimationFrame(step);
    };
    // A scroll the glide did not make (scrollbar, keyboard, an anchor link) becomes the new resting point.
    const onScroll = () => {
      if (Math.abs(scrollY - current) > 2) {
        cancelAnimationFrame(raf);
        raf = 0;
        target = current = scrollY;
      }
    };

    root.dataset.smoothScroll = "true";
    addEventListener("wheel", onWheel, { passive: false });
    addEventListener("scroll", onScroll, { passive: true });
    return () => {
      delete root.dataset.smoothScroll;
      cancelAnimationFrame(raf);
      removeEventListener("wheel", onWheel);
      removeEventListener("scroll", onScroll);
    };
  }, []);

  return null;
}
