# Smart-Building X-ray (home-page 3D scene)

A Doha tower that opens layer by layer as the home page scrolls. Each layer is one service.
The scene only draws; every word stays in the page's own HTML.

## Mount it

```tsx
// a client component, e.g. components/sections/home-scene.tsx
"use client";
import dynamic from "next/dynamic";

const SmartBuildingScene = dynamic(() => import("@/components/three/smart-building-scene"), {
  ssr: false,
  loading: () => null,
});

export function HomeScene() {
  return <SmartBuildingScene />;
}
```

- Render `<HomeScene />` once on the home page, next to the beat sections.
- It positions itself: `pointer-events-none fixed inset-x-0 top-0 -z-10 h-lvh`.
  - `h-lvh` stops the canvas resizing when the mobile URL bar shows or hides.
  - Keep `<html>` without a background colour, so `body`'s background paints underneath it.
- Text over the scene needs its own contrast, for example the dev page's `bg-background/80 backdrop-blur-sm` cards.
- The canvas appears after first paint, in its own lazy chunk (three, R3F, postprocessing and GSAP). It is never the LCP element.

## The data-beat contract

The page renders seven sections, in any markup:

```tsx
<section data-beat="0" className="min-h-dvh">…</section>
…
<section data-beat="6" className="min-h-dvh">…</section>
```

- The scene creates one ScrollTrigger per pair of neighbouring sections, running from centre to centre.
- The beat value is the sum of those triggers' progress, so it is exactly N when section N is centred in the viewport.
- Between two centres, the beat moves continuously.
- If Lenis is used, call `lenis.on("scroll", ScrollTrigger.update)` as usual.

| Beat | What happens | Named group |
|---|---|---|
| 0 | Tower at night (dark theme) or dusk (light theme), red rim-light, red diagonal band | `facade`, `structure` |
| 1 | Facade dissolves into a glowing fibre riser and floor branches | `fibre` |
| 2 | The data-hall slice opens; the camera looks down a contained cold aisle at eye level | `racks` |
| 3 | At the entrance: CCTV with sight-line cones, card readers, APs, PA and BMS devices pulse | `elv_devices` |
| 4 | Hexagonal shield dome forms | `shield` |
| 5 | Camera pulls out to a networked city of light | `city` |
| 6 | Tower settles | — |

- Layer timing lives in `smart-building/timeline.ts`: `layerWeights`, plus one camera frame per beat.
- On wide screens the tower sits on the end side, mirrored for `dir="rtl"`.

## Props

| Prop | Type | Use |
|---|---|---|
| `className` | `string` | Merged onto the fixed wrapper. |
| `quality` | `"desktop" \| "mobile" \| "low"` | Forces a profile and skips GPU detection. QA only. |
| `stats` | `boolean` | Writes FPS, CPU and GPU frame time, triangles and draw calls into any `[data-scene-stats]` element. It also exposes `window.__sceneStats` (per-frame samples) and `window.__sceneTriangles()` (built triangles per layer). QA only; the dev page's `?stats=1` turns it on. |

## What is modelled

All geometry is procedural (no model files). Lighting and the main surfaces use downloaded CC0 assets (see "Assets and credits"); everything else is generated in the browser.

- **Textures** are drawn on canvas or generated as noise at start-up (`smart-building/textures.ts`):
  - server faces with 1U/2U bezels and drive bays
  - perforated doors
  - raised-floor tiles
  - cooler and UPS fronts
  - patch panels
  - city facades and lit-window sheets
  - concrete and brushed-metal normal maps, used only if the downloaded maps fail to load
- **Tower:**
  - three setbacks, each a 24-sided curtain wall: glass panes over aluminium spandrels, continuous mullions
  - slabs, a concrete core and perimeter columns
  - setback terraces with rooftop plant
  - a tapered crown of aluminium fins, and a mast with platforms and a beacon
  - a lobby podium with transmission glass (desktop) and an entrance canopy
  - the brand's red diagonal is a helix of red spandrels
- **Fibre riser:**
  - a ladder rack (rails and rungs) on each core face, with glowing fibre strands
  - a patch panel per floor
  - floor-level U-trays with fibre bundles, as `TubeGeometry` along Catmull-Rom curves
- **Data hall:**
  - 42U racks: textured server faces, perforated doors, instanced status LEDs
  - a raised floor, with perforated tiles in the cold aisles
  - glass cold-aisle containment with frames and end doors
  - in-row coolers and UPS cabinets
  - overhead ladder trays, yellow fibre raceways and linear lights
