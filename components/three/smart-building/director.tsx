"use client";

import { addAfterEffect, addEffect, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, N8AO, SMAA, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef } from "react";
import {
  HalfFloatType,
  MathUtils,
  Vector3,
  WebGLRenderTarget,
  type InstancedMesh,
  type Mesh,
  type Object3D,
  type PerspectiveCamera,
  type Texture,
} from "three";

import { useScene } from "./context";
import { endLoading } from "./loading";
import { LAST_BEAT, offsetCurve, targetCurve } from "./timeline";

const target = new Vector3();
const offset = new Vector3();

/**
 * Maps scroll through the page's [data-beat] sections to a continuous beat (0 → 6), eases the
 * drawn beat toward it, drives the camera, and decides when a frame is drawn at all.
 */
export function Director() {
  const { state, quality } = useScene();
  const invalidate = useThree((s) => s.invalidate);
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const setDpr = useThree((s) => s.setDpr);
  const adaptive = useRef({ dpr: Math.min(quality.dpr[1], window.devicePixelRatio), frames: [] as number[] });

  // Scroll → beat. One trigger per pair of neighbouring sections, centre to centre; the beat is
  // the sum of their progress, so section N centred in the viewport is exactly beat N.
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const sections = [...document.querySelectorAll<HTMLElement>("[data-beat]")].sort(
      (a, b) => Number(a.dataset.beat) - Number(b.dataset.beat),
    );
    const progress = sections.slice(1).map(() => 0);
    const update = () => {
      state.target = Math.min(LAST_BEAT, progress.reduce((sum, p) => sum + p, 0));
      if (state.active) invalidate();
    };
    const triggers = sections.slice(0, -1).map((section, i) =>
      ScrollTrigger.create({
        trigger: section,
        start: "center center",
        endTrigger: sections[i + 1],
        end: "center center",
        onUpdate: (self) => {
          progress[i] = self.progress;
          update();
        },
        onRefresh: (self) => {
          progress[i] = self.progress;
          update();
        },
      }),
    );
    // Start where the page already is (reload mid-page) instead of flying in from beat 0.
    state.beat = state.target;
    return () => triggers.forEach((t) => t.kill());
  }, [state, invalidate]);

  // Pause when the tab is hidden or no beat section is on screen.
  useEffect(() => {
    const sections = document.querySelectorAll("[data-beat]");
    const onScreen = new Set<Element>();
    const refresh = () => {
      const was = state.active;
      state.active = !document.hidden && (onScreen.size > 0 || sections.length === 0);
      if (state.active && !was) invalidate();
    };
    const observer = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) onScreen.add(e.target);
        else onScreen.delete(e.target);
      }
      refresh();
    });
    sections.forEach((s) => observer.observe(s));
    document.addEventListener("visibilitychange", refresh);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [state, invalidate]);

  // Ambient motion (pulses, beacon) at a modest rate while idle; scrolling renders every frame.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (state.active) invalidate();
    }, 1000 / quality.idleFps);
    return () => window.clearInterval(id);
  }, [state, invalidate, quality.idleFps]);

  /**
   * Adaptive resolution: frames rendered back to back while the beat is moving are the true
   * frame rate (idle redraws are throttled on purpose and ignored). If the median over ~45 frames
   * misses the profile's target (55 fps desktop, 30 fps mobile/low), step the pixel ratio down by
   * 15%, never below 1; step back up when there is clear headroom.
   */
  const adaptResolution = (delta: number) => {
    const a = adaptive.current;
    a.frames.push(delta * 1000);
    if (a.frames.length < 45) return;
    const median = [...a.frames].sort((x, y) => x - y)[22];
    a.frames.length = 0;
    const budget = 1000 / (quality.tier === "desktop" ? 55 : 30);
    const ceiling = Math.min(quality.dpr[1], window.devicePixelRatio);
    let next = a.dpr;
    if (median > budget * 1.05) next = Math.max(1, a.dpr * 0.85);
    else if (median < budget * 0.6) next = Math.min(ceiling, a.dpr * 1.1);
    if (Math.abs(next - a.dpr) < 0.01) return;
    a.dpr = next;
    setDpr(next);
  };

  useFrame(({ clock }, delta) => {
    if (Math.abs(state.target - state.beat) > 5e-4) {
      state.beat = MathUtils.damp(state.beat, state.target, 4.5, Math.min(delta, 0.05));
      invalidate();
      adaptResolution(delta);
    } else {
      state.beat = state.target;
      adaptive.current.frames.length = 0;
    }

    const u = state.beat / LAST_BEAT;
    targetCurve.getPoint(u, target);
    offsetCurve.getPoint(u, offset);
    // Portrait screens: step back so the tower still fits the narrower view.
    // Long shots step back fully; close-ups (the data-hall aisle) stay close so they stay inside.
    const portrait = camera.aspect < 1 ? Math.min(1.9, camera.aspect ** -0.6) : 1;
    const fit = 1 + (portrait - 1) * MathUtils.smoothstep(offset.length(), 2.8, 4.5);
    const t = clock.elapsedTime;
    camera.position.copy(target).addScaledVector(offset, fit);
    camera.position.x += Math.sin(t * 0.2) * 0.15;
    camera.position.y += Math.sin(t * 0.27) * 0.08;
    camera.lookAt(target);

    // Wide screens: shift the frame so the tower sits on the end side, clear of the text column.
    const end = document.documentElement.dir === "rtl" ? 1 : -1;
    const film = camera.aspect > 1.1 ? end * Math.min(11, (camera.aspect - 1.1) * 20) : 0;
    if (camera.filmOffset !== film) {
      camera.filmOffset = film;
      camera.updateProjectionMatrix();
    }
  }, -1);

  return null;
}

