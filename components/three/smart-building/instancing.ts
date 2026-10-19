import {
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  Quaternion,
  Vector3,
  type BufferGeometry,
  type Material,
} from "three";

const q = new Quaternion();
const p = new Vector3();
const s = new Vector3();
const Y = new Vector3(0, 1, 0);

/** Position, a turn about Y, and a scale, as one matrix. */
export function place(x: number, y: number, z: number, turnY = 0, sx = 1, sy = 1, sz = 1) {
  q.setFromAxisAngle(Y, turnY);
  return new Matrix4().compose(p.set(x, y, z), q, s.set(sx, sy, sz));
}

/** Position, with the geometry's -Y axis aimed along `dir` (used for sight-line cones). */
export function aim(origin: Vector3, dir: Vector3, sx = 1, sy = 1, sz = 1) {
  q.setFromUnitVectors(new Vector3(0, -1, 0), dir.clone().normalize());
  return new Matrix4().compose(origin, q, s.set(sx, sy, sz));
}

/** One InstancedMesh from matrices plus per-instance attributes (each instance owns its geometry copy). */
export function instanced(
  geometry: BufferGeometry,
  material: Material | Material[],
  matrices: Matrix4[],
  attributes: Record<string, { array: number[]; size: number }> = {},
) {
  const geo = geometry.clone();
  for (const [name, a] of Object.entries(attributes)) {
    geo.setAttribute(name, new InstancedBufferAttribute(new Float32Array(a.array), a.size));
  }
  const mesh = new InstancedMesh(geo, material, matrices.length);
  matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
  mesh.computeBoundingSphere();
  return mesh;
}

/** Frees every geometry in a list of meshes (materials are owned and freed by their component). */
export function disposeMeshes(meshes: { geometry: BufferGeometry; dispose?: () => void }[]) {
  for (const m of meshes) {
    m.geometry.dispose();
    m.dispose?.();
  }
}
