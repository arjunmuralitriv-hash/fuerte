import {
  CanvasTexture,
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  NoColorSpace,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
} from "three";

import { random } from "./math";

/**
 * Every texture in the scene is drawn here at start-up (canvas or noise), so the scene ships no
 * image files. Each generator runs once and is cached for the page's lifetime.
 */

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("2D canvas unavailable");
  return { c, ctx };
}

function toTexture(c: HTMLCanvasElement, srgb: boolean): Texture {
  const t = new CanvasTexture(c);
  t.colorSpace = srgb ? SRGBColorSpace : NoColorSpace;
  t.wrapS = t.wrapT = RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

/** Tangent-space normal map from a height field (0..1), wrapping at the edges. */
function normalFromHeight(height: Float32Array, w: number, h: number, strength: number) {
  const data = new Uint8Array(w * h * 4);
  const at = (x: number, y: number) => height[((y + h) % h) * w + ((x + w) % w)];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * w + x) * 4;
      data[i] = ((-dx / len) * 0.5 + 0.5) * 255;
      data[i + 1] = ((dy / len) * 0.5 + 0.5) * 255;
      data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      data[i + 3] = 255;
    }
  }
  const t = new DataTexture(data, w, h);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.generateMipmaps = true;
  t.minFilter = LinearMipmapLinearFilter;
  t.magFilter = LinearFilter;
  t.needsUpdate = true;
  return t;
}

/** Height field from a canvas's luminance. */
function heightFromCanvas(c: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
  const { data } = ctx.getImageData(0, 0, c.width, c.height);
  const height = new Float32Array(c.width * c.height);
  for (let i = 0; i < height.length; i++) height[i] = (data[i * 4] * 0.3 + data[i * 4 + 1] * 0.59 + data[i * 4 + 2] * 0.11) / 255;
  return height;
}

/** Tileable value-noise fBm. `stretch` > 1 elongates along x (brushed metal). */
function noiseHeight(size: number, seed: number, octaves: number, stretch = 1) {
  const rand = random(seed);
  const height = new Float32Array(size * size);
  let amp = 1;
  let total = 0;
  for (let o = 0; o < octaves; o++) {
    const cells = 4 << o;
    const cellsX = Math.max(1, Math.round(cells / stretch));
    const grid = Array.from({ length: cellsX * cells }, rand);
    const g = (x: number, y: number) => grid[(y % cells) * cellsX + (x % cellsX)];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const fx = (x / size) * cellsX;
        const fy = (y / size) * cells;
        const x0 = Math.floor(fx);
        const y0 = Math.floor(fy);
        const tx = fx - x0;
        const ty = fy - y0;
        const sx = tx * tx * (3 - 2 * tx);
        const sy = ty * ty * (3 - 2 * ty);
        const top = g(x0, y0) + (g(x0 + 1, y0) - g(x0, y0)) * sx;
        const bottom = g(x0, y0 + 1) + (g(x0 + 1, y0 + 1) - g(x0, y0 + 1)) * sx;
        height[y * size + x] += (top + (bottom - top) * sy) * amp;
      }
    }
    total += amp;
    amp *= 0.5;
  }
  for (let i = 0; i < height.length; i++) height[i] /= total;
  return height;
}

function once<T>(make: () => T) {
  let value: T | undefined;
  return () => (value ??= make());
}

/** Board-formed concrete: soft mottling for slabs, core and podium. */
export const concreteNormal = once(() => normalFromHeight(noiseHeight(256, 3, 5), 256, 256, 3));

/** Brushed aluminium / powder-coat grain for mullions, racks and devices. */
export const brushedNormal = once(() => normalFromHeight(noiseHeight(256, 9, 4, 8), 256, 256, 1.5));

/* ------------------------------------------------------------------------------------------ */
/* Data hall                                                                                    */
/* ------------------------------------------------------------------------------------------ */

const RACK_W = 128;
const RACK_H = 448; // 42U at ~10.7 px per U

