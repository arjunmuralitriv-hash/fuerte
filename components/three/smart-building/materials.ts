import {
  AdditiveBlending,
  BackSide,
  Color,
  DoubleSide,
  NormalBlending,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
  Vector3,
  type IUniform,
  type Side,
} from "three";

import type { Palette } from "./palette";

/**
 * Hand-written shaders for what PBR can't do: light itself (fibre and network pulses, LEDs,
 * sight-line cones, ripples, the shield) plus the sky and ground. Physical surfaces live in pbr.ts.
 * Fog uses three's scene fog uniforms (fog: true), applied manually so glows fade instead of greying.
 */

/** Moon/sun (key) and red rim-light directions, shared by the lights and the sky's haze. */
export const KEY_DIR = new Vector3(-0.55, 0.65, 0.55).normalize();
export const RIM_DIR = new Vector3(0.85, 0.25, -0.5).normalize();

// Every pow() base is clamped: MSAA can evaluate varyings just outside a triangle, and pow() of a
// tiny negative is NaN, which bloom then smears across the whole frame.
const FOG_V = /* glsl */ `varying float vFogDepth;`;
const FOG_F = /* glsl */ `
uniform vec3 fogColor;
uniform float fogNear;
uniform float fogFar;
varying float vFogDepth;
float fogAmount() { return smoothstep(fogNear, fogFar, vFogDepth); }
`;
/** Instance-aware model position: three defines USE_INSTANCING for InstancedMesh. */
const INSTANCE = /* glsl */ `
vec4 instanced(vec3 p) {
  #ifdef USE_INSTANCING
  return instanceMatrix * vec4(p, 1.0);
  #else
  return vec4(p, 1.0);
  #endif
}
`;

type Uniforms = Record<string, IUniform>;
const u = <T>(value: T): IUniform<T> => ({ value });

function make(
  name: string,
  vertexShader: string,
  fragmentShader: string,
  uniforms: Uniforms,
  opts: { glow?: boolean; side?: Side } = {},
) {
  const material = new ShaderMaterial({
    name,
    vertexShader,
    fragmentShader,
    uniforms: { ...UniformsUtils.clone(UniformsLib.fog), ...uniforms },
    fog: true,
  });
  if (opts.side !== undefined) material.side = opts.side;
  if (opts.glow) {
    material.transparent = true;
    material.depthWrite = false;
    material.blending = AdditiveBlending;
  }
  return material;
}

/** Glows add light on the night sky; on the light dusk sky they are drawn as plain alpha. */
export function applyGlowBlending(palette: Palette, ...materials: ShaderMaterial[]) {
  for (const m of materials) m.blending = palette.additive ? AdditiveBlending : NormalBlending;
}

/* ------------------------------------------------------------------------------------------ */
/* Flow: fibre, cabling and network arcs with pulses travelling along them.                    */
/* ------------------------------------------------------------------------------------------ */

const FLOW_PARAM = {
  /** Tubes: uv.x runs along the curve. */
  u: "uv.x",
  /** Cylinders: uv.y runs along the axis. */
  v: "uv.y",
  /** Vertical risers: world height, so pulses keep their spacing when the mesh is stretched. */
  y: "(modelMatrix * instanced(position)).y / 12.0",
};

