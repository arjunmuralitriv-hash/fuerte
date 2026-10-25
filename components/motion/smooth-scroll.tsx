"use client";

import { useEffect } from "react";

import { prefersReducedMotion } from "@/lib/motion";

/** Share of the remaining distance the page covers per 60 Hz frame, so wheel steps and key presses become one glide.
 * pear.no moves 0.085 per frame, whatever the screen: on a 165 Hz screen that is 0.217 per 60 Hz frame, and on a 60 Hz
 * screen it is 2.5 times slower. This is that 165 Hz feel, scaled by the real frame time so every screen gets it. */
const LERP = 0.217;
const lerpFor = (ms: number) => 1 - (1 - LERP) ** (ms / (1000 / 60));
/** Arrow-key step (pear.no's); Page Up/Down and Space move this share of the screen. */
const LINE = 90;
const PAGE = 0.9;
const MAX_FRAME_MS = 34; // two 60 Hz frames
// Sine ease for timed glides (a page or more, or onto a loop point): no jump at the start, and the film keeps up.
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
    let last = 0; // time of the previous frame of this glide, or of the input that started it
    let glide: { from: number; t: number; ms: number } | null = null; // a timed move to `target`, `t` ms into it

    const max = () => root.scrollHeight - innerHeight;
    const step = (now: number) => {
      raf = 0;
      // A stalled frame counts for two frames at most, so the page slows through a hiccup instead of jumping to catch up.
      const dt = Math.min(Math.max(now - last, 0), MAX_FRAME_MS);
      if (glide) {
        glide.t += dt;
        const p = Math.min(1, glide.t / glide.ms);
        current = glide.from + (target - glide.from) * easeInOut(p);
        if (p === 1) glide = null;
      } else {
        current += (target - current) * lerpFor(dt);
        if (Math.abs(target - current) < 0.5) current = target;
      }
      last = now;
      scrollTo({ top: current, behavior: "instant" });
      if (glide || current !== target) raf = requestAnimationFrame(step);
    };
    // From rest, the first frame moves only as far as the time since the input allows, so a press starts without a jump.
    const start = () => {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(step);
    };
    const moveBy = (dy: number) => {
      const end = Math.min(Math.max(target + dy, 0), max());
      // Input along a timed glide carries it on further; against it, the visitor's own input takes over.
      if (glide && raf && Math.sign(dy) === Math.sign(target - glide.from)) {
        target = end;
        return;
      }
      glide = null;
      target = end;
      start();
    };
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY) || document.querySelector("dialog[open]") || scrollsInside(e.target)) return;
      e.preventDefault();
      moveBy(e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1));
    };
    // Arrow keys, Page Up/Down, Space and Home/End feed the same glide, so taps run together into one movement.
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || document.querySelector("dialog[open]")) return;
      const el = e.target instanceof Element ? e.target : null;
      if (el?.closest(OWN_KEYS) || scrollsInside(el)) return;
      if (e.key === " " && el?.closest("button, a, summary, [role=button]")) return;
      const page = innerHeight * PAGE;
      const dy = ({ ArrowDown: LINE, ArrowUp: -LINE, PageDown: page, PageUp: -page, " ": e.shiftKey ? -page : page, End: max(), Home: -max() } as Record<string, number>)[e.key];
      if (dy === undefined) return;
      e.preventDefault();
      if (Math.abs(dy) <= LINE) return moveBy(dy);
      // A page or more glides on a timed ease instead: the lerp would start it with a jump (pear.no's first frame of a
      // Page Down moves about 190 px).
      target = Math.min(Math.max(target + dy, 0), max());
      glide = { from: current, t: 0, ms: Math.min(800, 250 + Math.abs(target - current) * 0.5) };
      start();
    };
    const onGlide = (e: Event) => {
      const { top, ms } = (e as CustomEvent<{ top: number; ms: number }>).detail;
      target = Math.min(Math.max(top, 0), max());
      glide = { from: current, t: 0, ms };
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
