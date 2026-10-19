"""Turn the OpenStreetMap extracts of West Bay (assets/osm/*.json, Overpass "out geom") into Blender-ready data.

Run with a Python that has Pillow:  python -P blender/scripts/prepare_osm.py blender/assets/osm

Writes, in local metres (X east, Y north, origin at Doha Tower):
  city.json      {"buildings": [{id, name, h, pts}], "coast": [[x, y]...]}; heights from OSM height/levels, estimated when missing
  land_mask.png  white = land, black = sea, MASK_M metres per pixel, centred on the origin

Data (c) OpenStreetMap contributors, ODbL 1.0.
"""
import json
import math
import pathlib
import random
import sys

from PIL import Image, ImageDraw

DIR = pathlib.Path(sys.argv[1])
LAT0, LON0 = 25.3197, 51.5297  # Doha Tower (Burj Doha)
KX, KY = 111320 * math.cos(math.radians(LAT0)), 110540
HALF, MASK_M = 3000, 2.0  # mask covers +-3 km at 2 m per pixel
SEA_SEEDS = ((0, -1500), (2400, 1500), (2600, -600), (1200, 2800))  # Doha Bay, the Gulf north and east of West Bay

# Footprints OSM leaves without a height; values from the towers' published heights.
KNOWN = {152651354: ("Doha Tower", 238.0)}
rng = random.Random(11)


def local(p):
    return (round((p["lon"] - LON0) * KX, 2), round((p["lat"] - LAT0) * KY, 2))


def height(tags):
    for key, k in (("height", 1.0), ("building:height", 1.0)):
        try:
            return float(tags[key].split()[0].rstrip("m")) * k
        except (KeyError, ValueError):
            pass
    try:
        return float(tags["building:levels"]) * 3.6 + 2
    except (KeyError, ValueError):
        pass
    kind = tags.get("building", "yes")
    if kind in ("house", "villa", "residential", "detached", "garage", "roof", "shed", "kiosk"):
        return rng.uniform(6, 11)
    return rng.uniform(9, 24)


def main():
    els = json.loads((DIR / "westbay.json").read_text(encoding="utf8"))["elements"]
    out = []
    for e in els:
        if e["type"] != "way" or len(e.get("geometry", ())) < 4:
            continue
        tags = e.get("tags", {})
        name, h = KNOWN.get(e["id"], (tags.get("name:en") or tags.get("name", ""), None))
        pts = [local(p) for p in e["geometry"]]
        if pts[0] == pts[-1]:
            pts.pop()
        # Counter-clockwise, so extruded walls face outward.
        area = sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(pts, pts[1:] + pts[:1]))
        if area < 0:
            pts.reverse()
        out.append({"id": e["id"], "name": name, "h": round(h or height(tags), 1), "pts": pts})
    coast = [[local(p) for p in w["geometry"]] for w in json.loads((DIR / "coast.json").read_text(encoding="utf8"))["elements"]]
    (DIR / "city.json").write_text(json.dumps({"buildings": out, "coast": coast}), encoding="utf8")

    # Land mask: draw every coastline way, then flood the sea from seeds; whatever the sea cannot reach is land.
    n = int(2 * HALF / MASK_M)
    img = Image.new("L", (n, n), 255)
    draw = ImageDraw.Draw(img)
    to_px = lambda x, y: ((x + HALF) / MASK_M, (HALF - y) / MASK_M)
    for line in coast:
        draw.line([to_px(*p) for p in line], fill=128, width=3)
    for sx, sy in SEA_SEEDS:
        ImageDraw.floodfill(img, tuple(int(v) for v in to_px(sx, sy)), 0)
    img = img.point(lambda v: 0 if v == 0 else 255)
    img.save(DIR / "land_mask.png")
    print(len(out), "buildings;", sum(b["h"] >= 60 for b in out), "over 60 m")


if __name__ == "__main__":
    main()
