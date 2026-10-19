"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import {
  BoxGeometry,
  BufferAttribute,
  ConeGeometry,
  CylinderGeometry,
  LatheGeometry,
  Mesh,
  QuadraticBezierCurve3,
  SphereGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
  type BufferGeometry,
  type Color,
  type Matrix4,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import { useScene } from "./context";
import { disposeMeshes, instanced, place } from "./instancing";
import { applyGlowBlending, createFlowMaterial } from "./materials";
import { random } from "./math";
import { createCityMaterials, createCityUniforms, disposeMaterials } from "./pbr";
import type { Quality } from "./quality";
import { layerWeights } from "./timeline";
import { TOWER_TOP } from "./tower";

const INNER_RADIUS = 8.5;
const SPACING = 2.5;
/** West Bay: the tall cluster behind the tower in the hero shot, with a few landmark towers. */
const CLUSTER = { x: -15, z: -14, spread: 7 };
const LANDMARKS = [
  { kind: "hyperboloid", x: -13, z: -11 },
  { kind: "domed", x: -17.5, z: -15.5 },
  { kind: "pyramid", x: -11.5, z: -17.5 },
  { kind: "pyramid", x: -19.5, z: -11 },
] as const;

/** Cylindrical UVs in world units (u = arc length / 2π, v = height) for one-off landmark meshes at scale 1. */
function cylindricalUv(geo: BufferGeometry) {
  const pos = geo.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    uv[i * 2] = (Math.atan2(z, x) / (Math.PI * 2) + 0.5) * Math.hypot(x, z);
    uv[i * 2 + 1] = pos.getY(i);
  }
  geo.setAttribute("uv", new BufferAttribute(uv, 2));
  return geo;
}

type Block = { x: number; z: number; w: number; d: number; h: number; dist: number; seed: number; look: number; round: boolean };

function createMaterials() {
  const uniforms = createCityUniforms();
  return { uniforms, looks: createCityMaterials(uniforms), arcs: createFlowMaterial("u") };
}
type CityMaterials = ReturnType<typeof createMaterials>;

