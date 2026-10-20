# Fuerte home page: cinematic film plan

The home page's 3D story is being rebuilt as a **pre-rendered film** made in Blender: photorealistic, futuristic Doha, buildings full of life. Scrolling plays the film forwards and backwards. All text stays real HTML on top.

## Why pre-rendered

The current scene is generated in code, which caps it at a "3D clipart" look. Rendering in Blender gives:
- film-quality lighting
- dense, lit interiors
- reflections, atmosphere and depth of field

It also looks identical on every phone, with no GPU limits.

## The shots (one per scroll beat)

| Beat | Shot | What we see | Length |
|---|---|---|---|
| 0 | **Arrival** | Dusk over a futuristic West Bay. The camera glides low over the water toward Fuerte's tower: glass facade, every floor lit and occupied (offices, people, screens), the red diagonal band glowing. | ~4 s |
| 1 | **The spine** | The facade turns translucent in a holographic scan, revealing the fibre riser. Light pulses race up the core and branch out along each floor. | ~3 s |
| 2 | **The data hall** | The camera dives through a floor slab into a server hall: racks with live LEDs, cold-aisle containment, engineers at work, cooling haze. | ~3 s |
| 3 | **Every device** | Back out at the lobby and plaza: CCTV, access gates and screens pulse as one network, with sight-lines drawn as light. | ~3 s |
| 4 | **The shield** | A hexagonal energy shield blooms over the tower as a wave, deflecting stylised threat streaks. | ~3 s |
| 5 | **The city** | Aerial pull-back over a living futuristic Doha (Corniche, West Bay, Lusail on the horizon) with network arcs linking buildings. | ~4 s |
| 6 | **Settle** | The tower at night, calm, the red band glowing. The CTA sits over a clean sky area. | ~2 s |

- **Framing:** each shot keeps its subject in the upper 60% of the frame on mobile, and toward the end side on desktop, so it never fights the text.
- **Arabic pages:** the same film plays; on desktop the text simply sits on the other side.

## Assets

**Needed:**
- a futuristic city kit (towers, streets, vehicles, props)
- detailed building facades with **interiors** (interior-mapping shaders, so every window shows a lit room with depth)
- server-room and ELV props
- people (crowds and silhouettes)
- an HDRI sky

**Two routes (client decision):**
- **A. Licensed commercial kit:** for example a KitBash3D or CGTrader futuristic city pack with a commercial web licence, typically USD 100–400. Highest quality and fastest.
- **B. Free assets only:**
  - CC0 from Poly Haven and ambientCG
  - CC-BY from Sketchfab, with credits
  - Blender Geometry Nodes for the city and interior-mapping shaders
  - Cost: no money, more build time, and quality depends on what's available.

**Doha landmarks** (Tornado Tower, Burj Doha, Aspire Tower) appear as stylised silhouettes only. We never reproduce trademarked designs in detail.

## Pipeline

1. **Build:** Blender 4.x, driven by Python scripts (`blender --background --python`), so every scene is reproducible and versioned in `blender/`.
2. **Render:** Cycles on the RTX 4050 (OptiX, denoiser).
   - Desktop: 1920×1080, 16:9.
   - Mobile: a separate 1080×1920 portrait render, framed for phones.
   - About 24 fps of scroll frames; roughly 450–500 frames per format.
3. **Encode:**
   - Primary: AVIF image sequence, about 15–30 KB per frame on mobile and 40–70 KB on desktop.
   - Alternative: an H.264/AV1 video with dense keyframes for scrubbing.
   - Frames load progressively: shot by shot, nearest first.
4. **Web:**
   - A canvas draws the frame that matches scroll position.
   - Poster image first; it is the LCP-safe fallback.
   - Reduced motion and Save-Data get one still per beat.

**Weight:** about 5–10 MB on desktop and 3–5 MB on mobile, loaded progressively after the page is interactive. This exceeds the old 3 MB "3D assets" budget, so it needs sign-off. Initial page JS stays at about 145 kB.

## Steps

1. Install Blender (client side), then confirm the GPU render works.
2. Choose the asset route (A or B); purchase if A.
3. Block out the shots, render low-resolution previews, and get client approval on camera and framing.
4. Final look, then full render, then encode.
5. Wire the frames into the scroll-film player.
6. QA on real phones.