/**
 * Compiles every shader before the first visible frame, then reports ready. Layers that start
 * hidden are shown for the compile, and on desktop the compile targets a half-float buffer like the
 * composer's, so no program is first built mid-scroll (that showed as a ~400 ms hitch at beat 3).
 */
export function Ready({ onReady }: { onReady: () => void }) {
  const { gl, scene, camera, invalidate } = useThree();
  const { quality } = useScene();

  useEffect(() => {
    let cancelled = false;
    endLoading("build");
    const hidden: Object3D[] = [];
    const textures = new Set<Texture>();
    scene.traverse((o) => {
      for (const m of [(o as Mesh).material ?? []].flat()) {
        for (const value of Object.values(m)) if ((value as Texture)?.isTexture) textures.add(value as Texture);
      }
      if (o.visible) return;
      hidden.push(o);
      o.visible = true;
    });
    // Upload every texture now too; first use mid-scroll cost 30-80 ms per layer.
    for (const t of textures) gl.initTexture(t);
    const target = quality.post ? new WebGLRenderTarget(1, 1, { type: HalfFloatType }) : null;
    const previous = gl.getRenderTarget();
    gl.setRenderTarget(target);
    const compiled = gl.compileAsync(scene, camera);
    // compileAsync gathers its programs synchronously, so the scene can be restored straight away.
    gl.setRenderTarget(previous);
    for (const o of hidden) o.visible = false;
    compiled
      .catch(() => undefined)
      .finally(() => target?.dispose())
      .then(() => {
        if (cancelled) return;
        endLoading("compile");
        invalidate();
        // Two frames: let the first real frame land before the canvas fades in.
        requestAnimationFrame(() => requestAnimationFrame(() => !cancelled && onReady()));
      });
    return () => {
      cancelled = true;
    };
  }, [gl, scene, camera, invalidate, onReady, quality.post]);

  return null;
}

/** Desktop only: N8AO ambient occlusion, subtle bloom on emissives, neutral tone mapping, SMAA. */
export function Effects() {
  const { palette } = useScene();
  return (
    <EffectComposer multisampling={0}>
      <N8AO
        // N8AO gamma-corrects by default (meant for when it is the last pass). Mid-chain that
        // applies sRGB twice and lifts every dark into maroon, so switch it off.
        ref={(pass) => {
          if (pass) pass.configuration.gammaCorrection = false;
        }}
        halfRes
        quality="performance"
        aoRadius={0.6}
        distanceFalloff={0.6}
        intensity={palette.dark ? 2 : 2.6}
      />
      <Bloom
        mipmapBlur
        intensity={palette.bloom.intensity}
        luminanceThreshold={palette.bloom.threshold}
        luminanceSmoothing={0.3}
        radius={0.35}
      />
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
      {/* No vignette at dusk: the sky's edges must stay the page background colour. */}
      <Vignette offset={0.35} darkness={palette.dark ? 0.45 : 0} />
      <SMAA />
    </EffectComposer>
  );
}

