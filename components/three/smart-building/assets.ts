import {
  EquirectangularReflectionMapping,
  NoColorSpace,
  RepeatWrapping,
  SRGBColorSpace,
  TextureLoader,
  type Texture,
} from "three";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";

/**
 * Downloaded CC0 assets (credits in components/three/README.md). `onFile` fires as each file
 * arrives so the preloader can count them. Any failure falls back to the procedural canvas maps
 * and the Lightformer environment.
 */

export type SceneMaps = {
  /** ambientCG Concrete034: slabs, core, podium. */
  concrete: { map: Texture; normalMap: Texture; roughnessMap: Texture };
  /** ambientCG Metal009 (brushed steel): mullions, fins, trays, spandrels, equipment. */
  brushed: { normalMap: Texture; roughnessMap: Texture };
};

export type MapSize = "1k" | "512";

const loadTexture = async (url: string, srgb: boolean) => {
  const t = await new TextureLoader().loadAsync(url);
  t.colorSpace = srgb ? SRGBColorSpace : NoColorSpace;
  t.wrapS = t.wrapT = RepeatWrapping;
  t.anisotropy = 8;
  return t;
};

/** Number of files `loadMaps` fetches (for progress). */
export const MAP_FILES = 5;

export async function loadMaps(size: MapSize, onFile: () => void = () => {}): Promise<SceneMaps | null> {
  const url = (name: string) => `/textures/${name}-${size}.webp`;
  const counted = (p: Promise<Texture>) => p.then((t) => (onFile(), t));
  try {
    const [color, concreteNormal, concreteRough, brushedNormal, brushedRough] = await Promise.all([
      counted(loadTexture(url("concrete-color"), true)),
      counted(loadTexture(url("concrete-normal"), false)),
      counted(loadTexture(url("concrete-roughness"), false)),
      counted(loadTexture(url("brushed-normal"), false)),
      counted(loadTexture(url("brushed-roughness"), false)),
    ]);
    for (const t of [color, concreteNormal, concreteRough]) t.repeat.set(2, 2);
    return {
      concrete: { map: color, normalMap: concreteNormal, roughnessMap: concreteRough },
      brushed: { normalMap: brushedNormal, roughnessMap: brushedRough },
    };
  } catch {
    return null;
  }
}

/** Poly Haven HDRIs, 768 × 384 Radiance: night (dark theme) and dusk (light theme). */
const ENVIRONMENTS = { dark: "/env/night.hdr", light: "/env/dusk.hdr" } as const;
const environments = new Map<keyof typeof ENVIRONMENTS, Promise<Texture | null>>();

/** Loads (once per page) the equirect HDRI for a theme, or null if it can't be loaded. */
export function loadEnvironment(theme: keyof typeof ENVIRONMENTS) {
  let pending = environments.get(theme);
  if (!pending) {
    pending = new HDRLoader()
      .loadAsync(ENVIRONMENTS[theme])
      .then((t: Texture) => {
        t.mapping = EquirectangularReflectionMapping;
        return t;
      })
      .catch(() => null);
    environments.set(theme, pending);
  }
  return pending;
}
