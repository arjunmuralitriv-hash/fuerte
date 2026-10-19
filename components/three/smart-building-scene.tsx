"use client";

import { Canvas } from "@react-three/fiber";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { NeutralToneMapping, NoToneMapping } from "three";

import { SceneFallback } from "@/components/three/scene-fallback";
import { ScenePreloader } from "@/components/three/scene-preloader";
import { City } from "@/components/three/smart-building/city";
import { SceneContext, type SceneState } from "@/components/three/smart-building/context";
import { DataHall } from "@/components/three/smart-building/data-hall";
import { Director, Effects, Ready, Stats } from "@/components/three/smart-building/director";
import { ElvDevices } from "@/components/three/smart-building/elv-devices";
import { Atmosphere } from "@/components/three/smart-building/environment";
import { endAllLoading, endLoading, startLoading } from "@/components/three/smart-building/loading";
import { readPalette, type Palette } from "@/components/three/smart-building/palette";
import {
  QUALITY,
  detectQuality,
  hasWebGL,
  type Quality,
  type QualityTier,
} from "@/components/three/smart-building/quality";
import { Shield } from "@/components/three/smart-building/shield";
import { Tower } from "@/components/three/smart-building/tower";
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
 */
export default function SmartBuildingScene({ className, quality: forced, stats }: SmartBuildingSceneProps) {
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => true,
  );
  /** undefined while detecting, null when the static fallback should show. */
  const [quality, setQuality] = useState<Quality | null>();
  const [palette, setPalette] = useState<Palette>();
  const [ready, setReady] = useState(false);
  const [state] = useState<SceneState>(() => ({ target: 0, beat: 0, active: true }));
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (reducedMotion) return;
    let cancelled = false;
    startLoading();
    (async () => {
      const picked = !hasWebGL() ? null : forced ? QUALITY[forced] : await detectQuality();
      if (cancelled) return;
      endLoading("gpu");
      if (!picked) endAllLoading();
      setQuality(picked);
    })();
    return () => {
      cancelled = true;
      endAllLoading();
    };
  }, [reducedMotion, forced]);

  // Read the tokens a frame after the theme flips, once next-themes has swapped the class on <html>.
  useEffect(() => {
    const id = requestAnimationFrame(() =>
      setPalette(
        readPalette(resolvedTheme ? resolvedTheme === "dark" : document.documentElement.classList.contains("dark")),
      ),
    );
    return () => cancelAnimationFrame(id);
  }, [resolvedTheme]);

  const context = useMemo(
    () => (quality && palette ? { state, quality, palette } : null),
    [state, quality, palette],
  );
  const onReady = useCallback(() => setReady(true), []);

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
      {context && (
        <div aria-hidden className={cn("size-full transition-opacity duration-700", ready ? "opacity-100" : "opacity-0")}>
          <Canvas
            frameloop="demand"
            dpr={context.quality.dpr}
            onCreated={({ gl }) => {
              // Neutral (Khronos PBR) tone mapping keeps the brand red true; the desktop composer applies its own.
              gl.toneMapping = context.quality.post ? NoToneMapping : NeutralToneMapping;
              // The lobby's transmission pass only needs a soft, half-resolution view through the glass.
              gl.transmissionResolutionScale = 0.5;
              // Contact shadows render into a target that must clear to transparent, not opaque black
              // (the canvas itself has no alpha channel, so this changes nothing on screen).
              gl.setClearColor(0x000000, 0);
            }}
            gl={{
              antialias: context.quality.antialias && !context.quality.post,
              alpha: false,
              stencil: false,
              powerPreference: "high-performance",
            }}
            camera={{ fov: 38, near: 0.1, far: 600, position: [9.5, 2.8, 17.5] }}
          >
            <SceneContext value={context}>
              <Director />
              <Atmosphere />
              <Tower />
              <DataHall />
              <ElvDevices />
              <Shield />
              <City />
              {context.quality.post && <Effects />}
              <Ready onReady={onReady} />
              {stats && <Stats />}
            </SceneContext>
          </Canvas>
        </div>
      )}
      <ScenePreloader ready={ready} />
    </div>
  );
}
