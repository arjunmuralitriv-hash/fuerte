/**
 * Start-up scheduling for the 3D scene. This module must stay tiny and must not import three:
 * it is part of the first (shell) chunk that decides whether the scene loads at all.
 */

type Scheduler = { yield?: () => Promise<void> };

/** Give the main thread back (input, paint) before the next slice of work. */
export function yieldToMain(): Promise<void> {
  const scheduler = (globalThis as { scheduler?: Scheduler }).scheduler;
  if (scheduler?.yield) return scheduler.yield();
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = () => resolve();
    channel.port2.postMessage(null);
  });
}

/** Resolve in an idle period (or after `timeout` ms at the latest). */
export function whenIdle(timeout = 2000): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(() => resolve(), { timeout });
    else setTimeout(resolve, 50);
  });
}

/**
 * Wait until the page has loaded, painted a frame and gone idle, so the H1, menu and CTAs are
 * interactive before any 3D work starts. A hidden tab waits here until it is shown (no frames).
 */
export async function startWhenIdle() {
  if (document.readyState !== "complete") {
    await new Promise<void>((resolve) => window.addEventListener("load", () => resolve(), { once: true }));
  }
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  await whenIdle(3000);
}

/**
 * Start-up phases and their share of the preloader. Each phase reports `done / total`, so the
 * percentage moves with real work: GPU check, code, downloads, textures, each layer's build and
 * each layer's shader compile + upload, then one warm-up frame.
 */
const PHASES = { gpu: 4, code: 16, assets: 22, textures: 10, build: 22, compile: 22, warmup: 4 } as const;
export type Phase = keyof typeof PHASES;
export type ReportProgress = (phase: Phase, done: number, total: number) => void;

export function createProgress(onChange: (percent: number) => void): ReportProgress {
  const fractions: Partial<Record<Phase, number>> = {};
  const sum = Object.values(PHASES).reduce((a, b) => a + b, 0);
  return (phase, done, total) => {
    // Visible in performance traces, so long tasks can be attributed to a start-up phase.
    performance.mark(`scene:${phase} ${done}/${total}`);
    fractions[phase] = total > 0 ? Math.min(1, done / total) : 1;
    let percent = 0;
    for (const [p, weight] of Object.entries(PHASES)) percent += (fractions[p as Phase] ?? 0) * weight;
    onChange(Math.round((percent / sum) * 100));
  };
}
