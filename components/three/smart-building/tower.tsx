"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import {
  BoxGeometry,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  Euler,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Quaternion,
  SphereGeometry,
  TubeGeometry,
  Vector3,
  BufferAttribute,
  type BufferGeometry,
  type Group,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import type { SceneMaps } from "./assets";
import { useScene } from "./context";
import { disposeMeshes, instanced, place } from "./instancing";
import { applyGlowBlending, createFlowMaterial } from "./materials";
import { random } from "./math";
import { uTray } from "./models";
import { createBuildingMaterials, disposeMaterials } from "./pbr";
import type { Quality } from "./quality";
import { patchPanel } from "./textures";
import { layerWeights } from "./timeline";

/** Tower dimensions in scene units (1 unit ≈ 12 m). Three setbacks, a tapered crown and a mast. */
export const TOWER = {
  floorHeight: 0.33,
  podiumHeight: 0.75,
  floors: 36,
  sections: [
    { from: 0, until: 14, radius: 1.85 },
    { from: 14, until: 27, radius: 1.62 },
    { from: 27, until: 36, radius: 1.38 },
  ],
  coreHalf: 0.4,
  /** The data hall: a double-height slice that opens at beat 2. */
  hallFloor: 18,
  hallFloors: 2,
  lift: 1.25,
} as const;

export const floorY = (floor: number) => TOWER.podiumHeight + floor * TOWER.floorHeight;
export const radiusAt = (floor: number) =>
  (TOWER.sections.find((s) => floor < s.until) ?? TOWER.sections[TOWER.sections.length - 1]).radius;
export const TOWER_TOP = floorY(TOWER.floors);
const CROWN_HEIGHT = 1.5;
const CROWN_TOP = 0.55;
const SPIRE_HEIGHT = 1.9;
export const SPIRE_TOP = TOWER_TOP + CROWN_HEIGHT + SPIRE_HEIGHT;
/** First floor above the data hall: everything from here up lifts when the slice opens. */
export const UPPER_FLOOR = TOWER.hallFloor + TOWER.hallFloors;
export const PODIUM_RADIUS = 2.3;
const isHall = (floor: number) => floor >= TOWER.hallFloor && floor < UPPER_FLOOR;
const BREAKS = [14, 27, TOWER.hallFloor, UPPER_FLOOR, TOWER.floors];

type Lists = { m: Matrix4[]; seed: number[] };
const lists = (): { lower: Lists; upper: Lists } => ({ lower: { m: [], seed: [] }, upper: { m: [], seed: [] } });

function createMaterials(quality: Quality, maps: SceneMaps | null) {
  return {
    ...createBuildingMaterials(TOWER_TOP, quality.transmission, maps),
    crownGlass: new MeshPhysicalMaterial({ color: "#1b232c", roughness: 0.08, metalness: 0.3, clearcoat: 0.5, envMapIntensity: 1.6 }),
    patchFront: new MeshStandardMaterial({ map: patchPanel(), roughness: 0.5, metalness: 0.3 }),
    beacon: new MeshBasicMaterial({ toneMapped: false }),
    spine: createFlowMaterial("y"),
    branch: createFlowMaterial("u"),
  };
}
type TowerMaterials = ReturnType<typeof createMaterials>;

/**
 * The core is a unit-height box stretched to the tower's height each frame; its side UVs are
 * pre-scaled by that height so the concrete texture keeps square texels instead of streaking.
 */
function coreGeometry() {
  const width = TOWER.coreHalf * 2;
  const geo = new BoxGeometry(width, 1, width).translate(0, 0.5, 0);
  const uv = geo.attributes.uv;
  const normal = geo.attributes.normal;
  for (let i = 0; i < uv.count; i++) {
    if (Math.abs(normal.getY(i)) < 0.5) uv.setY(i, uv.getY(i) * (TOWER_TOP / width));
  }
  return geo;
}