type FrameSample = { t: number; cpu: number; gpu: number | null; triangles: number; calls: number };

/**
 * QA readout (the dev page's ?stats=1): per rendered frame, CPU time, GPU time (timer query,
 * where the browser exposes it), triangles and draw calls across every pass. Writes a summary into
 * any [data-scene-stats] element and keeps the last 2,000 samples on window.__sceneStats.
 */
export function Stats() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);

  useEffect(() => {
    const ctx = gl.getContext() as WebGL2RenderingContext;
    const ext = ctx.getExtension("EXT_disjoint_timer_query_webgl2") as {
      TIME_ELAPSED_EXT: number;
      GPU_DISJOINT_EXT: number;
    } | null;
    const samples: FrameSample[] = [];
    const pending: { query: WebGLQuery; sample: FrameSample }[] = [];
    let start = 0;
    let query: WebGLQuery | null = null;
    let lastWrite = 0;
    gl.info.autoReset = false;
    const w = window as Window & { __sceneStats?: FrameSample[]; __sceneTriangles?: () => Record<string, number> };
    w.__sceneStats = samples;
    // Built geometry per named layer (instances × triangles), whether or not it is on screen.
    w.__sceneTriangles = () => {
      const totals: Record<string, number> = {};
      scene.traverse((o) => {
        const mesh = o as InstancedMesh;
        if (!mesh.isMesh) return;
        const g = mesh.geometry;
        const tris = (g.index ? g.index.count : g.attributes.position.count) / 3;
        let layer = "other";
        for (let p: Object3D | null = o; p; p = p.parent) {
          if (p.name && p.name !== "upper") {
            layer = p.name.replace("_upper", "");
            break;
          }
        }
        totals[layer] = (totals[layer] ?? 0) + tris * (mesh.isInstancedMesh ? mesh.count : 1);
      });
      return totals;
    };

    const before = addEffect(() => {
      start = performance.now();
      gl.info.reset();
      if (ext && !query) {
        query = ctx.createQuery();
        if (query) ctx.beginQuery(ext.TIME_ELAPSED_EXT, query);
      }
    });
    const after = addAfterEffect(() => {
      const now = performance.now();
      const sample: FrameSample = { t: now, cpu: now - start, gpu: null, triangles: gl.info.render.triangles, calls: gl.info.render.calls };
      if (ext && query) {
        ctx.endQuery(ext.TIME_ELAPSED_EXT);
        pending.push({ query, sample });
        query = null;
      }
      for (let i = pending.length - 1; i >= 0; i--) {
        const p = pending[i];
        if (!ctx.getQueryParameter(p.query, ctx.QUERY_RESULT_AVAILABLE)) continue;
        if (!ctx.getParameter(ext!.GPU_DISJOINT_EXT)) p.sample.gpu = ctx.getQueryParameter(p.query, ctx.QUERY_RESULT) / 1e6;
        ctx.deleteQuery(p.query);
        pending.splice(i, 1);
      }
      samples.push(sample);
      if (samples.length > 2000) samples.splice(0, samples.length - 2000);

      if (now - lastWrite < 250) return;
      lastWrite = now;
      const recent = samples.filter((s) => now - s.t < 1000);
      const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
      const gpu = mean(recent.flatMap((s) => (s.gpu === null ? [] : [s.gpu])));
      const el = document.querySelector("[data-scene-stats]");
      if (el) {
        el.textContent = [
          `fps   ${recent.length}`,
          `cpu   ${mean(recent.map((s) => s.cpu)).toFixed(2)} ms`,
          `gpu   ${Number.isNaN(gpu) ? "n/a" : `${gpu.toFixed(2)} ms`}`,
          `tris  ${(sample.triangles / 1000).toFixed(1)}k`,
          `calls ${sample.calls}`,
        ].join("\n");
      }
    });
    return () => {
      before();
      after();
      gl.info.autoReset = true;
    };
  }, [gl, scene]);

  return null;
}
