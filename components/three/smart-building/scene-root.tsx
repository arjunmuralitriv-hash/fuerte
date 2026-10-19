"use client";

import { Canvas } from "@react-three/fiber";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useMemo, useState, type ComponentType } from "react";
import { NeutralToneMapping, NoToneMapping, type Texture } from "three";

import { MAP_FILES, loadEnvironment, loadMaps, type SceneMaps } from "./assets";
import { City } from "./city";
import { SceneContext, type SceneState } from "./context";
import { DataHall } from "./data-hall";
import { Director, Effects, Stats } from "./director";
import { ElvDevices } from "./elv-devices";
import { Atmosphere } from "./environment";
import { readPalette, type Palette } from "./palette";
import type { Quality } from "./quality";
import { Shield } from "./shield";
import { Stager } from "./stager";
import type { ReportProgress } from "./startup";
import { Tower } from "./tower";

type Theme = "dark" | "light";

export type SceneRootProps = {
  quality: Quality;
  stats?: boolean;
  report: ReportProgress;
  /** Called once every layer is built and compiled and a first frame has been drawn. */
  onReady: () => void;
};

/**
 * Everything that needs three.js: assets, palette, the canvas and the staged layers. Loaded by
 * the shell (`smart-building-scene.tsx`) only after the page is idle and the GPU check passed.
 * Lights come first (Atmosphere, then the data hall with its work light), so later layers compile
 * once against the final light setup instead of being recompiled when a light is added.
 */
export function SceneRoot({ quality, stats, report, onReady }: SceneRootProps) {
  const [maps, setMaps] = useState<SceneMaps | null>();
  /** HDRIs by theme: undefined until requested, null if unavailable. Each loads at most once. */
  const [environments, setEnvironments] = useState<Partial<Record<Theme, Texture | null>>>({});
  const [palette, setPalette] = useState<Palette>();
  const [ready, setReady] = useState(false);
  const [state] = useState<SceneState>(() => ({ target: 0, beat: 0, active: true }));
  const { resolvedTheme } = useTheme();

  // Downloads: the PBR maps and the current theme's HDRI, counted file by file.
  useEffect(() => {
    let cancelled = false;
    const theme: Theme = document.documentElement.classList.contains("dark") ? "dark" : "light";
    const total = MAP_FILES + (quality.hdri ? 1 : 0);
    let done = 0;
    const tick = () => report("assets", ++done, total);
    report("assets", 0, total);
    Promise.all([
      loadMaps(quality.mapSize, tick),
      quality.hdri ? loadEnvironment(theme).then((t) => (tick(), t)) : Promise.resolve(null),
    ]).then(([loaded, environment]) => {
      if (cancelled) return;
      setMaps(loaded);
      if (quality.hdri) setEnvironments((e) => ({ ...e, [theme]: environment }));
    });
    return () => {
      cancelled = true;
    };
  }, [quality, report]);

  // Read the tokens a frame after the theme flips, once next-themes has swapped the class on <html>.
  useEffect(() => {
    const id = requestAnimationFrame(() =>
      setPalette(
        readPalette(resolvedTheme ? resolvedTheme === "dark" : document.documentElement.classList.contains("dark")),
      ),
    );
    return () => cancelAnimationFrame(id);
  }, [resolvedTheme]);

  // After a theme switch, fetch that theme's HDRI once; the Lightformers light the scene meanwhile.
  const theme: Theme | undefined = palette ? (palette.dark ? "dark" : "light") : undefined;
  useEffect(() => {
    if (!quality.hdri || !theme || maps === undefined || theme in environments) return;
    let cancelled = false;
    loadEnvironment(theme).then((t) => {
      if (!cancelled) setEnvironments((e) => ({ ...e, [theme]: t }));
    });
    return () => {
      cancelled = true;
    };
  }, [quality, theme, environments, maps]);

  const environment = theme ? (environments[theme] ?? null) : null;
  const context = useMemo(
    () => (palette && maps !== undefined ? { state, quality, palette, maps, environment } : null),
    [state, quality, palette, maps, environment],
  );
  const layers = useMemo<[string, ComponentType][]>(
    () => [
      ["atmosphere", Atmosphere],
      ["hall", DataHall],
      ["tower", Tower],
      ["devices", ElvDevices],
      ["shield", Shield],
      ["city", City],
      ...(quality.post ? ([["effects", Effects]] as [string, ComponentType][]) : []),
    ],
    [quality.post],
  );
  const finish = useCallback(() => {
    setReady(true);
    onReady();
  }, [onReady]);

  if (!context) return null;
  return (
    <Canvas
      // Nothing draws while the layers are staged; the stager renders one warm-up frame itself.
      frameloop={ready ? "demand" : "never"}
      dpr={quality.dpr}
      onCreated={({ gl }) => {
        // Neutral (Khronos PBR) tone mapping keeps the brand red true; the desktop composer applies its own.
        gl.toneMapping = quality.post ? NoToneMapping : NeutralToneMapping;
        // The lobby's transmission pass only needs a soft, half-resolution view through the glass.
        gl.transmissionResolutionScale = 0.5;
        // Contact shadows render into a target that must clear to transparent, not opaque black
        // (the canvas itself has no alpha channel, so this changes nothing on screen).
        gl.setClearColor(0x000000, 0);
      }}
      gl={{
        antialias: quality.antialias && !quality.post,
        alpha: false,
        stencil: false,
        powerPreference: "high-performance",
      }}
      camera={{ fov: 38, near: 0.1, far: 600, position: [9.5, 2.8, 17.5] }}
    >
      <SceneContext value={context}>
        <Director />
        <Stager layers={layers} report={report} onReady={finish} />
        {stats && <Stats />}
      </SceneContext>
    </Canvas>
  );
}