export function createFlowMaterial(along: keyof typeof FLOW_PARAM) {
  return make(
    "flow",
    /* glsl */ `
    attribute float aPhase;
    varying float vT;
    varying float vPhase;
    ${FOG_V}
    ${INSTANCE}
    void main() {
      vT = ${FLOW_PARAM[along]};
      vPhase = aPhase;
      vec4 mv = modelViewMatrix * instanced(position);
      vFogDepth = -mv.z;
      gl_Position = projectionMatrix * mv;
    }`,
    /* glsl */ `
    uniform vec3 uColor;
    uniform vec3 uHot;
    uniform float uTime;
    uniform float uOpacity;
    uniform float uSpeed;
    uniform float uDensity;
    uniform float uDraw;
    uniform float uBase;
    varying float vT;
    varying float vPhase;
    ${FOG_F}
    void main() {
      // Lines draw on from their start, staggered by phase.
      if (vT > uDraw * 1.3 - vPhase * 0.3) discard;
      float pulse = pow(fract(vT * uDensity - uTime * uSpeed + vPhase * 7.0), 8.0);
      float a = (uBase + pulse * 1.6) * uOpacity * (1.0 - fogAmount());
      if (a < 0.004) discard;
      gl_FragColor = vec4(mix(uColor, uHot, pulse * 0.6), min(a, 1.5));
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
    {
      uColor: u(new Color()),
      uHot: u(new Color()),
      uTime: u(0),
      uOpacity: u(0),
      uSpeed: u(0.35),
      uDensity: u(2),
      uDraw: u(1),
      uBase: u(0.3),
    },
    { glow: true },
  );
}

/** Status LEDs: per-instance colour, each blinking at its own rate (drive activity, link lights). */
export function createLedMaterial() {
  return make(
    "led",
    /* glsl */ `
    attribute vec3 aColor;
    attribute float aPhase;
    uniform float uTime;
    varying vec3 vColor;
    varying float vOn;
    ${FOG_V}
    ${INSTANCE}
    void main() {
      vColor = aColor;
      vOn = 0.25 + 0.75 * step(0.3, fract(uTime * (0.4 + aPhase * 3.0) + aPhase * 13.0));
      vec4 mv = modelViewMatrix * instanced(position);
      vFogDepth = -mv.z;
      gl_Position = projectionMatrix * mv;
    }`,
    /* glsl */ `
    uniform float uIntensity;
    varying vec3 vColor;
    varying float vOn;
    ${FOG_F}
    void main() {
      gl_FragColor = vec4(vColor * vOn * uIntensity * (1.0 - fogAmount()), 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
    { uTime: u(0), uIntensity: u(3) },
  );
}

/** Expanding rings round access points and PA speakers (geometry lies flat in XZ). */
export function createRippleMaterial() {
  return make(
    "ripple",
    /* glsl */ `
    attribute float aPhase;
    attribute float aSize;
    uniform float uTime;
    varying float vAlpha;
    ${FOG_V}
    void main() {
      float s = fract(uTime * 0.5 + aPhase);
      vAlpha = (1.0 - s) * (1.0 - s);
      vec4 mv = modelViewMatrix * instanceMatrix * vec4(position * (0.15 + s) * aSize, 1.0);
      vFogDepth = -mv.z;
      gl_Position = projectionMatrix * mv;
    }`,
    /* glsl */ `
    uniform vec3 uColor;
    uniform float uOpacity;
    varying float vAlpha;
    ${FOG_F}
    void main() {
      float a = vAlpha * uOpacity * (1.0 - fogAmount());
      if (a < 0.004) discard;
      gl_FragColor = vec4(uColor, a);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
    { uTime: u(0), uColor: u(new Color()), uOpacity: u(0) },
    { glow: true, side: DoubleSide },
  );
}

/** CCTV sight-line cones: bright at the lens, fading out, with a slow scan line. */
export function createConeMaterial() {
  return make(
    "sight-cone",
    /* glsl */ `
    varying vec2 vUv;
    varying vec3 vNormalW;
    varying vec3 vPosW;
    ${FOG_V}
    void main() {
      vUv = uv;
      vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
      vPosW = world.xyz;
      vNormalW = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
      vec4 mv = viewMatrix * world;
      vFogDepth = -mv.z;
      gl_Position = projectionMatrix * mv;
    }`,
    /* glsl */ `
    uniform vec3 uColor;
    uniform float uOpacity;
    uniform float uTime;
    varying vec2 vUv;
    varying vec3 vNormalW;
    varying vec3 vPosW;
    ${FOG_F}
    void main() {
      vec3 v = normalize(cameraPosition - vPosW);
      float edge = 1.0 - abs(dot(normalize(vNormalW), v));
      float scan = smoothstep(0.85, 1.0, sin(vUv.y * 16.0 + uTime * 3.0)) * 0.6;
      float along = clamp(vUv.y, 0.0, 1.0);
      float a = pow(along, 1.4) * (0.12 + edge * 0.5 + scan * along) * uOpacity * (1.0 - fogAmount());
      if (a < 0.004) discard;
      gl_FragColor = vec4(uColor, a);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
    { uColor: u(new Color()), uOpacity: u(0), uTime: u(0) },
    { glow: true, side: DoubleSide },
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Shield: hexagon tiles forming a dome from the ground up.                                    */
/* ------------------------------------------------------------------------------------------ */

export function createHexMaterial() {
  return make(
    "shield-hex",
    /* glsl */ `
    attribute vec2 aData; // x: formation delay 0..1, y: random
    uniform float uForm;
    varying vec2 vLocal;
    varying float vFlash;
    varying float vRand;
    varying vec3 vNormalW;
    varying vec3 vPosW;
    varying float vBevel;
    ${FOG_V}
    void main() {
      float p = clamp((uForm * 1.35 - aData.x) / 0.35, 0.0, 1.0);
      // Bevelled faces lean away from the cell's own normal (+Z): they catch the light.
      vBevel = 1.0 - abs(normal.z);
      float grow = 1.0 - pow(1.0 - p, 3.0);
      vLocal = position.xy;
      vFlash = p * (1.0 - p) * 4.0;
      vRand = aData.y;
      vec3 lifted = position * grow + vec3(0.0, 0.0, (1.0 - grow) * 1.2);
      vec4 world = modelMatrix * instanceMatrix * vec4(lifted, 1.0);
      vPosW = world.xyz;
      vNormalW = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * vec3(0.0, 0.0, 1.0));
      vec4 mv = viewMatrix * world;
      vFogDepth = -mv.z;
      gl_Position = projectionMatrix * mv;
    }`,
    /* glsl */ `
    uniform vec3 uColor;
    uniform vec3 uHot;
    uniform float uOpacity;
    uniform float uTime;
    uniform float uSize;
    varying vec2 vLocal;
    varying float vFlash;
    varying float vRand;
    varying vec3 vNormalW;
    varying vec3 vPosW;
    varying float vBevel;
    ${FOG_F}
    void main() {
      vec2 q = abs(vLocal / uSize);
      // Distance to a regular hexagon's edge (vertex on +x), 1.0 at the edge.
      float hex = max(dot(q, vec2(0.866, 0.5)), q.y) / 0.866;
      float edge = smoothstep(0.72, 0.95, hex);
      vec3 v = normalize(cameraPosition - vPosW);
      float fres = 1.0 - abs(dot(normalize(vNormalW), v));
      float wave = smoothstep(0.92, 1.0, sin(vPosW.y * 0.9 - uTime * 1.6 + vRand * 0.6));
      float shimmer = 0.5 + 0.5 * sin(uTime * 2.0 + vRand * 40.0);
      // Fresnel on the dome normal gives the shield its bright rim; bevels add a lit edge per cell.
      float rim = pow(clamp(fres, 0.0, 1.0), 2.0);
      float a = (edge * 0.55 + vBevel * 0.9 + 0.05 + wave * 0.35 + vFlash) * mix(0.25, 1.4, rim) * (0.75 + 0.25 * shimmer);
      a *= uOpacity * (1.0 - fogAmount());
      if (a < 0.004) discard;
      gl_FragColor = vec4(mix(uColor, uHot, vFlash * 0.5 + wave * 0.3), a);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
    { uColor: u(new Color()), uHot: u(new Color()), uOpacity: u(0), uTime: u(0), uForm: u(0), uSize: u(0.36) },
    { glow: true, side: DoubleSide },
  );
}

/** Ground: faint street grid that lights up with pulses radiating from the tower. */
export function createGroundMaterial() {
  return make(
    "ground",
    /* glsl */ `
    varying vec3 vPosW;
    ${FOG_V}
    void main() {
      vec4 world = modelMatrix * vec4(position, 1.0);
      vPosW = world.xyz;
      vec4 mv = viewMatrix * world;
      vFogDepth = -mv.z;
      gl_Position = projectionMatrix * mv;
    }`,
    /* glsl */ `
    uniform vec3 uBase;
    uniform vec3 uLine;
    uniform vec3 uPrimary;
    uniform vec3 uGlow;
    uniform float uNetwork;
    uniform float uTime;
    uniform float uEmissive;
    varying vec3 vPosW;
    ${FOG_F}
    void main() {
      vec2 p = vPosW.xz / 2.6;
      vec2 g = abs(fract(p - 0.5) - 0.5) / fwidth(p);
      float line = 1.0 - min(min(g.x, g.y), 1.0);
      float r = length(vPosW.xz);
      vec3 col = mix(uBase, uLine, line * 0.6);
      float wave = pow(fract(r * 0.035 - uTime * 0.12), 10.0);
      col += uGlow * line * (0.12 + wave * 1.4) * uNetwork * uEmissive;
      col += uPrimary * (1.0 - smoothstep(2.4, 4.0, r)) * 0.06 * uEmissive;
      col = mix(col, fogColor, fogAmount());
      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
    {
      uBase: u(new Color()),
      uLine: u(new Color()),
      uPrimary: u(new Color()),
      uGlow: u(new Color()),
      uNetwork: u(0),
      uTime: u(0),
      uEmissive: u(1),
    },
  );
}

/** Sky dome: gradient to the horizon with a red haze behind the tower (the rim-light source). */
export function createSkyMaterial() {
  const material = new ShaderMaterial({
    name: "sky",
    // The sky's zenith must match the page background exactly, so it skips tone mapping.
    toneMapped: false,
    side: BackSide,
    depthWrite: false,
    vertexShader: /* glsl */ `
    varying vec3 vDir;
    void main() {
      vDir = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
    fragmentShader: /* glsl */ `
    uniform vec3 uTop;
    uniform vec3 uHorizon;
    uniform vec3 uHaze;
    uniform vec3 uHazeDir;
    varying vec3 vDir;
    void main() {
      vec3 d = normalize(vDir);
      vec3 col = mix(uHorizon, uTop, smoothstep(0.0, 0.45, d.y));
      vec3 horiz = normalize(vec3(d.x, 0.0, d.z) + 1e-4);
      float haze = pow(max(dot(horiz, uHazeDir), 0.0), 3.0) * (1.0 - smoothstep(0.0, 0.35, abs(d.y)));
      col += uHaze * haze;
      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
    uniforms: {
      uTop: u(new Color()),
      uHorizon: u(new Color()),
      uHaze: u(new Color()),
      uHazeDir: u(new Vector3(RIM_DIR.x, 0, RIM_DIR.z).normalize()),
    },
  });
  return material;
}
