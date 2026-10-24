"use client";

import { useEffect } from "react";

import { prefersReducedMotion } from "@/lib/motion";

/** Share of the remaining distance the page covers per 60 Hz frame (pear.no uses 0.085): wheel steps become one glide.
 * Scaled by the real frame time, so a 120 or 165 Hz screen glides at the same speed. */
const LERP = 0.085;
/** Keys settle quicker (a 40 px step in about 0.3 s), so a single press comes to rest, while quick taps still run together. */
const KEY_LERP = 0.2;
const lerpFor = (rate: number, ms: number) => 1 - (1 - rate) ** (ms / (1000 / 60));
/** Arrow-key step, as the browser's own. */
const LINE = 40;
// Sine ease for glides to a loop point: its top speed is about 1.6 times the average, so the film keeps up.
const easeInOut = (p: number) => -(Math.cos(Math.PI * p) - 1) / 2;

/** True when the wheel is over something that scrolls by itself (a panel, a dialog body): leave that to the browser. */
function scrollsInside(target: EventTarget | null) {
  for (let el = target instanceof Element ? target : null; el && el !== document.body; el = el.parentElement) {
    const { overflowY } = getComputedStyle(el);
    if ((overflowY === "auto" || overflowY === "scroll") && el.scrollHeight > el.clientHeight) return true;
  }
  return false;
}

/** Keys that type, pick or move within a control keep their own meaning. */
const OWN_KEYS = "input, textarea, select, [contenteditable], [role=listbox], [role=menu], [role=menubar], [role=slider], [role=tablist], [role=radiogroup]";

/**
 * Smoothed wheel and keyboard scrolling for the home page, so the copy and the film move as one glide instead of the
 * copy jumping a wheel step or arrow press at a time (MASTER.md → Motion). Fine pointers only: touch, reduced motion,
 * zoom (ctrl + wheel), open dialogs and scrollable panels keep native scrolling, and any scroll the page did not make
 * itself (scrollbar, anchor links) is followed. Sets <html data-smooth-scroll> so the film follows the page closely, and
 * takes "fuerte:glide-to" (detail: { top, ms }) from the film to glide the page to a loop point (scroll-film.tsx).
 */
export function SmoothScroll() {
  useEffect(() => {
    if (prefersReducedMotion() || !matchMedia("(pointer: fine)").matches) return;
    const root = document.documentElement;
    let target = scrollY;
    let current = scrollY;
    let raf = 0;
    let last = 0; // time of the previous frame of this glide, 0 before its first
    let rate = LERP; // easing of the last input: wheel or keys
    let glide: { from: number; start: number; ms: number } | null = null; // a timed move to `target`

    const max = () => root.scrollHeight - innerHeight;
    const step = (now: number) => {
      raf = 0;
      if (glide) {
        const p = Math.min(1, Math.max(0, (now - glide.start) / glide.ms));
        current = glide.from + (target - glide.from) * easeInOut(p);
        if (p === 1) glide = null;
      } else {
        current += (target - current) * lerpFor(rate, last ? Math.min(now - last, 100) : 1000 / 60);
        if (Math.abs(target - current) < 0.5) current = target;
      }
      last = now;
      scrollTo({ top: current, behavior: "instant" });
      if (glide || current !== target) raf = requestAnimationFrame(step);
      else last = 0;
    };
    const start = () => {
      if (!raf) raf = requestAnimationFrame(step);
    };
    const moveBy = (dy: number, r: number) => {
      const end = Math.min(Math.max(target + dy, 0), max());
      // Input along a glide to a loop point carries it on further; against it, the visitor's own input takes over.
      if (glide && raf && Math.sign(dy) === Math.sign(target - glide.from)) {
        target = end;
        return;
      }
      glide = null;
      rate = r;
      target = end;
      start();
    };
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY) || document.querySelector("dialog[open]") || scrollsInside(e.target)) return;
      e.preventDefault();
      moveBy(e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1), LERP);
    };
    // Arrow keys, Page Up/Down, Space and Home/End feed the same glide, so taps run together into one movement.
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || document.querySelector("dialog[open]")) return;
      const el = e.target instanceof Element ? e.target : null;
      if (el?.closest(OWN_KEYS) || scrollsInside(el)) return;
      if (e.key === " " && el?.closest("button, a, summary, [role=button]")) return;
      const page = innerHeight * 0.875;
      const dy = ({ ArrowDown: LINE, ArrowUp: -LINE, PageDown: page, PageUp: -page, " ": e.shiftKey ? -page : page, End: max(), Home: -max() } as Record<string, number>)[e.key];
      if (dy === undefined) return;
      e.preventDefault();
      if (Math.abs(dy) <= LINE) return moveBy(dy, KEY_LERP);
      // A page or more glides on a timed ease instead: the lerp would start it at a jump.
      target = Math.min(Math.max(target + dy, 0), max());
      glide = { from: current, start: performance.now(), ms: Math.min(900, 300 + Math.abs(target - current) * 0.6) };
      start();
    };
    const onGlide = (e: Event) => {
      const { top, ms } = (e as CustomEvent<{ top: number; ms: number }>).detail;
      target = Math.min(Math.max(top, 0), max());
      glide = { from: current, start: performance.now(), ms };
      start();
    };
    // A scroll the glide did not make (scrollbar, an anchor link) becomes the new resting point.
    const onScroll = () => {
      if (Math.abs(scrollY - current) > 2) {
        cancelAnimationFrame(raf);
        raf = 0;
        last = 0;
        glide = null;
        target = current = scrollY;
      }
    };

    root.dataset.smoothScroll = "true";
    addEventListener("wheel", onWheel, { passive: false });
    addEventListener("keydown", onKey);
    addEventListener("fuerte:glide-to", onGlide);
    addEventListener("scroll", onScroll, { passive: true });
    return () => {
      delete root.dataset.smoothScroll;
      cancelAnimationFrame(raf);
      removeEventListener("wheel", onWheel);
      removeEventListener("keydown", onKey);
      removeEventListener("fuerte:glide-to", onGlide);
      removeEventListener("scroll", onScroll);
    };
  }, []);

  return null;
}
