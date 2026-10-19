import {
  BoxGeometry,
  CircleGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  LatheGeometry,
  Shape,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  type BufferGeometry,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

/**
 * Procedural equipment models. Each returns one geometry whose groups line up with a material
 * array, so a whole device type is a single InstancedMesh. Sizes are in scene units
 * (1 unit ≈ 12 m), drawn about 2.5× life size; ElvDevices scales them up again for the beat-3 camera.
 */

/** Merge parts into one geometry with one group per part (all parts made non-indexed first). */
function parts(...geometries: BufferGeometry[]) {
  const flat = geometries.map((g) => {
    const out = g.index ? g.toNonIndexed() : g;
    if (out !== g) g.dispose();
    return out;
  });
  const merged = mergeGeometries(flat, true);
  flat.forEach((g) => g.dispose());
  if (!merged) throw new Error("Could not merge model parts");
  return merged;
}

/** Lathe with outward normals: profiles are given in drawing order and flipped to run bottom-up. */
const lathe = (points: [number, number][], segments: number) => {
  const upward = points[0][1] <= points[points.length - 1][1] ? points : [...points].reverse();
  return new LatheGeometry(
    upward.map(([r, y]) => new Vector2(r, y)),
    segments,
  );
};

/** Ceiling dome camera, hanging from y = 0. Groups: housing, smoked dome, lens. */
export function domeCamera(detail: number) {
  const housing = lathe(
    [
      [0, 0],
      [0.036, 0],
      [0.038, -0.004],
      [0.036, -0.01],
      [0.029, -0.013],
      [0, -0.013],
    ],
    detail,
  );
  const dome = new SphereGeometry(0.027, detail, Math.max(4, detail / 3), 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).translate(0, -0.012, 0);
  const lens = new CylinderGeometry(0.008, 0.009, 0.012, 10).rotateX(0.6).translate(0, -0.026, 0.004);
  return parts(housing, dome, lens);
}

/** Wall-bracket bullet camera, mount at the origin, looking down +Z. Groups: body, sunshield, lens, bracket. */
export function bulletCamera(detail: number) {
  const body = lathe(
    [
      [0, -0.035],
      [0.012, -0.034],
      [0.014, -0.03],
      [0.014, 0.03],
      [0.0125, 0.035],
      [0, 0.035],
    ],
    detail,
  )
    .rotateX(Math.PI / 2)
    .translate(0, 0, 0.045);
  const arc = new Shape();
  arc.absarc(0, 0, 0.0185, 0.15, Math.PI - 0.15, false);
  arc.absarc(0, 0, 0.0165, Math.PI - 0.15, 0.15, true);
  const shield = new ExtrudeGeometry(arc, { depth: 0.08, bevelEnabled: false, curveSegments: detail / 2 }).translate(0, 0, 0.008);
  const lens = new CircleGeometry(0.0105, detail).translate(0, 0, 0.0801);
  const bracket = parts(
    new BoxGeometry(0.03, 0.03, 0.006),
    new CylinderGeometry(0.005, 0.005, 0.03, 8).rotateX(Math.PI / 2).translate(0, -0.005, 0.016),
  );
  bracket.clearGroups();
  return parts(body, shield, lens, bracket);
}

/** Ceiling Wi-Fi access point, hanging from y = 0. Groups: body, status ring. */
/** `rounding`: segments per rounded edge (2 on desktop, 1 on the light profiles). */
export function accessPoint(rounding: number) {
  const body = new RoundedBoxGeometry(0.065, 0.012, 0.065, rounding, 0.006).translate(0, -0.006, 0);
  const ring = new TorusGeometry(0.012, 0.0015, 4, rounding > 1 ? 20 : 12).rotateX(Math.PI / 2).translate(0, -0.0125, 0);
  return parts(body, ring);
}

/** Flush ceiling PA speaker, face at y = 0 looking down. Groups: trim ring, grille. */
export function ceilingSpeaker(detail: number) {
  const trim = lathe(
    [
      [0.022, 0],
      [0.03, 0],
      [0.03, -0.002],
      [0.023, -0.003],
    ],
    detail,
  );
  const grille = new CircleGeometry(0.0225, detail).rotateX(Math.PI / 2).translate(0, -0.0025, 0);
  return parts(trim, grille);
}

/** Wall-mounted BMS room sensor, back at z = 0. Groups: case, display. */
export function bmsSensor(rounding: number) {
  const body = new RoundedBoxGeometry(0.032, 0.045, 0.01, rounding, 0.003).translate(0, 0, 0.005);
  const display = new BoxGeometry(0.02, 0.012, 0.001).translate(0, 0.008, 0.0104);
  return parts(body, display);
}

/** Access-control card reader, back at z = 0. Groups: case, read pad. */
export function cardReader(rounding: number) {
  const body = new RoundedBoxGeometry(0.024, 0.048, 0.009, rounding, 0.003).translate(0, 0, 0.0045);
  const pad = new BoxGeometry(0.017, 0.022, 0.001).translate(0, -0.006, 0.0094);
  return parts(body, pad);
}

/** PA horn speaker for the perimeter poles, mouth looking down +Z. */
export function hornSpeaker(detail: number) {
  return lathe(
    [
      [0.006, 0],
      [0.009, 0.02],
      [0.018, 0.045],
      [0.026, 0.055],
      [0.024, 0.056],
    ],
    detail,
  ).rotateX(Math.PI / 2);
}

/** A U-shaped cable tray section, 1 unit long along +X, open at the top. */
export function uTray() {
  const s = new Shape();
  s.moveTo(-0.03, 0.02);
  s.lineTo(-0.03, 0);
  s.lineTo(0.03, 0);
  s.lineTo(0.03, 0.02);
  s.lineTo(0.027, 0.02);
  s.lineTo(0.027, 0.003);
  s.lineTo(-0.027, 0.003);
  s.lineTo(-0.027, 0.02);
  s.closePath();
  return new ExtrudeGeometry(s, { depth: 1, bevelEnabled: false }).rotateY(Math.PI / 2);
}

/** Shield cell: a hexagon (vertex on +X) with bevelled edges, front face toward +Z. */
export function hexCell(radius: number, bevel: boolean) {
  const s = new Shape();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    if (i === 0) s.moveTo(Math.cos(a) * radius, Math.sin(a) * radius);
    else s.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
  }
  s.closePath();
  const depth = radius * 0.08;
  return new ExtrudeGeometry(s, {
    depth,
    bevelEnabled: bevel,
    bevelThickness: radius * 0.06,
    bevelSize: radius * 0.08,
    bevelSegments: 1,
    curveSegments: 1,
  }).translate(0, 0, -depth / 2);
}
