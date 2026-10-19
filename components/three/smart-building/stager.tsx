"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useRef, useState, type ComponentType } from "react";
import {
  BufferAttribute,
  BufferGeometry,
  HalfFloatType,
  Mesh,
  PMREMGenerator,
  WebGLRenderTarget,
  type Camera,
  type Material,
  type Scene,
  type Texture,
  type WebGLRenderer,
} from "three";

import { useScene } from "./context";
import { yieldToMain, type ReportProgress } from "./startup";
import { prepareTextures } from "./textures";

/**
 * Materials that live outside the scene graph (PMREM filters, post-processing passes). A layer
 * registers them here, setting `ready` if they only exist after a later commit, so the stager can
 * compile them asynchronously like everything else.
 */
export const offScene = { materials: new Set<Material>(), ready: Promise.resolve() };

/** Textures used by a mesh's materials (including ShaderMaterial uniforms). */
function texturesOf(mesh: Mesh, out: Set<Texture>) {
  for (const m of [mesh.material ?? []].flat()) {
    for (const value of Object.values(m)) if ((value as Texture)?.isTexture) out.add(value as Texture);
    const uniforms = (m as { uniforms?: Record<string, { value: unknown }> }).uniforms;
    if (uniforms) for (const u of Object.values(uniforms)) if ((u?.value as Texture)?.isTexture) out.add(u.value as Texture);
  }
}

/**
 * PMREM: the first lit material to compile makes three.js filter the environment map, and its
 * cube-to-UV and GGX/blur filter shaders would link synchronously (≈ 0.5–1 s on a throttled phone). A
 * private generator of the same cube size yields byte-identical filter materials; compiling those
 * asynchronously before any lit mesh means the renderer's own pass finds the programs ready. The generator is
 * kept alive (sharing the programs) until start-up ends.
 */
type PmremInternals = {
  _setSize(size: number): void;
  _allocateTargets(): WebGLRenderTarget;
  _ggxMaterial: Material | null;
  _blurMaterial: Material | null;
  _cubemapMaterial: Material | null;
  compileCubemapShader(): void;
  dispose(): void;
};
function warmPmrem(gl: WebGLRenderer, cubeSize: number) {
  const generator = new PMREMGenerator(gl) as unknown as PmremInternals;
  generator._setSize(cubeSize);
  const target = generator._allocateTargets();
  // The environment is a cube render target, so the renderer's pass starts with the cubemap shader.
  generator.compileCubemapShader();
  for (const m of [generator._cubemapMaterial, generator._ggxMaterial, generator._blurMaterial]) if (m) offScene.materials.add(m);
  return () => {
    target.dispose();
    generator.dispose();
  };
}

/**
 * Compile the registered off-scene materials first (so the PMREM pass that the first lit mesh
 * triggers finds its programs ready), then programs for meshes not compiled yet, one mesh per task (the synchronous part of a
 * compile is shader-source assembly, ~10–40 ms on a throttled phone; with KHR_parallel_shader_compile
 * the driver finishes off the main thread). Lights, fog and environment come from the full scene.
 * On desktop the target is a half-float buffer like the composer's, so the variants match what will
 * actually draw. Then each new texture is uploaded, one per task.
 */
async function compileStage(
  gl: WebGLRenderer,
  scene: Scene,
  camera: Camera,
  post: boolean,
  done: { meshes: WeakSet<object>; textures: Set<Texture> },
) {
  const previous = gl.getRenderTarget();
  // First, materials outside the scene graph (post-processing, PMREM): an intermediate buffer and the screen.
  await offScene.ready;
  if (offScene.materials.size) {
    // Position only, like the PMREM planes and the composer's triangle: three keys programs on
    // whether a geometry has positions and normals, so anything else would compile a variant the
    // real passes never use.
    const quad = new BufferGeometry().setAttribute("position", new BufferAttribute(new Float32Array(9), 3));
    for (const m of offScene.materials) {
      const mesh = new Mesh(quad, m);
      for (const t of [new WebGLRenderTarget(1, 1, { type: HalfFloatType }), null]) {
        gl.setRenderTarget(t);
        const compiled = gl.compileAsync(mesh, camera);
        gl.setRenderTarget(previous);
        await compiled.catch(() => undefined);
        t?.dispose();
        await yieldToMain();
      }
    }
    quad.dispose();
    offScene.materials.clear();
  }

  const meshes: Mesh[] = [];
  scene.traverse((o) => {
    if ((o as Mesh).material && !done.meshes.has(o)) meshes.push(o as Mesh);
  });
  const target = post ? new WebGLRenderTarget(1, 1, { type: HalfFloatType }) : null;
  const pending: Promise<unknown>[] = [];
  const textures = new Set<Texture>();
  for (const mesh of meshes) {
    done.meshes.add(mesh);
    texturesOf(mesh, textures);
    gl.setRenderTarget(target);
    pending.push(gl.compileAsync(mesh, camera, scene).catch(() => undefined));
    gl.setRenderTarget(previous);
    await yieldToMain();
  }
  await Promise.all(pending);
  target?.dispose();

  for (const t of textures) {
    if (done.textures.has(t)) continue;
    done.textures.add(t);
    gl.initTexture(t);
    await yieldToMain();
  }
}

/**
 * Builds the scene a layer at a time so no single task blocks input for long:
 * canvas textures (one per task) → each layer: mount (its geometry build) → yield → compile its
 * new meshes one per task + upload its textures one per task → yield → next layer. Rendering stays off
 * (frameloop "never") throughout; one warm-up frame then draws everything once (composer passes,
 * contact shadows) before `onReady`, so the first scroll-driven frame finds every program ready.
 */
export function Stager({
  layers,
  report,
  onReady,
}: {
  layers: [string, ComponentType][];
  report: ReportProgress;
  onReady: () => void;
}) {
  const { gl, scene, camera, advance } = useThree();
  const { quality, maps } = useScene();
  const [stage, setStage] = useState(-1);
  const done = useRef({ meshes: new WeakSet<object>(), textures: new Set<Texture>() });
  const releasePmrem = useRef<() => void>(undefined);

  useEffect(() => {
    let cancelled = false;
    const total = layers.length;
    (async () => {
      if (stage === -1) {
        await prepareTextures(!maps, yieldToMain, (done, all) => report("textures", done, all));
      } else if (stage < total) {
        report("build", stage + 1, total);
        await yieldToMain();
        // After the first layer (lights + environment) mounts, pre-compile the PMREM filters.
        if (stage === 0 && scene.environment && !releasePmrem.current) releasePmrem.current = warmPmrem(gl, quality.envResolution);
        await compileStage(gl, scene, camera, quality.post, done.current);
        report("compile", stage + 1, total);
      } else {
        await yieldToMain();
        advance(performance.now());
        report("warmup", 1, 1);
        releasePmrem.current?.();
        releasePmrem.current = undefined;
        await yieldToMain();
        if (!cancelled) onReady();
        return;
      }
      await yieldToMain();
      if (!cancelled) setStage((s) => s + 1);
    })();
    return () => {
      cancelled = true;
    };
  }, [stage, layers, report, onReady, gl, scene, camera, advance, quality.post, quality.envResolution, maps]);

  return (
    <>
      {layers.slice(0, Math.max(0, stage + 1)).map(([key, Layer]) => (
        <Layer key={key} />
      ))}
    </>
  );
}
