import { CatmullRomCurve3, Vector3 } from "three";

import { smoothstep } from "./math";

/** Number of the last beat. The home page has sections data-beat="0" … data-beat="6". */
export const LAST_BEAT = 6;

/**
 * How far each layer is "on" at a continuous beat value (0 → 6). Every layer eases in and out
 * over its own window, so scrolling back plays the story in reverse with no jumps.
 */
export function layerWeights(beat: number) {
  return {
    /** 0 = facade whole, 1 = dissolved (beat 1), reassembles before the city pull-out. */
    dissolve: smoothstep(0.1, 0.95, beat) * (1 - smoothstep(4.45, 5.35, beat)),
    fibre: smoothstep(0.35, 1, beat) * (1 - smoothstep(4.4, 5.1, beat)),
    /** The data-hall floor slice opening (beat 2). */
    slice: smoothstep(1.3, 2, beat) * (1 - smoothstep(2.45, 3, beat)),
    /** ELV devices: full at beat 3, linger dimly under the shield, gone for the city. */
    devices: smoothstep(2.35, 3, beat) * (1 - 0.6 * smoothstep(3.6, 4.3, beat)) * (1 - smoothstep(4.4, 5, beat)),
    shield: smoothstep(3.3, 4, beat) * (1 - smoothstep(4.55, 5.25, beat)),
    /** Networked city of light (beat 5), settling to a quiet glow at beat 6. */
    network: smoothstep(4.2, 5, beat) * (1 - 0.9 * smoothstep(5.4, 6, beat)),
  };
}

export type LayerWeights = ReturnType<typeof layerWeights>;

/** Camera per beat: what it looks at, and where it sits relative to that point (landscape framing). */
const FRAMES: { target: [number, number, number]; offset: [number, number, number] }[] = [
  { target: [0, 7.4, 0], offset: [11.5, -4.2, 21.5] }, // 0 the tower, crown and mast in frame
  { target: [0, 6.6, 0], offset: [5, 1.9, 7.8] }, // 1 fibre riser through the dissolved facade
  { target: [-0.6, 6.86, -0.7], offset: [2.6, 0.12, 0.1] }, // 2 eye level, looking down a contained cold aisle
  { target: [1.5, 0.5, 1.5], offset: [3.4, 1.4, 3] }, // 3 the entrance: cameras, readers, poles, lower floors
  { target: [0, 3.2, 0], offset: [-12, 6.5, 16] }, // 4 shield dome
  { target: [0, 2, 0], offset: [-16, 30, 40] }, // 5 networked city
  { target: [0, 7.8, 0], offset: [13, -2.6, 22] }, // 6 tower settles
];

const toCurve = (key: "target" | "offset") =>
  new CatmullRomCurve3(
    FRAMES.map((f) => new Vector3(...f[key])),
    false,
    "centripetal",
  );

export const targetCurve = toCurve("target");
export const offsetCurve = toCurve("offset");