/** A 42U rack front: switches, 1U/2U servers with bezels and drive bays, storage, blanking panels. */
export const serverFaces = once(() =>
  [11, 23, 37].map((seed) => {
    const rand = random(seed);
    const { c, ctx } = canvas(RACK_W, RACK_H);
    const u = RACK_H / 42;
    ctx.fillStyle = "#0d0e10";
    ctx.fillRect(0, 0, RACK_W, RACK_H);
    // Mounting rails with square holes.
    ctx.fillStyle = "#24262b";
    ctx.fillRect(0, 0, 8, RACK_H);
    ctx.fillRect(RACK_W - 8, 0, 8, RACK_H);
    ctx.fillStyle = "#08090a";
    for (let y = 2; y < RACK_H; y += u / 3) {
      ctx.fillRect(3, y, 2, 2);
      ctx.fillRect(RACK_W - 5, y, 2, 2);
    }
    let slot = 0;
    while (slot < 42) {
      const r = rand();
      const size = slot < 2 ? 1 : r < 0.45 ? 1 : r < 0.75 ? 2 : r < 0.85 ? 4 : 1;
      const kind = slot < 2 ? "switch" : r > 0.93 ? "blank" : size === 4 ? "storage" : "server";
      const units = Math.min(size, 42 - slot);
      const y = slot * u + 0.5;
      const h = units * u - 1;
      const x = 10;
      const w = RACK_W - 20;
      if (kind === "blank") {
        ctx.fillStyle = "#16171a";
        ctx.fillRect(x, y, w, h);
      } else if (kind === "switch") {
        ctx.fillStyle = "#1b1d21";
        ctx.fillRect(x, y, w, h);
        for (let p = 0; p < 24; p++) {
          ctx.fillStyle = "#050506";
          ctx.fillRect(x + 4 + (p % 12) * 8.3, y + 1.5 + Math.floor(p / 12) * 4.5, 6, 3.5);
        }
      } else {
        const silver = rand() < 0.35;
        ctx.fillStyle = silver ? "#8b9099" : "#202227";
        ctx.fillRect(x, y, w, h);
        // Bezel edge highlight and handle ears.
        ctx.fillStyle = silver ? "#b7bcc4" : "#30333a";
        ctx.fillRect(x, y, w, 1);
        ctx.fillRect(x, y, 4, h);
        ctx.fillRect(x + w - 4, y, 4, h);
        // Drive bays.
        const rows = kind === "storage" ? 4 : units;
        const cols = kind === "storage" ? 4 : 8;
        const bayW = (w - 30) / cols;
        const bayH = h / rows - 1.5;
        for (let rr = 0; rr < rows; rr++) {
          for (let cc = 0; cc < cols; cc++) {
            const bx = x + 7 + cc * bayW;
            const by = y + 1 + rr * (bayH + 1.5);
            ctx.fillStyle = silver ? "#5d626b" : "#121316";
            ctx.fillRect(bx, by, bayW - 1.5, bayH);
            ctx.fillStyle = silver ? "#a9aeb6" : "#2a2c31";
            ctx.fillRect(bx, by, bayW - 1.5, 0.8);
          }
        }
        // Vent strip by the controls.
        ctx.fillStyle = "#0a0a0b";
        for (let v = 0; v < h - 2; v += 2) ctx.fillRect(x + w - 18, y + 1 + v, 10, 1);
      }
      slot += units;
    }
    const map = toTexture(c, true);
    map.wrapS = map.wrapT = RepeatWrapping;
    const normal = normalFromHeight(heightFromCanvas(c, ctx), RACK_W, RACK_H, 2.5);
    return { map, normal };
  }),
);

/** Perforated rack door: one hole per tile, repeated across the door. Alpha (white = metal) and normal. */
export const perforation = once(() => {
  const { c, ctx } = canvas(32, 32);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, 32, 32);
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.arc(16, 16, 11, 0, Math.PI * 2);
  ctx.fill();
  const alpha = toTexture(c, false);
  const normal = normalFromHeight(heightFromCanvas(c, ctx), 32, 32, 4);
  return { alpha, normal };
});

