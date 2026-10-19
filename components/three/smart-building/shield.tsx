"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Matrix4, Vector3, type Color, type Group } from "three";

import { useScene } from "./context";
import { disposeMeshes, instanced } from "./instancing";
import { applyGlowBlending, createHexMaterial } from "./materials";
import { random } from "./math";
import { hexCell } from "./models";
import type { Quality } from "./quality";
import { layerWeights } from "./timeline";

const DOME_RADIUS = 6.4;
const MAX_POLAR = (86 * Math.PI) / 180;

/** Azimuthal-equidistant map from a flat hex grid onto the dome: hexagons keep their size near the top. */
const toDome = (u: number, v: number) => {
  const theta = Math.hypot(u, v) / DOME_RADIUS;
  const phi = Math.atan2(v, u);
  return new Vector3(Math.sin(theta) * Math.cos(phi), Math.cos(theta), Math.sin(theta) * Math.sin(phi));
};

function buildShield(quality: Quality, material: ReturnType<typeof createHexMaterial>) {
  const rand = random(37);
  const s = quality.hexSize;
  const reach = DOME_RADIUS * MAX_POLAR;
  const cols = Math.ceil(reach / (1.5 * s));
  const rows = Math.ceil(reach / (Math.sqrt(3) * s));
  const matrices: Matrix4[] = [];
  const data: number[] = [];
  for (let c = -cols; c <= cols; c++) {
    for (let r = -rows; r <= rows; r++) {
      const u = c * 1.5 * s;
      const v = (r + (Math.abs(c) % 2) * 0.5) * Math.sqrt(3) * s;
      const dist = Math.hypot(u, v);
      if (dist > reach) continue;
      const normal = toDome(u, v);
      const tangent = toDome(u + 0.01, v).sub(normal);
      if (tangent.lengthSq() < 1e-10) tangent.set(1, 0, 0);
      tangent.addScaledVector(normal, -tangent.dot(normal)).normalize();
      const bitangent = new Vector3().crossVectors(normal, tangent);
      matrices.push(new Matrix4().makeBasis(tangent, bitangent, normal).setPosition(normal.multiplyScalar(DOME_RADIUS)));
      // Forms from the ground up, closing at the crown.
      data.push((dist / reach) * -0.85 + 0.85 + rand() * 0.15, rand());
    }
  }
  const hexGeo = hexCell(s * 0.9, quality.hexBevel);
  const mesh = instanced(hexGeo, material, matrices, { aData: { array: data, size: 2 } });
  mesh.frustumCulled = false;
  hexGeo.dispose();
  return mesh;
}

/** Hexagonal shield dome (beat 4): bevelled cells, bright fresnel rim, forming from the ground up. */
export function Shield() {
  const { state, quality, palette } = useScene();
  const material = useMemo(createHexMaterial, []);
  const mesh = useMemo(() => buildShield(quality, material), [quality, material]);
  const group = useRef<Group>(null);

  useEffect(() => () => disposeMeshes([mesh]), [mesh]);
  useEffect(() => () => material.dispose(), [material]);

  useEffect(() => {
    (material.uniforms.uColor.value as Color).copy(palette.dark ? palette.glow : palette.primary);
    (material.uniforms.uHot.value as Color).copy(palette.hot);
    material.uniforms.uSize.value = quality.hexSize * 0.9;
    applyGlowBlending(palette, material);
  }, [palette, material, quality]);

  useFrame(({ clock }) => {
    const w = layerWeights(state.beat).shield;
    if (group.current) group.current.visible = w > 0.002;
    material.uniforms.uForm.value = w;
    material.uniforms.uOpacity.value = Math.min(1, w * 1.5);
    material.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <group name="shield" ref={group}>
      <primitive object={mesh} />
    </group>
  );
}