function buildTower(quality: Quality, m: TowerMaterials) {
  const rand = random(11);
  const N = quality.facets;
  const step = (Math.PI * 2) / N;
  const box = new BoxGeometry(1, 1, 1);

  /* Curtain wall: per bay and floor, a vision-glass pane over an aluminium spandrel. */
  const glass = lists();
  const spandrel = lists();
  const band = lists();
  for (let f = 0; f < TOWER.floors; ) {
    const next = Math.min(f + quality.floorsPerPanel, ...BREAKS.filter((b) => b > f));
    const rows = next - f;
    const r = radiusAt(f);
    const apothem = r * Math.cos(step / 2);
    const width = 2 * r * Math.sin(step / 2);
    const side = f >= UPPER_FLOOR ? "upper" : "lower";
    const y0 = floorY(f);
    const gh = rows * TOWER.floorHeight - 0.07;
    for (let k = 0; k < N; k++) {
      const a = (k + 0.5) * step;
      const c = Math.cos(a);
      const s = Math.sin(a);
      glass[side].m.push(place(c * apothem, y0 + 0.07 + gh / 2, s * apothem, Math.PI / 2 - a, width * 0.97, gh, 0.02));
      glass[side].seed.push(rand(), rand());
      // The brochure's red diagonal cut, wrapped round the tower as a helix of red spandrels.
      const h = (f + rows / 2) / TOWER.floors;
      const inBand = Math.abs(((a / (Math.PI * 2) + h * 0.8) % 1) - 0.5) < 0.035;
      const target = inBand ? band : spandrel;
      target[side].m.push(
        place(c * (apothem + 0.012), y0 + 0.035, s * (apothem + 0.012), Math.PI / 2 - a, width * 0.995, 0.07, 0.04),
      );
      target[side].seed.push(rand(), 1);
    }
    f = next;
  }

  /* Mullions: one continuous aluminium fin per bay edge per setback. */
  const mullions = lists();
  for (const section of TOWER.sections) {
    const side = section.from >= UPPER_FLOOR ? "upper" : "lower";
    const y0 = floorY(section.from);
    const y1 = floorY(section.until);
    for (let k = 0; k < N; k++) {
      const a = k * step;
      mullions[side].m.push(
        place(Math.cos(a) * section.radius, (y0 + y1) / 2, Math.sin(a) * section.radius, Math.PI / 2 - a, 0.03, y1 - y0, 0.06),
      );
      mullions[side].seed.push(rand(), 1);
    }
  }

  /* Structure: slabs, setback terraces with parapets and rooftop plant, perimeter columns. */
  const slabGeo = new CylinderGeometry(1, 1, 0.06, N);
  const slabs = lists();
  for (let f = 0; f < TOWER.floors; f++) {
    if (f > TOWER.hallFloor && f < UPPER_FLOOR) continue;
    const r = radiusAt(f) - 0.05;
    slabs[f >= UPPER_FLOOR ? "upper" : "lower"].m.push(place(0, floorY(f), 0, 0, r, 1, r));
  }
  const terraces = lists();
  const plant = lists();
  for (const [i, section] of TOWER.sections.slice(0, -1).entries()) {
    const above = TOWER.sections[i + 1];
    const side = above.from >= UPPER_FLOOR ? "upper" : "lower";
    const y = floorY(above.from);
    terraces[side].m.push(place(0, y + 0.01, 0, 0, section.radius, 1.4, section.radius));
    const mid = (section.radius + above.radius) / 2;
    const count = Math.round(mid * 4.5);
    for (let p = 0; p < count; p++) {
      const a = (p / count) * Math.PI * 2 + 0.3;
      plant[side].m.push(place(Math.cos(a) * mid, y + 0.07, Math.sin(a) * mid, Math.PI / 2 - a, 0.13, 0.08, 0.1));
    }
  }
  const columnGeo = new CylinderGeometry(0.035, 0.035, 1, 8).translate(0, 0.5, 0);
  const columns = lists();
  const segments: [number, number][] = [
    [0, 14],
    [14, TOWER.hallFloor],
    [UPPER_FLOOR, 27],
    [27, 36],
  ];
  for (const [from, until] of segments) {
    const r = radiusAt(from) - 0.14;
    const side = from >= UPPER_FLOOR ? "upper" : "lower";
    for (let k = 0; k < N / 3; k++) {
      const a = ((k + 0.5) / (N / 3)) * Math.PI * 2;
      columns[side].m.push(place(Math.cos(a) * r, floorY(from), Math.sin(a) * r, 0, 1, floorY(until) - floorY(from), 1));
    }
  }

  /* Crown: dark glass frustum wrapped in tapered aluminium fins; mast with platforms and beacon. */
  const R3 = TOWER.sections[2].radius;
  const tilt = Math.atan((R3 - CROWN_TOP) / CROWN_HEIGHT);
  const finLength = CROWN_HEIGHT / Math.cos(tilt);
  const fins = Array.from({ length: N }, (_, k) => {
    const a = k * step;
    const r = (R3 + CROWN_TOP) / 2 + 0.02;
    const q = new Quaternion().setFromEuler(new Euler(-tilt, Math.PI / 2 - a, 0, "YXZ"));
    return new Matrix4().compose(
      new Vector3(Math.cos(a) * r, TOWER_TOP + CROWN_HEIGHT / 2, Math.sin(a) * r),
      q,
      new Vector3(0.025, finLength, 0.1),
    );
  });

  /* Podium: lobby ring of glass between a granite plinth and a concrete roof, entrance canopy. */
  const lobbyFins = Array.from({ length: 48 }, (_, k) => {
    const a = (k / 48) * Math.PI * 2;
    return place(Math.cos(a) * (PODIUM_RADIUS + 0.01), 0.37, Math.sin(a) * (PODIUM_RADIUS + 0.01), Math.PI / 2 - a, 0.02, 0.62, 0.035);
  });
  const entrance = Math.PI / 4;
  const canopyR = PODIUM_RADIUS + 0.27;
  const podiumBits = [
    place(Math.cos(entrance) * canopyR, 0.63, Math.sin(entrance) * canopyR, Math.PI / 2 - entrance, 0.8, 0.035, 0.55),
    ...[-1, 1].map((sgn) => {
      const a = entrance + sgn * 0.14;
      return place(Math.cos(a) * (canopyR + 0.22), 0.31, Math.sin(a) * (canopyR + 0.22), 0, 0.03, 0.62, 0.03);
    }),
  ];

  /* Fibre riser: per core face a ladder rack (rails + rungs) carrying glowing fibre strands,
     a patch panel per floor, and on every Nth floor a floor-level tray with fibre branching out. */
  const faces = [0, 1, 2, 3].filter((d) => quality.fibreDirections === 4 || d % 2 === 0).map((d) => (d * Math.PI) / 2);
  const out = (theta: number) => new Vector3(Math.cos(theta), 0, Math.sin(theta));
  const along = (theta: number) => new Vector3(-Math.sin(theta), 0, Math.cos(theta));
  const rails: Matrix4[] = [];
  const strands: Matrix4[] = [];
  const strandPhase: number[] = [];
  const rungs = lists();
  const patches = lists();
  const trays = lists();
  const tubes = { lower: [] as BufferGeometry[], upper: [] as BufferGeometry[] };
  const face = TOWER.coreHalf;
  for (const theta of faces) {
    const n = out(theta);
    const t = along(theta);
    const turn = Math.PI / 2 - theta;
    const ladder = n.clone().multiplyScalar(face + 0.03);
    for (const o of [-0.045, 0.045]) {
      const p = ladder.clone().addScaledVector(t, o);
      rails.push(place(p.x, 0, p.z, turn, 0.008, 1, 0.008));
    }
    for (const o of [-0.02, 0, 0.02]) {
      const p = ladder.clone().addScaledVector(n, 0.012).addScaledVector(t, o);
      strands.push(place(p.x, 0, p.z));
      strandPhase.push(rand());
    }
    for (let y = TOWER.podiumHeight; y < TOWER_TOP; y += quality.rungSpacing) {
      rungs[y >= floorY(UPPER_FLOOR) ? "upper" : "lower"].m.push(place(ladder.x, y, ladder.z, turn, 0.095, 0.006, 0.008));
    }
    for (let f = 0; f < TOWER.floors; f++) {
      const side = f >= UPPER_FLOOR ? "upper" : "lower";
      const p = n.clone().multiplyScalar(face + 0.012).addScaledVector(t, 0.13);
      patches[side].m.push(place(p.x, floorY(f) + 0.18, p.z, turn));
      if (f % quality.fibreEvery !== 0 || isHall(f)) continue;
      const yt = floorY(f) + 0.05;
      const r = radiusAt(f);
      const start = n.clone().multiplyScalar(face + 0.03);
      trays[side].m.push(place(start.x, yt - 0.022, start.z, -theta, r - 0.12 - (face + 0.03), 1.2, 1.4));
      for (const off of quality.fibreDirections === 4 ? [-0.018, 0.018] : [0]) {
        const base = start.clone().addScaledVector(t, off);
        const curve = new CatmullRomCurve3(
          [
            base.clone().setY(yt + 0.2),
            base.clone().addScaledVector(n, 0.004).setY(yt + 0.06),
            base.clone().addScaledVector(n, 0.07).setY(yt - 0.012),
            n.clone().multiplyScalar(r - 0.14).addScaledVector(t, off).setY(yt - 0.012),
          ],
          false,
          "centripetal",
        );
        const tube = new TubeGeometry(curve, quality.tubeSegments, 0.016, quality.tubeRadial, false);
        tube.setAttribute("aPhase", new BufferAttribute(new Float32Array(tube.attributes.position.count).fill(rand()), 1));
        tubes[side].push(tube);
      }
    }
  }
  const merge = (geos: BufferGeometry[]) => {
    const merged = geos.length ? mergeGeometries(geos) : null;
    geos.forEach((g) => g.dispose());
    return merged;
  };
  const branchLower = merge(tubes.lower);
  const branchUpper = merge(tubes.upper);
  const railGeo = new BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const strandGeo = new CylinderGeometry(0.013, 0.013, 1, 6, 1, true).translate(0, 0.5, 0);
  const patchGeo = new BoxGeometry(0.075, 0.02, 0.02);
  const trayGeo = uTray();
  const patchMaterials = [m.darkMetal, m.darkMetal, m.darkMetal, m.darkMetal, m.patchFront, m.darkMetal];

  const meshes = {
    glassLower: instanced(box, m.glass, glass.lower.m, { aSeed: { array: glass.lower.seed, size: 2 } }),
    glassUpper: instanced(box, m.glass, glass.upper.m, { aSeed: { array: glass.upper.seed, size: 2 } }),
    spandrelLower: instanced(box, m.spandrel, spandrel.lower.m, { aSeed: { array: spandrel.lower.seed, size: 2 } }),
    spandrelUpper: instanced(box, m.spandrel, spandrel.upper.m, { aSeed: { array: spandrel.upper.seed, size: 2 } }),
    bandLower: instanced(box, m.band, band.lower.m, { aSeed: { array: band.lower.seed, size: 2 } }),
    bandUpper: instanced(box, m.band, band.upper.m, { aSeed: { array: band.upper.seed, size: 2 } }),
    mullionsLower: instanced(box, m.mullion, mullions.lower.m, { aSeed: { array: mullions.lower.seed, size: 2 } }),
    mullionsUpper: instanced(box, m.mullion, mullions.upper.m, { aSeed: { array: mullions.upper.seed, size: 2 } }),
    slabsLower: instanced(slabGeo, m.concrete, slabs.lower.m),
    slabsUpper: instanced(slabGeo, m.concrete, slabs.upper.m),
    terracesLower: instanced(slabGeo, m.concrete, terraces.lower.m),
    terracesUpper: instanced(slabGeo, m.concrete, terraces.upper.m),
    plantLower: instanced(box, m.aluminium, plant.lower.m),
    plantUpper: instanced(box, m.aluminium, plant.upper.m),
    columnsLower: instanced(columnGeo, m.concrete, columns.lower.m),
    columnsUpper: instanced(columnGeo, m.concrete, columns.upper.m),
    fins: instanced(box, m.aluminium, fins),
    lobbyFins: instanced(box, m.aluminium, lobbyFins),
    podiumBits: instanced(box, m.aluminium, podiumBits),
    rails: instanced(railGeo, m.aluminium, rails),
    strands: instanced(strandGeo, m.spine, strands, { aPhase: { array: strandPhase, size: 1 } }),
    rungsLower: instanced(box, m.aluminium, rungs.lower.m),
    rungsUpper: instanced(box, m.aluminium, rungs.upper.m),
    patchesLower: instanced(patchGeo, patchMaterials, patches.lower.m),
    patchesUpper: instanced(patchGeo, patchMaterials, patches.upper.m),
    traysLower: instanced(trayGeo, m.aluminium, trays.lower.m),
    traysUpper: instanced(trayGeo, m.aluminium, trays.upper.m),
    branchLower: new Mesh(branchLower ?? new BoxGeometry(0, 0, 0), m.branch),
    branchUpper: new Mesh(branchUpper ?? new BoxGeometry(0, 0, 0), m.branch),
    core: new Mesh(coreGeometry(), m.concrete),
    plinth: new Mesh(new CylinderGeometry(2.45, 2.5, 0.06, 48).translate(0, 0.03, 0), m.darkConcrete),
    lobbyFloor: new Mesh(new CylinderGeometry(PODIUM_RADIUS - 0.02, PODIUM_RADIUS - 0.02, 0.02, 48).translate(0, 0.07, 0), m.lobbyInterior),
    lobbyGlass: new Mesh(new CylinderGeometry(PODIUM_RADIUS, PODIUM_RADIUS, 0.62, 48, 1, true).translate(0, 0.37, 0), m.lobbyGlass),
    podiumRoof: new Mesh(new CylinderGeometry(2.4, 2.4, 0.07, 48).translate(0, 0.715, 0), m.concrete),
    crown: new Mesh(new CylinderGeometry(CROWN_TOP * 0.92, R3 * 0.94, CROWN_HEIGHT, N).translate(0, TOWER_TOP + CROWN_HEIGHT / 2, 0), m.crownGlass),
    crownCap: new Mesh(new CylinderGeometry(CROWN_TOP + 0.04, CROWN_TOP + 0.04, 0.05, N).translate(0, TOWER_TOP + CROWN_HEIGHT, 0), m.aluminium),
    mast: new Mesh(
      mergeGeometries([
        new CylinderGeometry(0.018, 0.05, SPIRE_HEIGHT, 8).translate(0, SPIRE_HEIGHT / 2, 0),
        new CylinderGeometry(0.1, 0.1, 0.015, 12).translate(0, 0.5, 0),
        new CylinderGeometry(0.07, 0.07, 0.015, 12).translate(0, 1.05, 0),
      ]) ?? new BoxGeometry(0, 0, 0),
      m.aluminium,
    ),
    beacon: new Mesh(new SphereGeometry(0.035, 10, 8), m.beacon),
  };
  meshes.mast.position.y = TOWER_TOP + CROWN_HEIGHT;
  meshes.beacon.position.y = SPIRE_TOP + 0.02;
  // The dissolving facade flies outward, past its static bounds.
  for (const key of ["glass", "spandrel", "band", "mullions"] as const) {
    meshes[`${key}Lower`].frustumCulled = false;
    meshes[`${key}Upper`].frustumCulled = false;
  }
  for (const g of [box, slabGeo, columnGeo, railGeo, strandGeo, patchGeo, trayGeo]) g.dispose();
  return meshes;
}

