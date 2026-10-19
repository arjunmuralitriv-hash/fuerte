import {
  Color,
  DoubleSide,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Vector2,
  type IUniform,
  type Material,
  type Texture,
} from "three";

import { brushedNormal, cityFacades, concreteNormal } from "./textures";

/**
 * PBR materials for the "real" parts of the scene (concrete, glass, aluminium, powder-coated steel)
 * lit by the Lightformer environment, plus two shader injections:
 * - facade: the beat-1 dissolve (panels scale away and fly out, ember edge) and lit offices behind glass
 * - city: per-building window texture scaled to the block, lit windows at night, networked roofs.
 */

type Uniforms = Record<string, IUniform>;

/* ------------------------------------------------------------------------------------------ */
/* Facade injection                                                                            */
/* ------------------------------------------------------------------------------------------ */

export function createFacadeUniforms(towerHeight: number) {
  return {
    uDissolve: { value: 0 },
    uTowerHeight: { value: towerHeight },
    uEmber: { value: new Color() },
    uWindow: { value: new Color() },
    uLitRatio: { value: 0.3 },
  } satisfies Uniforms;
}
export type FacadeUniforms = ReturnType<typeof createFacadeUniforms>;

/** Adds the dissolve (and, for glass, lit interiors) to a standard/physical material. Needs `aSeed` (vec2) per instance. */
export function withFacade<M extends MeshStandardMaterial>(material: M, uniforms: FacadeUniforms, lit: boolean): M {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        /* glsl */ `#include <common>
attribute vec2 aSeed;
uniform float uDissolve;
uniform float uTowerHeight;
uniform float uLitRatio;
varying float vHeat;
varying float vLit;
varying vec2 vFacadeUv;`,
      )
      .replace(
        "#include <begin_vertex>",
        /* glsl */ `#include <begin_vertex>
vec3 dOrigin = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
float dOrder = (1.0 - clamp(dOrigin.y / uTowerHeight, 0.0, 1.0)) * 0.6 + aSeed.x * 0.4;
float dP = clamp((uDissolve * 1.35 - dOrder) / 0.35, 0.0, 1.0);
transformed *= 1.0 - smoothstep(0.45, 1.0, dP);
vHeat = dP * (1.0 - dP) * 4.0;
vLit = step(aSeed.y, uLitRatio) * (0.55 + 0.45 * fract(aSeed.y * 37.0));
vFacadeUv = uv;`,
      )
      .replace(
        "#include <project_vertex>",
        /* glsl */ `vec4 mvPosition = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
mvPosition = instanceMatrix * mvPosition;
#endif
vec2 dRadial = normalize(dOrigin.xz + vec2(1e-4));
mvPosition.xz += dRadial * dP * dP * 2.2;
mvPosition.y += dP * dP * 1.4;
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        /* glsl */ `#include <common>
uniform vec3 uEmber;
uniform vec3 uWindow;
varying float vHeat;
varying float vLit;
varying vec2 vFacadeUv;`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        /* glsl */ `#include <emissivemap_fragment>
totalEmissiveRadiance += uEmber * vHeat;
${lit ? "totalEmissiveRadiance += uWindow * vLit * (0.3 + 0.7 * smoothstep(0.1, 0.95, vFacadeUv.y));" : ""}`,
      );
  };
  material.customProgramCacheKey = () => `facade-${lit}`;
  return material;
}

/* ------------------------------------------------------------------------------------------ */
/* City injection                                                                              */
/* ------------------------------------------------------------------------------------------ */

export function createCityUniforms() {
  return {
    uLit: { value: null as Texture | null },
    uLitStrength: { value: 1 },
    uNetwork: { value: 0 },
    uGlow: { value: new Color() },
    uRoof: { value: new Color("#1a1b1f") },
  } satisfies Uniforms;
}
export type CityUniforms = ReturnType<typeof createCityUniforms>;

/** One window tile spans 4 floors × 4 bays of 0.3 units. */
const TILE = 1.2;

export function withCity<M extends MeshStandardMaterial>(material: M, uniforms: CityUniforms, round: boolean): M {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        /* glsl */ `#include <common>
attribute vec2 aSeed;
varying vec2 vCityUv;
varying float vRoof;
varying vec2 vSeed;`,
      )
      .replace(
        "#include <begin_vertex>",
        /* glsl */ `#include <begin_vertex>
vec3 cScale = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
float cWidth = ${round ? "6.2832 * cScale.x" : "abs(normal.x) > 0.5 ? cScale.z : cScale.x"};
vCityUv = vec2(uv.x * cWidth, uv.y * cScale.y) / ${TILE.toFixed(2)};
vRoof = step(0.5, normal.y);
vSeed = aSeed;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        /* glsl */ `#include <common>
uniform sampler2D uLit;
uniform float uLitStrength;
uniform float uNetwork;
uniform vec3 uGlow;
uniform vec3 uRoof;
varying vec2 vCityUv;
varying float vRoof;
varying vec2 vSeed;`,
      )
      .replace(
        "#include <map_fragment>",
        /* glsl */ `diffuseColor.rgb = mix(diffuseColor.rgb * texture2D(map, vCityUv).rgb, uRoof, vRoof);`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        /* glsl */ `#include <emissivemap_fragment>
vec2 litUv = vCityUv * 0.25 + floor(vSeed.x * vec2(16.0, 9.0)) * 0.25;
totalEmissiveRadiance += texture2D(uLit, litUv).rgb * uLitStrength * (1.0 - vRoof);
totalEmissiveRadiance += uGlow * vSeed.y * uNetwork * (vRoof * 2.5 + 0.12);`,
      );
  };
  material.customProgramCacheKey = () => `city-${round}`;
  return material;
}

