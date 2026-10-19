"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, type ComponentType } from "react";

import { SceneFallback } from "@/components/three/scene-fallback";
import { ScenePreloader } from "@/components/three/scene-preloader";
import { QUALITY, detectQuality, type Quality, type QualityTier } from "@/components/three/smart-building/quality";
import type { SceneRootProps } from "@/components/three/smart-building/scene-root";
import { createProgress, startWhenIdle, yieldToMain } from "@/components/three/smart-building/startup";
import { cn } from "@/lib/utils";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const subscribeReducedMotion = (onChange: () => void) => {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

type SmartBuildingSceneProps = {
  /** Merged onto the wrapper, which by default is fixed full-screen behind the page (-z-10). */
  className?: string;
  /** Skip GPU detection and force a profile. For QA only (the dev page's ?quality=). */
  quality?: QualityTier;
  /** Frame-time, triangle and draw-call readout into [data-scene-stats]. For QA only. */
  stats?: boolean;
};

/**
 * The home page's "Smart-Building X-ray". Load it with next/dynamic and ssr: false.
 * It reads scroll position from the page's [data-beat="0" … "6"] sections; text stays in the page.
 *
 * This shell is deliberately small (no three.js). It waits until the page has loaded and gone
 * idle, checks the GPU (software renderers and weak phones get the static fallback), then pulls
 * in the 3D code chunk by chunk, one per task, and hands over to `SceneRoot`, which builds the
 * scene a layer at a time. The preloader's percentage follows each of those phases.
 */
export default function SmartBuildingScene({ className, quality: forced, stats }: SmartBuildingSceneProps) {
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => true,
  );
  /** undefined until decided, null when the static fallback should show. */
  const [quality, setQuality] = useState<Quality | null>();
  const [Root, setRoot] = useState<ComponentType<SceneRootProps>>();
  const [started, setStarted] = useState(false);
  const [percent, setPercent] = useState(0);
  const [ready, setReady] = useState(false);
  const report = useMemo(() => createProgress(setPercent), []);
  const onReady = useCallback(() => setReady(true), []);

  useEffect(() => {
    if (reducedMotion) return;
    let cancelled = false;
    (async () => {
      await startWhenIdle();
      if (cancelled) return;
      setStarted(true);
      const picked = forced ? QUALITY[forced] : await detectQuality();
      if (cancelled) return;
      report("gpu", 1, 1);
      if (!picked) {
        setQuality(null);
        return;
      }
      // The 3D libraries arrive as separate chunks; evaluating them one per task keeps each
      // evaluation short instead of one long block.
      const libraries: (() => Promise<unknown>)[] = [
        () => import("three"),
        () => import("@react-three/fiber"),
        ...(picked.post ? [() => import("postprocessing")] : []),
      ];
      const steps = libraries.length + 1;
      for (const [i, load] of libraries.entries()) {
        await load();
        report("code", i + 1, steps);
        await yieldToMain();
        if (cancelled) return;
      }
      const { SceneRoot } = await import("@/components/three/smart-building/scene-root");
      report("code", steps, steps);
      await yieldToMain();
      if (cancelled) return;
      setRoot(() => SceneRoot);
      setQuality(picked);
    })();
    return () => {
      cancelled = true;
    };
  }, [reducedMotion, forced, report]);

  const wrapper = cn("pointer-events-none fixed inset-x-0 top-0 -z-10 h-lvh", className);
  if (reducedMotion || quality === null) {
    return (
      <div className={wrapper}>
        <SceneFallback />
      </div>
    );
  }

  return (
    <div className={wrapper}>
      {Root && quality && (
        <div aria-hidden className={cn("size-full transition-opacity duration-700", ready ? "opacity-100" : "opacity-0")}>
          <Root quality={quality} stats={stats} report={report} onReady={onReady} />
        </div>
      )}
      {started && <ScenePreloader ready={ready} percent={percent} />}
    </div>
  );
}