/** The tower: structure, curtain wall, crown and podium, and the fibre riser revealed at beat 1. */
export function Tower() {
  const { state, quality, palette, maps } = useScene();
  const materials = useMemo(() => createMaterials(quality, maps), [quality, maps]);
  const meshes = useMemo(() => buildTower(quality, materials), [quality, materials]);
  const lifted = useRef<Group>(null);
  const fibre = useRef<(Group | null)[]>([]);
  const facade = useRef<(Group | null)[]>([]);

  useEffect(() => () => disposeMeshes(Object.values(meshes)), [meshes]);
  useEffect(() => () => disposeMaterials(materials), [materials]);

  useEffect(() => {
    const { facade: u, band, spine, branch, beacon, lobbyInterior } = materials;
    u.uEmber.value.copy(palette.glow).multiplyScalar(1.6);
    u.uWindow.value.copy(palette.window);
    u.uLitRatio.value = palette.litRatio;
    band.color.copy(palette.primary);
    band.emissive.copy(palette.primary).multiplyScalar(palette.dark ? 1.1 : 0.35);
    lobbyInterior.emissiveIntensity = palette.dark ? 0.35 : 0.1;
    for (const flow of [spine, branch]) {
      (flow.uniforms.uColor.value as Color).copy(palette.dark ? palette.glow : palette.primary);
      (flow.uniforms.uHot.value as Color).copy(palette.hot);
      flow.uniforms.uDensity.value = 3;
      flow.uniforms.uBase.value = 0.65;
    }
    branch.uniforms.uBase.value = 1;
    applyGlowBlending(palette, spine, branch);
    beacon.color.copy(palette.glow).multiplyScalar(4);
  }, [palette, materials]);

  useFrame(({ clock }) => {
    const w = layerWeights(state.beat);
    const t = clock.elapsedTime;
    const lift = TOWER.lift * w.slice;
    if (lifted.current) lifted.current.position.y = lift;
    const height = TOWER_TOP + lift;
    meshes.core.scale.y = height;
    meshes.rails.scale.y = height;
    meshes.strands.scale.y = height;

    materials.facade.uDissolve.value = w.dissolve;
    for (const g of facade.current) if (g) g.visible = w.dissolve < 0.999;
    for (const g of fibre.current) if (g) g.visible = w.fibre > 0.002;
    for (const flow of [materials.spine, materials.branch]) {
      flow.uniforms.uOpacity.value = w.fibre;
      flow.uniforms.uTime.value = t;
    }
    meshes.beacon.visible = t % 1.6 < 0.3;
  });

  const keep = (list: RefObject<(Group | null)[]>, i: number) => (g: Group | null) => {
    list.current[i] = g;
  };

  return (
    <group name="tower">
      <group name="structure">
        <primitive object={meshes.plinth} />
        <primitive object={meshes.lobbyFloor} />
        <primitive object={meshes.lobbyGlass} />
        <primitive object={meshes.lobbyFins} />
        <primitive object={meshes.podiumRoof} />
        <primitive object={meshes.podiumBits} />
        <primitive object={meshes.core} />
        <primitive object={meshes.slabsLower} />
        <primitive object={meshes.terracesLower} />
        <primitive object={meshes.plantLower} />
        <primitive object={meshes.columnsLower} />
      </group>
      <group name="facade" ref={keep(facade, 0)}>
        <primitive object={meshes.glassLower} />
        <primitive object={meshes.spandrelLower} />
        <primitive object={meshes.bandLower} />
        <primitive object={meshes.mullionsLower} />
      </group>
      <group name="fibre" ref={keep(fibre, 0)}>
        <primitive object={meshes.rails} />
        <primitive object={meshes.strands} />
        <primitive object={meshes.rungsLower} />
        <primitive object={meshes.patchesLower} />
        <primitive object={meshes.traysLower} />
        <primitive object={meshes.branchLower} />
      </group>
      {/* Everything above the data hall rides up when the slice opens. */}
      <group name="upper" ref={lifted}>
        <group name="structure_upper">
          <primitive object={meshes.slabsUpper} />
          <primitive object={meshes.terracesUpper} />
          <primitive object={meshes.plantUpper} />
          <primitive object={meshes.columnsUpper} />
          <primitive object={meshes.crown} />
          <primitive object={meshes.fins} />
          <primitive object={meshes.crownCap} />
          <primitive object={meshes.mast} />
          <primitive object={meshes.beacon} />
        </group>
        <group name="facade_upper" ref={keep(facade, 1)}>
          <primitive object={meshes.glassUpper} />
          <primitive object={meshes.spandrelUpper} />
          <primitive object={meshes.bandUpper} />
          <primitive object={meshes.mullionsUpper} />
        </group>
        <group name="fibre_upper" ref={keep(fibre, 1)}>
          <primitive object={meshes.rungsUpper} />
          <primitive object={meshes.patchesUpper} />
          <primitive object={meshes.traysUpper} />
          <primitive object={meshes.branchUpper} />
        </group>
      </group>
    </group>
  );
}