- **ELV devices:**
  - lathe-turned dome cameras
  - bullet cameras with extruded sunshields on brackets and perimeter poles
  - card readers, ceiling Wi-Fi APs, flush PA speakers, wall BMS sensors and PA horns
- **Shield:** bevelled hexagonal cells on the dome, with a fresnel rim.
- **City:**
  - instanced blocks (box and round, some with setbacks) with canvas window textures and lit windows that vary per building
  - four West Bay landmark towers
  - network arcs
- **Lighting:**
  - desktop: the theme's Poly Haven HDRI (night or dusk) via drei's `EnvironmentPortal`, plus one red Lightformer strip so glass and metal keep a brand-red edge
  - mobile/low, and while an HDRI loads: an environment built from Lightformers, night and dusk sets
  - a moon or sun key light
  - a narrow red rim spotlight on the tower
  - contact shadows

## Performance profile

- **Rendering on demand:** `frameloop="demand"`.
  - Scrolling and easing draw every frame.
  - Ambient pulses redraw at 30 fps (desktop) or 24 fps (mobile and low).
  - Nothing renders while the tab is hidden or no `data-beat` section is on screen.
- **Profiles:** `detect-gpu` picks the profile, using benchmark tables bundled from `node_modules`, so there is no request to unpkg.

  | Profile | Used on | DPR cap | Post-processing | Other differences |
  |---|---|---|---|---|
  | Desktop | tier 2 or 3 | 2 | N8AO (half-res), subtle bloom, neutral tone mapping, SMAA | lobby glass transmission, 256 px environment map |
  | Mobile | phones, small or touch screens | 1.5 | None (renderer neutral tone mapping) | 16 facets, 2-floor panels, fewer fibre branches, racks and devices, unbevelled shield, smaller city |
  | Low | tier 1, or unknown GPU | 1.25 | None | as mobile |

- **No mid-scroll hitches:** before the first frame, `Ready`:
  - compiles every program, including layers that start hidden, against a half-float target like the composer's
  - uploads every texture
- **Start-up:** the preloader covers the downloads, geometry build and shader compile; about 2 s on desktop from a warm cache. Its percentage counts the GPU check, each texture, the HDRI, the build and the compile.
- **Preloader position:** centred from md up; on phones it is small and faint in the bottom-end corner, above the mobile CTA bar (4.75rem + safe area), clear of the hero text.
- **Adaptive resolution:**
  - **How it measures:** it only uses frames rendered back to back while the beat is moving. The throttled idle redraws are ignored.
  - **Stepping down:** if the median over about 45 frames misses the profile's target (55 fps on desktop, 30 fps on mobile and low), the pixel ratio drops 15%, but never below 1.
  - **Stepping up:** it climbs back when there is clear headroom.
  - **Checked:** a simulated slow main thread took DPR from 1.25 to 1, and it recovered once frames were fast again.

- **Size:** see "Measured" below.
  - Every repeated part is instanced.
  - Hidden layers skip their draw calls.
  - Physical surfaces use `MeshStandardMaterial` and `MeshPhysicalMaterial`.
  - Light-emitting parts use small custom shaders.
- **Fallback:** `SceneFallback` renders instead of the canvas for reduced motion, no WebGL, a blocklisted GPU (tier 0) or Save-Data. It is static SVG built from tokens and is server-safe.
- **Theme:** colours come from `--primary`, `--glow` and `--background`, read again whenever next-themes' `resolvedTheme` changes. Fog, sky, bloom and emissive strength all follow the theme.

## Assets and credits

All downloaded assets are **CC0** (public domain). No attribution is required; this is the record. Sources were downloaded on 19 Oct 2026 and converted locally; only the outputs below are in the repo.

| File(s) | Asset | Source | Licence | Shipped size |
|---|---|---|---|---|
| `public/env/night.hdr` | Rooftop Night (HDRI), 768 × 384 Radiance, RLE | https://polyhaven.com/a/rooftop_night | CC0 | 910 KB |
| `public/env/dusk.hdr` | Qwantani Dusk 2 (HDRI), 768 × 384 Radiance, RLE | https://polyhaven.com/a/qwantani_dusk_2 | CC0 | 880 KB |
| `public/textures/concrete-{color,normal,roughness}-{1k,512}.webp` | Concrete 034 (PBR set) | https://ambientcg.com/a/Concrete034 | CC0 | 1k: 166 KB · 512: 65 KB |
| `public/textures/brushed-{normal,roughness}-{1k,512}.webp` | Metal 009, brushed steel (PBR set) | https://ambientcg.com/a/Metal009 | CC0 | 1k: 82 KB · 512: 16 KB |

