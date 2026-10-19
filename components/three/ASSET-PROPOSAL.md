# Part B: free assets for the last step of realism

> **Status (19 Oct 2026):** the user approved the CC0 HDRIs and ambientCG sets below.
> - **In use:** Rooftop Night, Qwantani Dusk 2, Concrete 034 and Metal 009 are compressed and wired in; see README, "Assets and credits", for files, sizes and credits.
> - **Approved but not used:** Painted Metal 004, Sheet Metal 001, Facade 006 and Plastic 010.
> - **Not approved:** the CC-BY models; nothing from them was downloaded.
> The text below is the original proposal.

None of these are in the repo. Each download needs the user's explicit approval.

Sizes are the source files as published (checked 19 Oct 2026). Targets are what would ship after compression.

## Budget
- Plan section 10 allows 3D assets of up to 3 MB on desktop and 1.5 MB on mobile.
- Today the scene ships **0 bytes** of assets: every texture is generated on canvas at start-up.
- Everything below must fit inside that budget.

## 1. Environment lighting (HDRI), Poly Haven, CC0

Poly Haven HDRIs are CC0: commercial use is allowed and no attribution is needed. A credit is appreciated.

| Use | Asset | Source | Source size | Ship as | Target |
|---|---|---|---|---|---|
| Night (dark theme) | Rooftop Night | https://polyhaven.com/a/rooftop_night | 1K `.hdr` 1.62 MB (1K `.exr` 1.30 MB) | 1K, converted to an UltraHDR JPEG (gain map) or KTX2 UASTC-HDR | ≈ 200–600 KB |
| Dusk (light theme) | Qwantani Dusk 2 | https://polyhaven.com/a/qwantani_dusk_2 | 1K `.hdr` 1.58 MB | same | ≈ 200–600 KB |

**Notes**
- These would be used for lighting and reflections only. The visible sky stays our gradient sky dome, so no foreign skyline ever shows.
- The current Lightformer setup would stay as the mobile, low-tier and fallback lighting.
- **Load per theme.** Only the active theme's HDRI loads, lazily, after the scene is ready. The site never ships both.
- **Alternatives:**
  - for the night: Modern Buildings Night (`modern_buildings_night`), Shanghai Bund (`shanghai_bund`)
  - for the dusk: Highway Bridge Sunset (`highway_bridge_sunset`)
- **Tooling:**
  - The UltraHDR route needs `@monogrid/gainmap-js` (an npm install, needs approval).
  - The KTX2 route works with three's built-in KTX2Loader. It needs the Basis transcoder copied to `public/basis/`.

## 2. PBR texture sets, ambientCG, CC0

ambientCG assets are CC0: commercial use is allowed and no attribution is needed.

| Use | Asset | Source | 1K-JPG zip | Keep | Ship as | Target |
|---|---|---|---|---|---|---|
| Slabs, core, podium | Concrete 034 | https://ambientcg.com/a/Concrete034 | 3.66 MB | colour, normal (GL), roughness at 1K | KTX2: ETC1S for colour and roughness, UASTC for normal | ≈ 350 KB |
| Mullions, trays, rack sides | Metal 009 (brushed; Metal 010–012 are alternatives) | https://ambientcg.com/a/Metal009 | 4.77 MB | normal and roughness at 512 px (colour stays a tint) | KTX2 UASTC | ≈ 150 KB |
| Rack doors | Sheet Metal 001 (perforated) | https://ambientcg.com/a/SheetMetal001 | 6.51 MB | opacity, normal at 512 px | KTX2 UASTC | ≈ 150 KB |
| Spandrels, equipment cabinets | Painted Metal 004 | https://ambientcg.com/a/PaintedMetal004 | 8.54 MB | normal and roughness at 512 px | KTX2 UASTC | ≈ 150 KB |
| City block facades | Facade 006 | https://ambientcg.com/a/Facade006 | 2.95 MB | colour and roughness at 1K | KTX2 ETC1S | ≈ 200 KB |
| Device housings | Plastic 010 | https://ambientcg.com/a/Plastic010 | 3.54 MB | normal and roughness at 512 px | KTX2 UASTC | ≈ 120 KB |

- **Desktop total** ≈ 1.1 MB.
- **Mobile:** ship the 512 px variants (≈ 0.5 MB), or keep the canvas textures.
- Glass needs no texture; it is a MeshPhysicalMaterial plus the HDRI.
- **Verification needed.** I picked these from ambientCG's search results and haven't looked at the images. Check each one by eye before approving, especially that Metal 009 is the brushed look we want.
- **Compression:**
  - Standalone textures: `toktx --t2 --encode etc1s` or `--encode uastc --uastc_quality 2 --zcmp 18` (KTX-Software).
  - Textures inside a glTF: `npx @gltf-transform/cli etc1s|uastc`.

## 3. glTF models (racks, cameras)

**Finding:** I found no realistic, PBR-textured rack or camera that is both CC0 and good enough.

- The free CC0 and CC-BY options are mostly low-poly (Poly Pizza, from Google Poly). They would look *less* realistic than the procedural models we have now.
- The realistic free ones are CC-BY (attribution required) or CC-BY-SA.

| Model | Source | Licence | Attribution | Size | Ship as |
|---|---|---|---|---|---|
| Server (single 1U/2U unit, 9.5k tris) | https://sketchfab.com/3d-models/server-edd71ecb45a5447daf4807eabe4c75b5 (by 小明一米七) | CC BY 4.0 | **Yes**: credit the author and Sketchfab, e.g. on a credits page | about 9.5k tris; textures not stated | Draco or Meshopt, KTX2 textures, ≤ 300 KB; instanced into racks |
| Security Camera (bullet, 2.3k tris) | https://sketchfab.com/3d-models/security-camera-d7ce9b46afa8435cb3fcb0c90cc5a49f (by Black Pearl) | CC BY 4.0 | **Yes** | about 2.3k tris | Meshopt, KTX2, ≤ 150 KB |
| Security Camera (7.2k tris, 2K PBR textures) | https://sketchfab.com/3d-models/security-camera-86be6bd7e81948b58d3da67963135742 (by Blenderolokos) | CC BY-SA 4.0 | **Yes**, and ShareAlike | about 7.2k tris, 2K textures | Not recommended: ShareAlike would bind adaptations of the model |
| CCTV Camera (low-poly) | https://poly.pizza/m/79z-QarmPO7 (by Jörg H.) | CC BY 3.0 | **Yes** | small | Not recommended: low-poly look |
| Server rack (low-poly) | https://poly.pizza/m/6ijQclm8jxw (by Jeremy Eyring) | CC BY 3.0 | **Yes** | small | Not recommended: low-poly look |

**Recommendation**
- Keep the procedural racks and devices. They are instanced, cost nothing to download and already match the scene's scale.
- For hero close-ups, the best value is a short paid commission, or the client's own vendor CAD exports (camera and rack manufacturers often publish STEP/GLB files). Licence terms must be checked per vendor.
- If CC-BY models are used, add a credits line on the site, e.g. on the legal or credits page.

## How an approved asset would be wired in
See README, "Swapping in a Blender glTF / real assets":
- `useGLTF(url, true, true)` for Draco and Meshopt
- `useKTX2` for textures
- `<Environment files=… />` for an HDRI, loaded only on the desktop profile and only for the active theme.
