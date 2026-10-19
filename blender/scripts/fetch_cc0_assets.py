"""Downloads the approved CC0 assets (Fuerte-3D-Asset-List.md) into ASSETS/{polyhaven,ambientcg}/<id>/.

Usage: python fetch_cc0_assets.py <assets-dir>
Files are data only: nothing downloaded is executed, and zip entries are kept inside their folder.
Re-running skips files that are already complete.
"""
import io
import json
import pathlib
import sys
import urllib.request
import zipfile

UA = {"User-Agent": "fuerte-film-assets"}
HDRIS = ["qwantani_dusk_2", "the_sky_is_on_fire", "kloppenheim_02", "shanghai_bund"]
MODELS = [
    "metal_office_desk", "modern_arm_chair_01", "classic_laptop", "television_02", "modern_coffee_table_01",
    "potted_plant_01", "potted_plant_02", "potted_plant_04", "modern_ceiling_lamp_01", "mounted_fluorescent_lights",
    "security_camera_01", "security_camera_02", "street_lamp_01", "modular_street_seating", "planter_box_01",
    "exterior_aircon_unit", "circuit_board",
]
MATERIALS = [
    "Facade001", "Facade005", "Facade006", "Facade009", "Facade013", "Facade017", "Facade018A", "MetalPlates017A",
    "MetalPlates006", "Concrete046", "PavingStones146", "Asphalt033", "Road007", "Marble021", "Marble016", "Tiles107",
    "Carpet012", "MetalWalkway010", "Ground093C",
]


def fetch(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=300).read()


def save(url, path, size=None):
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and (size is None or path.stat().st_size == size):
        return
    path.write_bytes(fetch(url))


def inside(root, rel):
    target = (root / rel).resolve()
    if root.resolve() not in target.parents and target != root.resolve():
        raise ValueError(f"unsafe path: {rel}")
    return target


root = pathlib.Path(sys.argv[1])
total = 0
for h in HDRIS:
    f = json.loads(fetch(f"https://api.polyhaven.com/files/{h}"))["hdri"]["4k"]["hdr"]
    save(f["url"], root / "polyhaven" / "hdri" / f"{h}_4k.hdr", f["size"])
    total += f["size"]
    print("hdri", h, flush=True)
for m in MODELS:
    blend = json.loads(fetch(f"https://api.polyhaven.com/files/{m}"))["blend"]
    res = "2k" if "2k" in blend else sorted(blend)[0]
    entry = blend[res]["blend"]
    folder = root / "polyhaven" / "models" / m
    save(entry["url"], folder / pathlib.PurePosixPath(entry["url"]).name, entry["size"])
    for rel, inc in entry.get("include", {}).items():
        save(inc["url"], inside(folder, rel), inc["size"])
        total += inc["size"]
    total += entry["size"]
    print("model", m, res, flush=True)
for mat in MATERIALS:
    data = json.loads(fetch(f"https://ambientcg.com/api/v2/full_json?id={mat}&include=downloadData"))["foundAssets"][0]
    downloads = [d for c in data["downloadFolders"]["default"]["downloadFiletypeCategories"].values() for d in c["downloads"]]
    d = next(x for x in downloads if x["attribute"] == "2K-JPG")
    folder = root / "ambientcg" / mat
    if not any(folder.glob("*.jpg")):
        with zipfile.ZipFile(io.BytesIO(fetch(d["downloadLink"]))) as z:
            for name in z.namelist():
                if name.endswith("/"):
                    continue
                inside(folder, name).parent.mkdir(parents=True, exist_ok=True)
                inside(folder, name).write_bytes(z.read(name))
    total += d["size"]
    print("material", mat, flush=True)
print(f"DONE {total / 1e6:.0f} MB")
