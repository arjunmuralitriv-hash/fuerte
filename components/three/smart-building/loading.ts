import { DefaultLoadingManager } from "three";

/**
 * The scene's start-up steps, reported through three's DefaultLoadingManager so drei's
 * useProgress shows a real percentage. A future glTF load joins the same count automatically.
 */
export type LoadingStep = "gpu" | "build" | "compile";
const STEPS: LoadingStep[] = ["gpu", "build", "compile"];
const open = new Set<LoadingStep>();
const url = (step: LoadingStep) => `fuerte-scene:${step}`;

export function startLoading() {
  for (const step of STEPS) {
    if (open.has(step)) continue;
    open.add(step);
    DefaultLoadingManager.itemStart(url(step));
  }
}

export function endLoading(step: LoadingStep) {
  if (open.delete(step)) DefaultLoadingManager.itemEnd(url(step));
}

/** Closes whatever is still open (unmount, or the fallback was chosen) so the manager stays balanced. */
export function endAllLoading() {
  for (const step of [...open]) endLoading(step);
}
