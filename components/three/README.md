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

Everything is procedural: no model or image files.

- **Textures** are drawn on canvas or generated as noise at start-up (`smart-building/textures.ts`):
  - server faces with 1U/2U bezels and drive bays
  - perforated doors
  - raised-floor tiles
  - cooler and UPS fronts
  - patch panels
  - city facades and lit-window sheets
  - concrete and brushed-metal normal maps
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
  - a drei `<Environment>` built from Lightformers (no HDRI file): night and dusk sets
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
- **Start-up:** the preloader covers about 2 s on desktop: geometry build plus shader compile.
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

## Measured (19 Oct 2026)

Dev page `?stats=1`, a scripted scrub from beat 0 to 6 and back (6 s each way), dark theme. GPU time comes from `EXT_disjoint_timer_query_webgl2`.

**Test machine:** RTX 4050 Laptop GPU on a 166 Hz display. This is faster than the plan's "mid-range laptop" and far faster than a mid-range Android phone, so these numbers show headroom, not proof for those devices.

| | Desktop, 1440×900, DPR 1.25 | Mobile profile, 375×812, DPR 1.5 |
|---|---|---|
| Frame rate | 165 fps (display-bound) | 135 fps |
| Frame time p50 / p95 | 6.1 / 6.6 ms | 6.1 / 6.5 ms |
| CPU per frame p50 / p95 | 1.2 / 1.7 ms | 0.6 / 0.9 ms |
| GPU per frame p50 / p95 | 4.9 / 5.8 ms | 2.7 / 4.3 ms |
| Triangles built (all layers) | 136k | 39.5k |
| Triangles drawn, peak frame | 283k (transmission pre-pass draws the opaque scene twice) | 35k |
| Draw calls, peak | 246 | 86 |

**First scrub after load**
- One 37 ms CPU frame on desktop and one 29 ms frame on mobile; every later frame is under 4 ms.
- Before the pre-compile and texture-upload fix, the first visit to beat 3 cost about 390 ms.

**Mobile run**
- The run includes a 1.6 s gap with no frames at the very bottom of the page. That is the intended pause when no `data-beat` section is on screen.

**Not measured here**
- **Mid-range Android:** the plan's ≥30 fps target. Check it on a real phone with `?stats=1`.
- **Integrated-GPU laptop:** the ≥55 fps target. Check it the same way.
- **Safety net:** adaptive resolution covers both cases.

## Swapping in a Blender glTF or real assets later

`ASSET-PROPOSAL.md` lists free CC0 and CC-BY HDRIs, texture sets and models, with sizes and compression targets. Nothing there is downloaded yet.


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