export function createCityMaterials(uniforms: CityUniforms) {
  const { maps, lit } = cityFacades();
  uniforms.uLit.value = lit;
  return maps.map((map, i) => ({
    box: withCity(new MeshStandardMaterial({ map, roughness: 0.55, metalness: i === 2 ? 0.5 : 0.1 }), uniforms, false),
    round: withCity(new MeshStandardMaterial({ map, roughness: 0.4, metalness: i === 2 ? 0.6 : 0.15 }), uniforms, true),
  }));
}

/* ------------------------------------------------------------------------------------------ */
/* Shared building materials                                                                   */
/* ------------------------------------------------------------------------------------------ */

export function createBuildingMaterials(towerHeight: number, transmission: boolean) {
  const facade = createFacadeUniforms(towerHeight);
  const concrete = new MeshStandardMaterial({
    color: "#8e8b87",
    roughness: 0.88,
    metalness: 0,
    normalMap: concreteNormal(),
    normalScale: new Vector2(0.5, 0.5),
  });
  const darkConcrete = concrete.clone();
  darkConcrete.color.set("#5b5955");
  const glass = withFacade(
    new MeshPhysicalMaterial({
      color: "#1d2630",
      roughness: 0.06,
      metalness: 0.1,
      ior: 1.52,
      specularIntensity: 1,
      envMapIntensity: 1.6,
      clearcoat: 0.4,
      clearcoatRoughness: 0.05,
    }),
    facade,
    true,
  );
  const spandrel = withFacade(
    new MeshStandardMaterial({ color: "#2b2d33", roughness: 0.35, metalness: 0.7, normalMap: brushedNormal() }),
    facade,
    false,
  );
  const band = withFacade(new MeshStandardMaterial({ roughness: 0.3, metalness: 0.5 }), facade, false);
  const mullion = withFacade(
    new MeshStandardMaterial({ color: "#a3a8b0", roughness: 0.28, metalness: 0.95, normalMap: brushedNormal() }),
    facade,
    false,
  );
  const aluminium = new MeshStandardMaterial({ color: "#b4b9c0", roughness: 0.3, metalness: 0.95, normalMap: brushedNormal() });
  const darkMetal = new MeshStandardMaterial({ color: "#1e2024", roughness: 0.5, metalness: 0.6, normalMap: brushedNormal() });
  // Lobby glass: real transmission on desktop; a tinted reflective pane elsewhere.
  const lobbyGlass = new MeshPhysicalMaterial(
    transmission
      ? { color: "#e8f0f4", roughness: 0.04, metalness: 0, transmission: 1, thickness: 0.05, ior: 1.5, envMapIntensity: 1.3 }
      : { color: "#2a3540", roughness: 0.06, metalness: 0.2, envMapIntensity: 1.6, transparent: true, opacity: 0.75 },
  );
  const lobbyInterior = new MeshStandardMaterial({ color: "#d8d2c8", roughness: 0.6, emissive: "#ffe2c4", emissiveIntensity: 0.4 });
  return { facade, concrete, darkConcrete, glass, spandrel, band, mullion, aluminium, darkMetal, lobbyGlass, lobbyInterior };
}
export type BuildingMaterials = ReturnType<typeof createBuildingMaterials>;

/** Equipment: powder-coated rack steel, white device plastic, smoked camera domes. */
export function createEquipmentMaterials() {
  return {
    rackSteel: new MeshStandardMaterial({ color: "#16171a", roughness: 0.55, metalness: 0.45, normalMap: brushedNormal() }),
    whitePlastic: new MeshStandardMaterial({ color: "#e9e9e6", roughness: 0.42, metalness: 0 }),
    greyPlastic: new MeshStandardMaterial({ color: "#7b7f86", roughness: 0.5, metalness: 0.1 }),
    blackPlastic: new MeshStandardMaterial({ color: "#121316", roughness: 0.38, metalness: 0.05 }),
    smokedDome: new MeshPhysicalMaterial({
      color: "#0b0c0e",
      roughness: 0.05,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.03,
      transparent: true,
      opacity: 0.88,
      envMapIntensity: 1.8,
    }),
    lens: new MeshPhysicalMaterial({ color: "#05070a", roughness: 0.02, metalness: 0.3, clearcoat: 1, envMapIntensity: 2 }),
    containmentGlass: new MeshPhysicalMaterial({
      color: "#dfe9ef",
      roughness: 0.05,
      metalness: 0,
      transparent: true,
      opacity: 0.22,
      side: DoubleSide,
      depthWrite: false,
      envMapIntensity: 1.5,
    }),
    fibreYellow: new MeshStandardMaterial({ color: "#e7b416", roughness: 0.45, metalness: 0 }),
  };
}

/** Staggered pop-in for equipment: each instance (needs `aPhase`, 0..1) scales up from its mount point. */
export function withReveal<M extends MeshStandardMaterial>(material: M, uReveal: IUniform<number>): M {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uReveal = uReveal;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float aPhase;\nuniform float uReveal;")
      .replace(
        "#include <begin_vertex>",
        /* glsl */ `#include <begin_vertex>
float rv = clamp(uReveal * 1.5 - aPhase * 0.5, 0.0, 1.0);
transformed *= rv * rv * (3.0 - 2.0 * rv);`,
      );
  };
  material.customProgramCacheKey = () => "reveal";
  return material;
}

/** Disposes every material in a bag (skipping uniform objects and other non-materials). */
export function disposeMaterials(bag: Record<string, unknown>) {
  for (const value of Object.values(bag)) {
    for (const one of Array.isArray(value) ? value : [value]) {
      if ((one as Material)?.isMaterial) (one as Material).dispose();
    }
  }
}
