import { getGPUTier, type ModelEntry } from "detect-gpu";

import type { MapSize } from "./assets";

export type QualityTier = "desktop" | "mobile" | "low";

/**
 * Everything the scene scales by device. Built triangles (all layers): desktop ≈ 136k,
 * mobile/low ≈ 39.5k. Hidden layers skip their draws, but the desktop transmission pre-pass draws
 * the opaque scene twice while the lobby glass is in view.
 */
export type Quality = {
  tier: QualityTier;
  dpr: [number, number];
  /** N8AO + bloom + SMAA + tone mapping. Desktop on a capable GPU only. */
  post: boolean;
  antialias: boolean;
  /** Lobby glass with real transmission (an extra opaque pass). */
  transmission: boolean;
  envResolution: number;
  /** Load the theme's HDRI (≈ 0.9 MB) for lighting and reflections; otherwise Lightformers only. */
  hdri: boolean;
  /** Resolution of the downloaded PBR maps (public/textures). */
  mapSize: MapSize;
  contactShadowResolution: number;
  /** Sides of the tower's floor plate (curtain-wall bays per floor). */
  facets: number;
  floorsPerPanel: number;
  /** Fibre branches on every Nth floor, in this many directions. */
  fibreEvery: number;
  fibreDirections: number;
  tubeSegments: number;
  tubeRadial: number;
  /** Ladder-rack rung spacing (scene units). */
  rungSpacing: number;
  rackRows: number;
  ledsPerRack: number;
  /** Lower floors fitted with ceiling devices (APs, PA, BMS, domes). */
  deviceFloors: number;
  latheDetail: number;
  hexSize: number;
  hexBevel: boolean;
  cityRadius: number;
  cityMax: number;
  landmarks: boolean;
  arcs: number;
  arcRadius: number;
  stars: number;
  /** Ambient (idle) redraw rate. Scrolling renders every frame. */
  idleFps: number;
};

const LIGHT: Omit<Quality, "tier" | "dpr" | "antialias"> = {
  post: false,
  transmission: false,
  envResolution: 128,
  hdri: false,
  mapSize: "512",
  contactShadowResolution: 256,
  facets: 16,
  floorsPerPanel: 2,
  fibreEvery: 4,
  fibreDirections: 2,
  tubeSegments: 10,
  tubeRadial: 3,
  rungSpacing: 0.33,
  rackRows: 4,
  ledsPerRack: 3,
  deviceFloors: 3,
  latheDetail: 10,
  hexSize: 0.7,
  hexBevel: false,
  cityRadius: 30,
  cityMax: 240,
  landmarks: true,
  arcs: 14,
  arcRadius: 0.05,
  stars: 160,
  idleFps: 24,
};

export const QUALITY: Record<QualityTier, Quality> = {
  desktop: {
    tier: "desktop",
    dpr: [1, 2],
    post: true,
    antialias: false, // SMAA in the composer instead
    transmission: true,
    envResolution: 256,
    hdri: true,
    mapSize: "1k",
    contactShadowResolution: 512,
    facets: 24,
    floorsPerPanel: 1,
    fibreEvery: 2,
    fibreDirections: 4,
    tubeSegments: 14,
    tubeRadial: 5,
    rungSpacing: 0.165,
    rackRows: 6,
    ledsPerRack: 6,
    deviceFloors: 8,
    latheDetail: 16,
    hexSize: 0.45,
    hexBevel: true,
    cityRadius: 46,
    cityMax: 700,
    landmarks: true,
    arcs: 32,
    arcRadius: 0.035,
    stars: 500,
    idleFps: 30,
  },
  mobile: { ...LIGHT, tier: "mobile", dpr: [1, 1.5], antialias: false },
  low: { ...LIGHT, tier: "low", dpr: [1, 1.25], antialias: true },
};

/**
 * detect-gpu's benchmark tables, bundled and served from our own origin instead of its default
 * unpkg.com fetch: no third-party request before consent, and it works behind a strict CSP.
 * Only the one file matching the visitor's GPU vendor is downloaded.
 */
const BENCHMARKS: Record<string, () => Promise<{ default: unknown }>> = {
  "d-adreno.json": () => import("detect-gpu/dist/benchmarks/d-adreno.json"),
  "d-amd.json": () => import("detect-gpu/dist/benchmarks/d-amd.json"),
  "d-apple.json": () => import("detect-gpu/dist/benchmarks/d-apple.json"),
  "d-geforce.json": () => import("detect-gpu/dist/benchmarks/d-geforce.json"),
  "d-intel.json": () => import("detect-gpu/dist/benchmarks/d-intel.json"),
  "d-nvidia.json": () => import("detect-gpu/dist/benchmarks/d-nvidia.json"),
  "d-radeon.json": () => import("detect-gpu/dist/benchmarks/d-radeon.json"),
  "m-adreno.json": () => import("detect-gpu/dist/benchmarks/m-adreno.json"),
  "m-apple-ipad.json": () => import("detect-gpu/dist/benchmarks/m-apple-ipad.json"),
  "m-apple.json": () => import("detect-gpu/dist/benchmarks/m-apple.json"),
  "m-intel.json": () => import("detect-gpu/dist/benchmarks/m-intel.json"),
  "m-mali-t.json": () => import("detect-gpu/dist/benchmarks/m-mali-t.json"),
  "m-mali.json": () => import("detect-gpu/dist/benchmarks/m-mali.json"),
  "m-nvidia.json": () => import("detect-gpu/dist/benchmarks/m-nvidia.json"),
  "m-powervr.json": () => import("detect-gpu/dist/benchmarks/m-powervr.json"),
  "m-samsung.json": () => import("detect-gpu/dist/benchmarks/m-samsung.json"),
};

async function loadBenchmarks(file: string): Promise<ModelEntry[]> {
  const load = BENCHMARKS[file];
  if (!load) throw new Error(`No GPU benchmark table ${file}`);
  // First entry is the table's version string.
  return ((await load()).default as unknown[]).slice(1) as ModelEntry[];
}

/** True when this is a phone-sized or touch-first screen, whatever the GPU says. */
const smallScreen = () =>
  window.matchMedia("(max-width: 767px)").matches || window.matchMedia("(pointer: coarse)").matches;

/** Software rasterisers: WebGL works but every frame is CPU work, so they get the static fallback. */
const SOFTWARE = /swiftshader|llvmpipe|softpipe|lavapipe|software|basic render|microsoft basic|mesa offscreen/i;

/**
 * Picks the quality profile, or null when the device should get the static fallback:
 * no WebGL, a software renderer, a blocklisted GPU, a weak (tier ≤ 1) phone GPU, or Save-Data on.
 * One probe context serves both the renderer check and detect-gpu, then is released.
 */
export async function detectQuality(): Promise<Quality | null> {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (connection?.saveData) return null;

  let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
  try {
    const canvas = document.createElement("canvas");
    gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
  } catch {
    gl = null;
  }
  if (!gl) return null;
  try {
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER) ?? "");
    if (SOFTWARE.test(renderer)) return null;
    const gpu = await getGPUTier({ glContext: gl, override: { loadBenchmarks } }).catch(() => null);
    const phone = Boolean(gpu?.isMobile) || smallScreen();
    if (gpu && gpu.tier === 0) return null;
    if (!gpu || gpu.tier === 1) return phone ? null : QUALITY.low;
    return phone ? QUALITY.mobile : QUALITY.desktop;
  } finally {
    // Hand the probe context back now; browsers cap live WebGL contexts.
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  }
}
