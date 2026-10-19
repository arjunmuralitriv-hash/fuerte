# 3D film: asset credits and licences

Source assets live in `blender/assets/`, which is git-ignored. They were downloaded on 19 Oct 2026 with the client's approval (`Fuerte-3D-Asset-List.md`). Only rendered frames ship on the website.

## CC-BY 4.0: attribution required

These credits must appear on the website. Planned location: the Legal information page, under "3D credits".

| Model | Author | Source | Used for |
|---|---|---|---|
| Server rack | Crysis007-94 | https://sketchfab.com/3d-models/5320622f6c0741b7aed399bfa2965dc4 | Not used |
| Server Racking System | mcpanayides | https://sketchfab.com/3d-models/6fe2cacf836b4aed96c650b286db5486 | Data hall racks (beat 2) |
| Nathan Animated 003 - Walking 3D Man | renderpeople | https://sketchfab.com/3d-models/143a2b1ea5eb4385ae90a73657aca3bc | People in the offices, data hall and plaza |
| Mei Posed 001 - Female Walking Business Model | renderpeople | https://sketchfab.com/3d-models/07f308b81bc045c8917104a72ce2ffe4 | People in the offices, data hall and plaza |
| Future Car | dennish2010 | https://sketchfab.com/3d-models/hliAt7xc6YU2XjXh5G4lzmQwFmR | Not used |
| Cyber Vehicle | whisper.alt | https://sketchfab.com/3d-models/27674d0e2429461fa5604d598bf97ae5 | Not used |
| Bionic Architecture | vishchun | https://sketchfab.com/3d-models/6a40bae62e614e0990742871eed788f6 | Not used |

Licence: Creative Commons Attribution 4.0, https://creativecommons.org/licenses/by/4.0/. All are downloaded as GLB (2K or 1K textures) to `assets/sketchfab/<name>/`.

On 19 Oct 2026 the client asked for the real Doha skyline with a neon look, not futuristic vehicles or invented towers. The "Not used" models need no credit unless they come back into a shot.

Not downloaded: HoloBoard and Hologram Console (toomanydemons) offered no download formats. Holographic displays are built as Blender shaders instead.

## OpenStreetMap: attribution required (ODbL 1.0)

The West Bay city is built from OpenStreetMap building footprints, heights and coastline: `assets/osm/westbay.json`, `coast.json` and `lusail.json` (Lusail and The Pearl on the horizon), fetched from the Overpass API on 19 Oct 2026 and prepared by `scripts/prepare_osm.py`. Credit: "Map data © OpenStreetMap contributors", linking to https://www.openstreetmap.org/copyright, on the same "3D credits" line. ODbL applies to the data itself. The rendered frames are a "produced work", so the website only needs the credit.

Doha Tower has no height in OSM, so its published height (238 m) is set in `prepare_osm.py`.

## CC0: public domain, no attribution required (recorded for provenance)

**Poly Haven** (https://polyhaven.com):
- **HDRIs, 4K:** qwantani_dusk_2, the_sky_is_on_fire, kloppenheim_02, shanghai_bund
- **Models, 2K .blend:**
  - metal_office_desk, modern_arm_chair_01, classic_laptop, television_02, modern_coffee_table_01
  - potted_plant_01, potted_plant_02, potted_plant_04
  - modern_ceiling_lamp_01, mounted_fluorescent_lights, security_camera_01, security_camera_02
  - street_lamp_01, modular_street_seating, planter_box_01, exterior_aircon_unit, circuit_board

**ambientCG** (https://ambientcg.com), 2K-JPG material sets:
- Facade001, Facade005, Facade006, Facade009, Facade013, Facade017, Facade018A
- MetalPlates017A, MetalPlates006, Concrete046
- PavingStones146, Asphalt033, Road007
- Marble021, Marble016, Tiles107, Carpet012, MetalWalkway010, Ground093C

To re-fetch the CC0 set: `python -I blender/scripts/fetch_cc0_assets.py blender/assets`.