function buildCity(quality: Quality, m: CityMaterials) {
  const rand = random(53);
  const blocks: Block[] = [];
  const n = Math.ceil(quality.cityRadius / SPACING);
  for (let gx = -n; gx <= n; gx++) {
    for (let gz = -n; gz <= n; gz++) {
      const x = gx * SPACING + (rand() - 0.5) * 0.8;
      const z = gz * SPACING + (rand() - 0.5) * 0.8;
      const dist = Math.hypot(x, z);
      const skip = rand() < 0.22; // streets and plazas
      const nearLandmark = quality.landmarks && LANDMARKS.some((l) => Math.hypot(l.x - x, l.z - z) < 2);
      if (skip || nearLandmark || dist < INNER_RADIUS || dist > quality.cityRadius) continue;
      const cluster = Math.exp(-((x - CLUSTER.x) ** 2 + (z - CLUSTER.z) ** 2) / (2 * CLUSTER.spread ** 2));
      const h = 0.4 + rand() ** 3 * 3.5 * (1 - dist / quality.cityRadius) + cluster * (3 + rand() * 7);
      const tall = h > 3;
      blocks.push({
        x,
        z,
        h,
        dist,
        w: 0.8 + rand() * 0.8,
        d: 0.8 + rand() * 0.8,
        seed: rand(),
        look: tall ? (rand() < 0.6 ? 2 : 1) : Math.floor(rand() * 2),
        round: tall && rand() < 0.3,
      });
    }
  }
  blocks.sort((a, b) => a.dist - b.dist);
  blocks.length = Math.min(blocks.length, quality.cityMax);

  // Network: some arcs from the tower crown, the rest chained between tall blocks.
  const candidates = blocks.filter((b) => b.h > 1.6 && b.dist < quality.cityRadius * 0.75);
  const networked = new Set<Block>();
  const tubes: BufferGeometry[] = [];
  const crown = new Vector3(0, TOWER_TOP + 1.2, 0);
  const roof = (b: Block) => new Vector3(b.x, b.h, b.z);
  let previous: Block | undefined;
  for (let i = 0; i < quality.arcs && candidates.length; i++) {
    const to = candidates[Math.floor(rand() * candidates.length)];
    const from = i % 3 === 0 || !previous ? crown : roof(previous);
    const end = roof(to);
    const mid = from.clone().lerp(end, 0.5);
    mid.y += from.distanceTo(end) * 0.3 + 1;
    const tube = new TubeGeometry(new QuadraticBezierCurve3(from, mid, end), quality.tubeSegments * 2, quality.arcRadius, quality.tubeRadial, false);
    tube.setAttribute("aPhase", new BufferAttribute(new Float32Array(tube.attributes.position.count).fill(rand()), 1));
    tubes.push(tube);
    networked.add(to);
    if (previous) networked.add(previous);
    previous = to;
  }
  const arcGeo = mergeGeometries(tubes);
  for (const t of tubes) t.dispose();

  // Blocks, by look and shape; a third of the tall ones step back near the top.
  const buckets = Array.from({ length: 6 }, () => ({ m: [] as Matrix4[], seed: [] as number[] }));
  for (const b of blocks) {
    const bucket = buckets[b.look * 2 + (b.round ? 1 : 0)];
    const net = networked.has(b) ? 1 : 0;
    const setback = b.h > 3.5 && b.seed > 0.66;
    const lower = setback ? b.h * 0.7 : b.h;
    bucket.m.push(place(b.x, 0, b.z, 0, b.round ? b.w / 2 : b.w, lower, b.round ? b.w / 2 : b.d));
    bucket.seed.push(b.seed, setback ? 0 : net);
    if (setback) {
      bucket.m.push(place(b.x, lower, b.z, 0, (b.round ? b.w / 2 : b.w) * 0.7, b.h - lower, (b.round ? b.w / 2 : b.d) * 0.7));
      bucket.seed.push((b.seed * 7) % 1, net);
    }
  }
  const segments = quality.tier === "desktop" ? 16 : 10;
  const boxGeo = new BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const roundGeo = new CylinderGeometry(1, 1, 1, segments, 1).translate(0, 0.5, 0);
  const meshes: Record<string, Mesh> = {};
  buckets.forEach((bucket, i) => {
    const look = m.looks[Math.floor(i / 2)];
    const round = i % 2 === 1;
    meshes[`blocks${i}`] = instanced(round ? roundGeo : boxGeo, round ? look.round : look.box, bucket.m, {
      aSeed: { array: bucket.seed, size: 2 },
    });
  });

  if (quality.landmarks) {
    for (const [i, l] of LANDMARKS.entries()) {
      let geo: BufferGeometry;
      if (l.kind === "hyperboloid") {
        // A twisted-waist tower in the spirit of Doha's hyperboloid landmark.
        const profile = Array.from({ length: 12 }, (_, k) => {
          const y = (k / 11) * 9;
          return new Vector2(0.7 * Math.sqrt(1 + ((y - 5.2) / 3) ** 2), y);
        });
        profile.push(new Vector2(0, 9));
        geo = new LatheGeometry(profile, segments * 2);
      } else if (l.kind === "domed") {
        geo = mergeGeometries([
          new CylinderGeometry(0.8, 0.8, 8, segments * 2, 1, true).translate(0, 4, 0),
          new SphereGeometry(0.8, segments * 2, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.7, 1).translate(0, 8, 0),
        ]) ?? new BoxGeometry(0, 0, 0);
      } else {
        geo = mergeGeometries([
          new BoxGeometry(1.1, 6.5, 1.1).translate(0, 3.25, 0),
          new ConeGeometry(0.78, 1.4, 4).rotateY(Math.PI / 4).translate(0, 7.2, 0),
        ]) ?? new BoxGeometry(0, 0, 0);
      }
      // Landmarks are lit and on the network; the round UV mapping wraps their windows round them.
      meshes[`landmark${i}`] = instanced(cylindricalUv(geo), m.looks[2].round, [place(l.x, 0, l.z)], {
        aSeed: { array: [0.37 * (i + 1), 1], size: 2 },
      });
      geo.dispose();
    }
  }
  boxGeo.dispose();
  roundGeo.dispose();

  const arcs = new Mesh(arcGeo ?? new BoxGeometry(0, 0, 0), m.arcs);
  arcs.frustumCulled = false;
  return { ...meshes, arcs };
}

/** The city of light round the tower: a lit skyline at night, a networked city at beat 5. */
export function City() {
  const { state, quality, palette } = useScene();
  const materials = useMemo(createMaterials, []);
  const meshes = useMemo(() => buildCity(quality, materials), [quality, materials]);

  useEffect(() => () => disposeMeshes(Object.values(meshes)), [meshes]);
  useEffect(
    () => () => {
      disposeMaterials({ arcs: materials.arcs, ...materials.looks.flatMap((l) => [l.box, l.round]) });
    },
    [materials],
  );

  useEffect(() => {
    const { uniforms, arcs } = materials;
    uniforms.uLitStrength.value = palette.dark ? 1.1 : 0.18;
    uniforms.uGlow.value.copy(palette.glow).multiplyScalar(1.5);
    uniforms.uRoof.value.set(palette.dark ? "#141518" : "#b5aeaa");
    (arcs.uniforms.uColor.value as Color).copy(palette.dark ? palette.glow : palette.primary);
    (arcs.uniforms.uHot.value as Color).copy(palette.hot);
    arcs.uniforms.uDensity.value = 3;
    arcs.uniforms.uSpeed.value = 0.25;
    applyGlowBlending(palette, arcs);
  }, [palette, materials]);

  useFrame(({ clock }) => {
    const w = layerWeights(state.beat).network;
    const { uniforms, arcs } = materials;
    uniforms.uNetwork.value = w;
    arcs.uniforms.uOpacity.value = Math.min(1, w * 1.4);
    arcs.uniforms.uDraw.value = w;
    arcs.uniforms.uTime.value = clock.elapsedTime;
    meshes.arcs.visible = w > 0.002;
  });

  return (
    <group name="city">
      {Object.entries(meshes).map(([key, mesh]) => (
        <primitive key={key} object={mesh} />
      ))}
    </group>
  );
}
