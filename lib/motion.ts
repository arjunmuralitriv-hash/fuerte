/**
 * Motion tokens for the two animation libraries (rules in design-system/fuerte/MASTER.md, "Motion"):
 * - anime.js (`animejs`): authored sequences — timelines, staggers, SVG line draws, text splits, scroll-linked scenes.
 * - Motion (`motion/react`): interface motion control — enter/exit, presence, gestures, layout changes, springs.
 * Same values as the CSS (`--ease-entrance` in app/globals.css), so CSS, anime.js and Motion move with one rhythm.
 */

/** Durations in ms (plan section 12). Motion takes seconds: `seconds(DURATION.base)`. */
export const DURATION = { fast: 150, base: 250, slow: 400, slower: 700 } as const;

type Bezier = [number, number, number, number];

/** Entrances decelerate; exits accelerate and run at about two thirds of the entrance. */
export const EASE_ENTRANCE: Bezier = [0.22, 1, 0.36, 1];
export const EASE_EXIT: Bezier = [0.4, 0, 1, 1];

/** Motion springs for interface state (press, drag release, layout). No overshoot on UI state. */
export const SPRING = { type: "spring", stiffness: 420, damping: 40, mass: 1 } as const;

export const seconds = (ms: number) => ms / 1000;

/** For anime.js, which does not read the media query itself: skip to the end state when this is true. */
export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