**What loads where (bytes over the wire, measured)**

| Profile | Downloads | Total |
|---|---|---|
| Desktop | the current theme's HDRI + five 1k maps | **1.16 MB** (the other theme's HDRI, 0.88 MB, loads only after a theme switch: 2.04 MB at most) |
| Mobile / low | five 512 px maps, no HDRI | **81 KB** |

Budget (plan section 10): desktop < 3 MB, mobile < 1.5 MB. The assets load only with the lazy scene chunk, so initial JS is unchanged.

**How they were made**
- **HDRIs:** box-downsampled 1024 → 768 px in linear float with three's `HDRLoader`, then re-encoded as RLE Radiance.
- **Maps:** resized with `sharp` (already in `node_modules`, part of Next) and encoded as WebP:
  - normals at q88, roughness (greyscale) q72, colour q78
  - KTX2 was not used: it would also need the Basis transcoder (about 0.5 MB of wasm) over the wire.
- **Also approved, but not used:**
  - **Painted Metal 004** (downloaded): it is chipped, scratched red paint, wrong for a premium tower.
  - **Sheet Metal 001 and Facade 006** (not downloaded): the canvas perforation and city facades are built to line up with the rack doors and the lit-window mapping, which these sheets would not.

## Measured (19 Oct 2026)

Dev page `?stats=1`, a scripted scrub from beat 0 to 6 and back (6 s each way), dark theme, **with the downloaded HDRI and PBR maps**. GPU time comes from `EXT_disjoint_timer_query_webgl2`.

**Test machine:** RTX 4050 Laptop GPU on a 166 Hz display. This is faster than the plan's "mid-range laptop" and far faster than a mid-range Android phone, so these numbers show headroom, not proof for those devices.

| | Desktop, 1440×900, DPR 1.25 | Mobile profile, 375×812, DPR 1.5 |
|---|---|---|
| Frame rate | 165 fps (display-bound) | 145 fps |
| Frame time p50 / p95 | 6.1 / 6.7 ms | 6.1 / 6.5 ms |
| CPU per frame p50 / p95 | 1.4 / 2.0 ms | 0.6 / 0.9 ms |
| GPU per frame p50 / p95 | 4.9 / 5.8 ms | 2.1 / 3.9 ms |
| 3D assets downloaded | 1.16 MB | 81 KB |
| Triangles built (all layers) | 136k | 39.5k |
| Triangles drawn, peak frame | 283k (transmission pre-pass draws the opaque scene twice) | 35k |
| Draw calls, peak | 246 | 86 |

**First scrub after load**
- At most one 30–45 ms CPU frame; every later frame is under 4 ms.
- Before the pre-compile and texture-upload fix, the first visit to beat 3 cost about 390 ms.
- Transparent double-sided materials now draw in a single pass (`forceSinglePass`), so they need no extra shader variants on first use.

**Mobile run**
- The run includes a gap of 0.9–1.6 s with no frames once the footer is reached. That is the intended pause when no `data-beat` section is on screen.

**Not measured here**
- **Mid-range Android:** the plan's ≥30 fps target. Check it on a real phone with `?stats=1`.
- **Integrated-GPU laptop:** the ≥55 fps target. Check it the same way.
- **Safety net:** adaptive resolution covers both cases.

## Swapping in a Blender glTF or real assets later

`ASSET-PROPOSAL.md` lists the free assets that were considered. The CC0 HDRIs and textures are now in use (see "Assets and credits"). The CC-BY models were not approved and are not in the repo.

1. In Blender, keep collections named `facade`, `fibre`, `racks`, `elv_devices`, `shield` and `city`. Keep the whole model under 150k triangles; the mobile LOD should be about 40k.
2. Compress the model:
   ```bash
   npx @gltf-transform/cli optimize tower.glb public/models/tower.glb --compress meshopt --texture-compress ktx2
   ```
   Use `--compress draco` instead if you prefer Draco. Make a `tower-mobile.glb` the same way, from the lighter LOD with 1K textures.
3. Load it with drei's `useGLTF("/models/tower.glb", true, true)`:
   - the second argument is Draco, the third is Meshopt
   - add `useKTX2` for textures, with the transcoder copied to `public/basis/`
4. Replace the procedural group of the same name with `nodes`/`scene.getObjectByName(...)`. Keep each component's `useFrame` that reads `layerWeights` and drives its uniforms or transforms.
5. glTF loads report through three's DefaultLoadingManager, so the preloader's percentage includes them automatically.
6. Keep 3D assets under 3 MB on desktop and 1.5 MB on mobile (plan section 10).