/** Fan-wall front of an in-row cooling unit, and a UPS cabinet front with its status display. */
export const cabinetFaces = once(() => {
  const cooler = canvas(RACK_W, RACK_H);
  {
    const { ctx } = cooler;
    ctx.fillStyle = "#c9ccd1";
    ctx.fillRect(0, 0, RACK_W, RACK_H);
    ctx.fillStyle = "#1c1d20";
    ctx.fillRect(40, 18, 48, 16);
    for (let f = 0; f < 3; f++) {
      const cy = 110 + f * 120;
      for (let r = 44; r > 4; r -= 5) {
        ctx.strokeStyle = r % 10 === 4 ? "#5a5e66" : "#9ea3ab";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(64, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = "#2a2c31";
      ctx.beginPath();
      ctx.arc(64, cy, 10, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const ups = canvas(RACK_W, RACK_H);
  {
    const { ctx } = ups;
    ctx.fillStyle = "#26282d";
    ctx.fillRect(0, 0, RACK_W, RACK_H);
    ctx.fillStyle = "#0b0c0e";
    ctx.fillRect(30, 40, 68, 36);
    ctx.fillStyle = "#3b3e45";
    for (let y = 120; y < RACK_H - 20; y += 6) ctx.fillRect(16, y, RACK_W - 32, 2);
  }
  const upsGlow = canvas(RACK_W, RACK_H);
  {
    const { ctx } = upsGlow;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, RACK_W, RACK_H);
    ctx.fillStyle = "#3fd27a";
    ctx.fillRect(34, 44, 40, 4);
    ctx.fillRect(34, 52, 28, 4);
    ctx.fillStyle = "#9fe8ff";
    ctx.fillRect(34, 62, 58, 10);
  }
  return {
    cooler: { map: toTexture(cooler.c, true), normal: normalFromHeight(heightFromCanvas(cooler.c, cooler.ctx), RACK_W, RACK_H, 3) },
    ups: {
      map: toTexture(ups.c, true),
      normal: normalFromHeight(heightFromCanvas(ups.c, ups.ctx), RACK_W, RACK_H, 3),
      emissive: toTexture(upsGlow.c, true),
    },
  };
});

/** Raised-floor tiles (600 mm grid); the perforated version is laid along cold aisles. */
export const floorTiles = once(() => {
  const make = (perforated: boolean) => {
    const { c, ctx } = canvas(128, 128);
    ctx.fillStyle = "#b9bdc4";
    ctx.fillRect(0, 0, 128, 128);
    if (perforated) {
      ctx.fillStyle = "#4a4e55";
      for (let y = 6; y < 128; y += 7) for (let x = 6; x < 128; x += 7) ctx.fillRect(x, y, 3, 3);
    }
    ctx.fillStyle = "#6b7078";
    ctx.fillRect(0, 0, 128, 2);
    ctx.fillRect(0, 0, 2, 128);
    return { map: toTexture(c, true), normal: normalFromHeight(heightFromCanvas(c, ctx), 128, 128, 2) };
  };
  return { solid: make(false), perforated: make(true) };
});

/** Ladder cable tray seen from above: rails along the edges, rungs across (alpha). */
export const ladderTray = once(() => {
  const { c, ctx } = canvas(64, 64);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, 64, 8);
  ctx.fillRect(0, 56, 64, 8);
  ctx.fillRect(28, 0, 8, 64);
  return toTexture(c, false);
});

/** A 1U fibre patch panel: two rows of duplex LC ports. */
export const patchPanel = once(() => {
  const { c, ctx } = canvas(128, 16);
  ctx.fillStyle = "#1a1b1f";
  ctx.fillRect(0, 0, 128, 16);
  for (let p = 0; p < 24; p++) {
    ctx.fillStyle = p % 6 === 0 ? "#2f6fdf" : "#0b0b0c";
    ctx.fillRect(6 + (p % 12) * 9.6, 2 + Math.floor(p / 12) * 7, 7, 5);
  }
  return toTexture(c, true);
});

/** PA ceiling-speaker grille: fine dot perforation (alpha-free, normal only). */
export const speakerGrille = once(() => {
  const { c, ctx } = canvas(64, 64);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = "#000";
  for (let y = 2; y < 64; y += 4) for (let x = 2; x < 64; x += 4) ctx.fillRect(x, y, 2, 2);
  return normalFromHeight(heightFromCanvas(c, ctx), 64, 64, 3);
});

/* ------------------------------------------------------------------------------------------ */
/* City                                                                                         */
/* ------------------------------------------------------------------------------------------ */

const FACADE_TILE = 256; // 4 bays × 4 floors per tile

/**
 * City facades, three looks (punched windows, ribbon windows, full glass). `map` is the daytime
 * facade; `lit` is a large sheet of randomly lit windows sampled at a per-building offset, so no
 * two buildings light the same way.
 */
export const cityFacades = once(() => {
  const looks = [
    { wall: "#8d8a86", glass: "#2a3138", bayW: 0.6, bayH: 0.55 },
    { wall: "#6f7277", glass: "#232a31", bayW: 0.94, bayH: 0.45 },
    { wall: "#3b4048", glass: "#344150", bayW: 0.96, bayH: 0.86 },
  ];
  const maps = looks.map((look) => {
    const { c, ctx } = canvas(FACADE_TILE, FACADE_TILE);
    const cell = FACADE_TILE / 4;
    ctx.fillStyle = look.wall;
    ctx.fillRect(0, 0, FACADE_TILE, FACADE_TILE);
    for (let fy = 0; fy < 4; fy++) {
      for (let bx = 0; bx < 4; bx++) {
        const w = cell * look.bayW;
        const h = cell * look.bayH;
        const x = bx * cell + (cell - w) / 2;
        const y = fy * cell + (cell - h) / 2;
        const g = ctx.createLinearGradient(x, y, x + w, y + h);
        g.addColorStop(0, look.glass);
        g.addColorStop(1, "#56606b");
        ctx.fillStyle = g;
        ctx.fillRect(x, y, w, h);
      }
    }
    return toTexture(c, true);
  });

  // 16 × 16 windows; warm, neutral and a few cool, many dark.
  const rand = random(101);
  const size = 512;
  const { c, ctx } = canvas(size, size);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, size, size);
  const cell = size / 16;
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const r = rand();
      if (r > 0.3) continue;
      ctx.fillStyle = r < 0.2 ? "#ffcf9e" : r < 0.27 ? "#fff3e0" : "#cfe3ff";
      ctx.globalAlpha = 0.5 + rand() * 0.5;
      ctx.fillRect(x * cell + cell * 0.12, y * cell + cell * 0.2, cell * 0.76, cell * 0.6);
    }
  }
  ctx.globalAlpha = 1;
  return { maps, lit: toTexture(c, true) };
});
