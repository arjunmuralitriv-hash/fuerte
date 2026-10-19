"""Beat 0 "Arrival": the real West Bay skyline at blue hour with neon accents, and Fuerte's tower with lit, occupied
floors on the waterfront (Fuerte-3D-Film-Plan.md).

Run (assets dir, output .blend, optional "--render <dir> <w> <h> <samples> <frames>"):
  blender --background --factory-startup --disable-autoexec --python build_arrival.py -- <assets> <out.blend> [--render ...]

The city comes from OpenStreetMap (assets/osm, prepared by prepare_osm.py). Everything else is generated here, so the
shot is reproducible. Units are metres, Z up; Fuerte's tower stands at the origin on a free waterfront plot and the
camera glides in over Doha Bay from -Y.
"""
import json
import math
import pathlib
import random
import sys

import bmesh
import bpy
from mathutils import Euler, Matrix, Vector

ARGS = sys.argv[sys.argv.index("--") + 1 :]
ASSETS = pathlib.Path(ARGS[0])
OUT = pathlib.Path(ARGS[1])
RNG = random.Random(7)
FPS, FRAMES = 24, 96

# Fuerte tower
FLOORS, FLOOR_H = 66, 4.2
HALF, CORNER = 22.0, 9.0  # half-width of the rounded-square plate, corner radius
TAPER, TWIST = 0.84, math.radians(24)  # top scale, total twist base to roof
CORE = 8.5  # half-width of the service core
BRAND_RED = (0.74, 0.09, 0.016)

# City (prepare_osm.py coordinates: metres from Doha Tower, X east, Y north)
OSM = ASSETS / "osm"
SITE = Vector((-400, -460))  # free waterfront plot in West Bay, sea to the south; becomes the scene origin
MASK_HALF = 3000  # land_mask.png covers +-3 km around Doha Tower
SPECIAL = {152651354: "doha_tower", 152653058: "tornado"}
NEON = ((0.12, 0.72, 1.0), (0.55, 0.32, 1.0), (1.0, 0.82, 0.6), (0.95, 0.22, 0.62))  # cyan, violet, warm white, magenta


# --------------------------------------------------------------------------------------------- scene and helpers
def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    prefs = bpy.context.preferences.addons["cycles"].preferences
    for kind in ("OPTIX", "CUDA"):
        try:
            prefs.compute_device_type = kind
            prefs.refresh_devices()
            if any(d.type == kind for d in prefs.devices):
                for d in prefs.devices:
                    d.use = d.type == kind
                scene.cycles.device = "GPU"
                break
        except TypeError:
            continue
    c = scene.cycles
    c.samples, c.use_denoising, c.denoiser = 48, True, "OPTIX"
    c.max_bounces, c.diffuse_bounces, c.glossy_bounces, c.transmission_bounces, c.transparent_max_bounces = 8, 3, 4, 6, 24
    c.caustics_reflective = c.caustics_refractive = False
    c.sample_clamp_indirect = 8.0
    c.use_light_tree = True
    scene.render.fps = FPS
    scene.frame_start, scene.frame_end = 1, FRAMES
    scene.view_settings.view_transform = "AgX"
    for look in ("AgX - Medium High Contrast", "Medium High Contrast", "AgX - Punchy", "Punchy"):
        try:
            scene.view_settings.look = look
            break
        except TypeError:
            continue
    return scene


HIDDEN = []  # instancing sources: excluded from the view layer at the end of build() (objects must stay selectable until then)


def collection(name, hide=False):
    col = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(col)
    if hide:
        HIDDEN.append(name)
    return col


def obj_from_bmesh(name, bm, col, mats=()):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for m in mats:
        me.materials.append(m)
    ob = bpy.data.objects.new(name, me)
    col.objects.link(ob)
    return ob


def node(tree, kind, loc=(0, 0), **props):
    n = tree.nodes.new(kind)
    n.location = loc
    for k, v in props.items():
        setattr(n, k, v)
    return n


def principled(name, base=(0.5, 0.5, 0.5), rough=0.5, metal=0.0, emit=None, strength=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*base, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if emit:
        b.inputs["Emission Color"].default_value = (*emit, 1)
        b.inputs["Emission Strength"].default_value = strength
    return m


def emission(name, color, strength):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    e = node(nt, "ShaderNodeEmission")
    e.inputs["Color"].default_value = (*color, 1)
    e.inputs["Strength"].default_value = strength
    out = node(nt, "ShaderNodeOutputMaterial", (200, 0))
    nt.links.new(e.outputs[0], out.inputs[0])
    return m


def image(path, data=False):
    img = bpy.data.images.load(str(path), check_existing=True)
    if data:
        img.colorspace_settings.name = "Non-Color"
    return img


def pbr(name, folder, metres=4.0, emission_strength=0.0, tint=None):
    """ambientCG set, box-projected in object space so any generated shape gets world-scale texels (metres per tile)."""
    d = ASSETS / "ambientcg" / folder
    files = {p.stem.rsplit("_", 1)[-1]: p for p in d.glob("*_2K-JPG_*.jpg")}
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    coord = node(nt, "ShaderNodeTexCoord", (-1200, 0))
    mapping = node(nt, "ShaderNodeMapping", (-1000, 0))
    mapping.inputs["Scale"].default_value = (1 / metres,) * 3
    nt.links.new(coord.outputs["Object"], mapping.inputs["Vector"])

    def tex(key, y, data=False):
        t = node(nt, "ShaderNodeTexImage", (-700, y), projection="BOX", projection_blend=0.15)
        t.image = image(files[key], data)
        nt.links.new(mapping.outputs[0], t.inputs["Vector"])
        return t

    color = tex("Color", 300)
    if tint:
        mix = node(nt, "ShaderNodeMix", (-350, 300), data_type="RGBA", blend_type="MULTIPLY")
        mix.inputs["Factor"].default_value = 1
        mix.inputs["B"].default_value = (*tint, 1)
        nt.links.new(color.outputs["Color"], mix.inputs["A"])
        nt.links.new(mix.outputs["Result"], b.inputs["Base Color"])
    else:
        nt.links.new(color.outputs["Color"], b.inputs["Base Color"])
    if "Roughness" in files:
        nt.links.new(tex("Roughness", 0, True).outputs["Color"], b.inputs["Roughness"])
    if "Metalness" in files:
        nt.links.new(tex("Metalness", -300, True).outputs["Color"], b.inputs["Metallic"])
    if "NormalGL" in files:
        nm = node(nt, "ShaderNodeNormalMap", (-350, -600))
        nm.inputs["Strength"].default_value = 0.6
        nt.links.new(tex("NormalGL", -600, True).outputs["Color"], nm.inputs["Color"])
        nt.links.new(nm.outputs[0], b.inputs["Normal"])
    if "Emission" in files and emission_strength:
        nt.links.new(tex("Emission", -900).outputs["Color"], b.inputs["Emission Color"])
        b.inputs["Emission Strength"].default_value = emission_strength
    return m


def glass(name, tint=(0.62, 0.72, 0.78), reflect=1.0):
    """Architectural glass: see-through head-on, mirror-like at grazing angles (Fresnel), no refraction offset."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = node(nt, "ShaderNodeOutputMaterial", (600, 0))
    fres = node(nt, "ShaderNodeLayerWeight", (-400, 200))
    fres.inputs["Blend"].default_value = 0.35
    trans = node(nt, "ShaderNodeBsdfTransparent", (-200, 0))
    trans.inputs["Color"].default_value = (*tint, 1)
    gloss = node(nt, "ShaderNodeBsdfGlossy", (-200, -150))
    gloss.inputs["Roughness"].default_value = 0.02
    gloss.inputs["Color"].default_value = (reflect, reflect, reflect, 1)
    mix = node(nt, "ShaderNodeMixShader", (200, 0))
    mr = node(nt, "ShaderNodeMath", (0, 200), operation="MAXIMUM")
    mr.inputs[1].default_value = 0.08  # a little reflection even head-on
    nt.links.new(fres.outputs["Fresnel"], mr.inputs[0])
    nt.links.new(mr.outputs[0], mix.inputs[0])
    nt.links.new(trans.outputs[0], mix.inputs[1])
    nt.links.new(gloss.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs[0])
    return m


def append_objects(blend, col):
    with bpy.data.libraries.load(str(blend)) as (src, dst):
        dst.objects = src.objects
    objs = [o for o in dst.objects if o and o.type == "MESH"]
    for o in objs:
        col.objects.link(o)
    return objs


def join(objs, name):
    """Join appended parts into one object at the origin (instancing sources)."""
    for o in bpy.context.view_layer.objects.selected:
        o.select_set(False)
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1:
        bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    ob.name = name
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    ob.parent = None
    return ob


def bounds(ob):
    pts = [ob.matrix_world @ Vector(c) for c in ob.bound_box]
    return Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts))), Vector(
        (max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts))
    )


def instancer(name, points, rots, source_col, col, scale=1.0):
    """Points mesh + Geometry Nodes 'Instance on Points' picking a random child of source_col per point."""
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(p) for p in points], [], [])
    attr = me.attributes.new("rot", "FLOAT", "POINT")
    attr.data.foreach_set("value", rots)
    ob = bpy.data.objects.new(name, me)
    col.objects.link(ob)
    tree = bpy.data.node_groups.new(name + "_gn", "GeometryNodeTree")
    tree.interface.new_socket("Geometry", in_out="INPUT", socket_type="NodeSocketGeometry")
    tree.interface.new_socket("Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")
    gi = node(tree, "NodeGroupInput", (-800, 0))
    go = node(tree, "NodeGroupOutput", (400, 0))
    ci = node(tree, "GeometryNodeCollectionInfo", (-500, -200))
    ci.inputs["Collection"].default_value = source_col
    ci.inputs["Separate Children"].default_value = True
    ci.inputs["Reset Children"].default_value = True
    rnd = node(tree, "FunctionNodeRandomValue", (-500, -450), data_type="INT")
    rnd.inputs["Min"].default_value = 0
    rnd.inputs["Max"].default_value = max(len(source_col.objects), len(source_col.children)) - 1
    rnd.inputs["Seed"].default_value = RNG.randrange(1000)
    na = node(tree, "GeometryNodeInputNamedAttribute", (-700, -650), data_type="FLOAT")
    na.inputs["Name"].default_value = "rot"
    cx = node(tree, "ShaderNodeCombineXYZ", (-500, -650))
    tree.links.new(na.outputs["Attribute"], cx.inputs["Z"])
    iop = node(tree, "GeometryNodeInstanceOnPoints", (0, 0))
    tree.links.new(gi.outputs[0], iop.inputs["Points"])
    tree.links.new(ci.outputs[0], iop.inputs["Instance"])
    iop.inputs["Pick Instance"].default_value = True
    tree.links.new(rnd.outputs["Value"], iop.inputs["Instance Index"])
    tree.links.new(cx.outputs[0], iop.inputs["Rotation"])
    iop.inputs["Scale"].default_value = (scale, scale, scale)
    tree.links.new(iop.outputs[0], go.inputs[0])
    mod = ob.modifiers.new("instances", "NODES")
    mod.node_group = tree
    return ob


# --------------------------------------------------------------------------------------------- world, ground, water
def world():
    w = bpy.data.worlds.new("dusk")
    bpy.context.scene.world = w
    w.use_nodes = True
    nt = w.node_tree
    bg = nt.nodes["Background"]
    env = node(nt, "ShaderNodeTexEnvironment", (-400, 0))
    env.image = image(ASSETS / "polyhaven/hdri/qwantani_dusk_2_4k.hdr")
    mapping = node(nt, "ShaderNodeMapping", (-600, 0))
    mapping.inputs["Rotation"].default_value = (0, 0, math.radians(200))  # low sun behind-left of the tower: warm rim
    coord = node(nt, "ShaderNodeTexCoord", (-800, 0))
    nt.links.new(coord.outputs["Generated"], mapping.inputs["Vector"])
    nt.links.new(mapping.outputs[0], env.inputs["Vector"])
    nt.links.new(env.outputs[0], bg.inputs["Color"])
    bg.inputs["Strength"].default_value = 0.14  # late dusk: the sky still glows but the city lights carry the frame


def land_and_sea(col):
    """Land plane cut out by the OSM land mask (sea shows through to the water plane 1.2 m below)."""
    land = pbr("land", "Asphalt033", metres=6, tint=(0.5, 0.5, 0.52))
    nt = land.node_tree
    b = nt.nodes["Principled BSDF"]
    uv = node(nt, "ShaderNodeTexCoord", (-1200, 600))
    mask = node(nt, "ShaderNodeTexImage", (-1000, 600), extension="CLIP")
    mask.image = image(OSM / "land_mask.png", data=True)
    nt.links.new(uv.outputs["UV"], mask.inputs["Vector"])
    gt = node(nt, "ShaderNodeMath", (-700, 600), operation="GREATER_THAN")
    gt.inputs[1].default_value = 0.5
    nt.links.new(mask.outputs["Color"], gt.inputs[0])
    out = nt.nodes["Material Output"]
    cut = node(nt, "ShaderNodeMixShader", (300, 300))
    hole = node(nt, "ShaderNodeBsdfTransparent", (0, 450))
    nt.links.new(gt.outputs[0], cut.inputs[0])
    nt.links.new(hole.outputs[0], cut.inputs[1])
    nt.links.new(b.outputs[0], cut.inputs[2])
    nt.links.new(cut.outputs[0], out.inputs["Surface"])
    bm = bmesh.new()
    bm.loops.layers.uv.new("UVMap")
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=MASK_HALF, calc_uvs=True)
    ground = obj_from_bmesh("land", bm, col, [land])
    ground.location = (-SITE.x, -SITE.y, 0)

    water = bpy.data.materials.new("gulf")
    water.use_nodes = True
    nt = water.node_tree
    b = nt.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (0.004, 0.018, 0.024, 1)
    b.inputs["Roughness"].default_value = 0.06
    b.inputs["IOR"].default_value = 1.33
    b.inputs["Specular IOR Level"].default_value = 0.6
    coord = node(nt, "ShaderNodeTexCoord", (-900, -300))
    n1 = node(nt, "ShaderNodeTexNoise", (-700, -300))
    n1.inputs["Scale"].default_value = 0.35
    n1.inputs["Detail"].default_value = 8
    wave = node(nt, "ShaderNodeTexWave", (-700, -550))
    wave.inputs["Scale"].default_value = 0.12
    wave.inputs["Distortion"].default_value = 6
    add = node(nt, "ShaderNodeMath", (-500, -400), operation="ADD")
    bump = node(nt, "ShaderNodeBump", (-300, -400))
    bump.inputs["Strength"].default_value = 0.3
    nt.links.new(coord.outputs["Object"], n1.inputs["Vector"])
    nt.links.new(coord.outputs["Object"], wave.inputs["Vector"])
    nt.links.new(n1.outputs["Fac"], add.inputs[0])
    nt.links.new(wave.outputs["Fac"], add.inputs[1])
    nt.links.new(add.outputs[0], bump.inputs["Height"])
    nt.links.new(bump.outputs[0], b.inputs["Normal"])
    sea = bmesh.new()
    bmesh.ops.create_grid(sea, x_segments=1, y_segments=1, size=1)
    sea_ob = obj_from_bmesh("gulf", sea, col, [water])
    sea_ob.scale = (9000, 9000, 1)
    sea_ob.location = (0, 0, -1.2)


# --------------------------------------------------------------------------------------------- Fuerte tower
def plate(scale=1.0, n=72):
    """Rounded-square outline (counter-clockwise), half-width HALF*scale."""
    h, r = HALF * scale, CORNER * scale
    pts = []
    for q, (cx, cy) in enumerate(((h - r, h - r), (-(h - r), h - r), (-(h - r), -(h - r)), (h - r, -(h - r)))):
        for i in range(n // 4):
            a = math.pi / 2 * q + math.pi / 2 * i / (n // 4 - 1)
            pts.append(Vector((cx + r * math.cos(a), cy + r * math.sin(a), 0)))
    return pts


def level(i):
    """Scale and twist at floor i (0..FLOORS)."""
    t = i / FLOORS
    s = 1 - (1 - TAPER) * t**1.4
    return s, TWIST * t


def ring(i, inset=0.0, z_off=0.0):
    s, tw = level(i)
    rot = Matrix.Rotation(tw, 3, "Z")
    pts = plate(s)
    z = i * FLOOR_H + z_off
    out = []
    for p in pts:
        q = rot @ p
        if inset:
            q = q - q.normalized() * inset
        out.append(Vector((q.x, q.y, z)))
    return out


def fuerte_tower(col, furniture, people):
    mats = {
        "glass": glass("fuerte_glass", tint=(0.66, 0.75, 0.8), reflect=0.9),
        "spandrel": principled("spandrel", (0.03, 0.035, 0.04), rough=0.25, metal=1.0),
        "mullion": principled("mullion", (0.55, 0.57, 0.6), rough=0.22, metal=1.0),
        "slab": pbr("slab", "Concrete046", metres=4),
        "floor": pbr("carpet", "Carpet012", metres=2, tint=(0.55, 0.55, 0.6)),
        "core": principled("core", (0.62, 0.6, 0.57), rough=0.6),
        "panel_warm": emission("panel_warm", (1.0, 0.86, 0.68), 9.0),
        "panel_cool": emission("panel_cool", (0.88, 0.94, 1.0), 10.0),
        "panel_dim": emission("panel_dim", (1.0, 0.8, 0.6), 1.6),
        "red": principled("fuerte_red", BRAND_RED, rough=0.3, metal=0.6, emit=(1.0, 0.12, 0.03), strength=6.0),
        "beacon": emission("beacon", (1.0, 0.1, 0.05), 80.0),
    }
    n = len(plate())

    # Glass skin: one band per floor between consecutive rings.
    bm = bmesh.new()
    rings = [[bm.verts.new(p) for p in ring(i)] for i in range(FLOORS + 1)]
    for i in range(FLOORS):
        for k in range(n):
            bm.faces.new((rings[i][k], rings[i][(k + 1) % n], rings[i + 1][(k + 1) % n], rings[i + 1][k]))
    obj_from_bmesh("fuerte_skin", bm, col, [mats["glass"]])

    # Spandrel band at each slab edge, vertical mullions every 3rd outline point, floor slabs, carpet, core.
    bm, slab, floor = bmesh.new(), bmesh.new(), bmesh.new()

    def box(bm_, a, b, depth, height, z):
        d = (b - a)
        nrm = Vector((d.y, -d.x, 0)).normalized() * depth
        v = [bm_.verts.new(p) for p in (a, b, b + nrm, a + nrm)]
        v += [bm_.verts.new(p + Vector((0, 0, height))) for p in (a, b, b + nrm, a + nrm)]
        for f in ((0, 1, 2, 3), (4, 7, 6, 5), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)):
            bm_.faces.new([v[j] for j in f])

    for i in range(FLOORS + 1):
        outer = ring(i, inset=-0.25, z_off=-0.35)
        for k in range(n):
            box(bm, outer[k], outer[(k + 1) % n], 0.35, 0.8, outer[k].z)
        if i < FLOORS:
            # Vertical mullion fins every 3rd outline point: a 0.24 x 0.55 m section from this floor to the next.
            lower, upper = ring(i, inset=-0.3), ring(i + 1, inset=-0.3)
            for k in range(0, n, 3):
                a, b = lower[k], upper[k]
                out_dir = a.xy.normalized().to_3d() * 0.55
                side = Vector((-a.y, a.x, 0)).normalized() * 0.12
                q = [bm.verts.new(a + o) for o in (-side, side, side + out_dir, -side + out_dir)]
                r_ = [bm.verts.new(b + o) for o in (-side, side, side + out_dir, -side + out_dir)]
                bm.faces.new(q)
                bm.faces.new(list(reversed(r_)))
                for j in range(4):
                    bm.faces.new((q[j], q[(j + 1) % 4], r_[(j + 1) % 4], r_[j]))
            # Slab: inset outline, 0.35 m thick; carpet on top.
            inner = ring(i, inset=0.15)
            bot = [slab.verts.new(p + Vector((0, 0, -0.35))) for p in inner]
            top = [slab.verts.new(p) for p in inner]
            slab.faces.new(list(reversed(bot)))
            slab.faces.new(top)
            for k in range(n):
                slab.faces.new((bot[k], bot[(k + 1) % n], top[(k + 1) % n], top[k]))
            floor.faces.new([floor.verts.new(p + Vector((0, 0, 0.02))) for p in ring(i, inset=0.4)])
    obj_from_bmesh("fuerte_frame", bm, col, [mats["spandrel"]])
    obj_from_bmesh("fuerte_slabs", slab, col, [mats["slab"]])
    obj_from_bmesh("fuerte_carpet", floor, col, [mats["floor"]])

    core = bmesh.new()
    bmesh.ops.create_cube(core, size=1)
    core_ob = obj_from_bmesh("fuerte_core", core, col, [mats["core"]])
    core_ob.scale = (CORE * 2, CORE * 2, FLOORS * FLOOR_H)
    core_ob.location = (0, 0, FLOORS * FLOOR_H / 2)

    # Ceiling light panels: a grid under every slab, outside the core; each floor gets a mood (warm, cool, or dim).
    pan = bmesh.new()
    desks, desk_rot, folk, folk_rot = [], [], [], []
    for i in range(FLOORS):
        s, tw = level(i)
        rot = Matrix.Rotation(tw, 3, "Z")
        mood = RNG.choices((1, 2, 3), weights=(5, 4, 1))[0]  # 1 warm, 2 cool, 3 dim
        z_ceiling = (i + 1) * FLOOR_H - 0.4
        reach = HALF * s - 2.2
        for gx in range(-8, 9):
            for gy in range(-8, 9):
                p = Vector((gx * 2.8, gy * 2.8, 0))
                if max(abs(p.x), abs(p.y)) < CORE + 1.5 or max(abs(p.x), abs(p.y)) > reach:
                    continue
                c = rot @ p
                f = pan.faces.new([pan.verts.new((c.x + dx, c.y + dy, z_ceiling)) for dx, dy in ((-0.6, -0.3), (-0.6, 0.3), (0.6, 0.3), (0.6, -0.3))])
                f.material_index = mood - 1  # wound so the panel faces down
        if i < 2:
            continue  # lobby floors stay open
        # Workstations along the glass and in a second row; people near the windows and in aisles.
        for row, inset in ((0, 2.6), (1, 6.0)):
            pts = ring(i, inset=inset)
            for k in range(0, len(pts), 2 if row == 0 else 3):
                if RNG.random() < 0.12:
                    continue
                p = pts[k]
                desks.append((p.x, p.y, i * FLOOR_H + 0.02))
                desk_rot.append(math.atan2(p.y, p.x) + math.pi / 2 + RNG.uniform(-0.12, 0.12))
        for _ in range(RNG.randint(4, 11) if mood != 3 else RNG.randint(0, 2)):
            p = RNG.choice(ring(i, inset=RNG.uniform(1.4, 4.0)))
            folk.append((p.x, p.y, i * FLOOR_H + 0.02))
            folk_rot.append(RNG.uniform(0, math.tau))
    panels = obj_from_bmesh("fuerte_panels", pan, col, [mats["panel_warm"], mats["panel_cool"], mats["panel_dim"]])
    panels.visible_shadow = False
    instancer("fuerte_workstations", desks, desk_rot, furniture, col)
    instancer("fuerte_people", folk, folk_rot, people, col)

    # Brand band: a red helix ribbon wrapping the tower one full turn, floor 6 to the roof.
    rb = bmesh.new()
    prev = None
    steps = 220
    for j in range(steps + 1):
        t = j / steps
        fi = 6 + t * (FLOORS - 8)
        s, tw = level(fi)
        ang = t * math.tau + tw
        # Point on the rounded square at angle `ang` (ray cast against the outline).
        rot = Matrix.Rotation(tw, 3, "Z")
        pts = [rot @ q for q in plate(s, n=288)]
        d = Vector((math.cos(ang), math.sin(ang), 0))
        p = None
        for a, b in zip(pts, pts[1:] + pts[:1]):
            # Solve origin + d*r = a + (b - a)*u for r > 0, 0 <= u <= 1.
            e = b - a
            den = d.x * e.y - d.y * e.x
            if abs(den) < 1e-9:
                continue
            r = (a.x * e.y - a.y * e.x) / den
            u = (a.x * d.y - a.y * d.x) / den
            if r > 0 and 0 <= u <= 1:
                p = d * r
                break
        p = p + d * 0.9
        z = fi * FLOOR_H
        pair = [rb.verts.new((p.x, p.y, z - 1.6)), rb.verts.new((p.x, p.y, z + 1.6))]
        if prev:
            rb.faces.new((prev[0], pair[0], pair[1], prev[1]))
        prev = pair
    band = obj_from_bmesh("fuerte_band", rb, col, [mats["red"]])
    band.modifiers.new("thick", "SOLIDIFY").thickness = 0.25

    # Crown: tapering fins, a mast and a red beacon.
    top = FLOORS * FLOOR_H
    s, tw = level(FLOORS)
    crown = bmesh.new()
    for k in range(12):
        a = tw + k * math.tau / 12
        base = Vector((math.cos(a), math.sin(a), 0)) * HALF * s * 0.92
        tip = base * 0.35
        v = [crown.verts.new(p) for p in (base + Vector((0, 0, top)), base + Vector((0, 0, top)) + Vector((-math.sin(a), math.cos(a), 0)) * 0.3, tip + Vector((0, 0, top + 34)))]
        crown.faces.new(v)
    obj_from_bmesh("fuerte_crown", crown, col, [mats["mullion"]]).modifiers.new("thick", "SOLIDIFY").thickness = 0.4
    bpy.ops.mesh.primitive_cylinder_add(radius=0.6, depth=48, location=(0, 0, top + 24))
    mast = bpy.context.object
    mast.data.materials.append(mats["mullion"])
    bpy.ops.mesh.primitive_uv_sphere_add(radius=1.0, location=(0, 0, top + 48.5))
    bpy.context.object.data.materials.append(mats["beacon"])
    for o in (mast, bpy.context.object):
        for c in o.users_collection:
            c.objects.unlink(o)
        col.objects.link(o)


# --------------------------------------------------------------------------------------------- props for instancing
def furniture_sets(src):
    """Workstation variants (desk + chair + laptop/screen, lounge corner, plant) as single objects at the origin."""
    pm = ASSETS / "polyhaven/models"
    desk = join(append_objects(next((pm / "metal_office_desk").glob("*.blend")), src), "desk")
    lo, hi = bounds(desk)
    desk_top = hi.z
    chair = join(append_objects(next((pm / "modern_arm_chair_01").glob("*.blend")), src), "chair")
    chair.scale = (0.7, 0.7, 0.7)
    laptop = join(append_objects(next((pm / "classic_laptop").glob("*.blend")), src), "laptop")
    tv = join(append_objects(next((pm / "television_02").glob("*.blend")), src), "screen")
    plant = join(append_objects(next((pm / "potted_plant_04").glob("*.blend")), src), "plant")
    plant.scale = (2.2, 2.2, 2.2)
    lamp = join(append_objects(next((pm / "modern_ceiling_lamp_01").glob("*.blend")), src), "lamp")
    lamp.hide_render = True

    variants = []

    def compose(name, parts):
        objs = []
        for ob, loc, rz in parts:
            c = ob.copy()
            c.data = ob.data.copy()
            src.objects.link(c)
            c.location = loc
            c.rotation_euler = (0, 0, rz)
            objs.append(c)
        v = join(objs, name)
        variants.append(v)

    depth = hi.y - lo.y
    compose("ws_laptop", [(desk, (0, 0, 0), 0), (chair, (0, -depth * 0.9, 0), math.pi), (laptop, (0, 0, desk_top), 0)])
    compose("ws_screen", [(desk, (0, 0, 0), 0), (chair, (0.2, -depth * 0.9, 0), math.pi + 0.3), (tv, (0, depth * 0.15, desk_top), 0)])
    compose("ws_plant", [(desk, (0, 0, 0), 0), (laptop, (0.2, 0, desk_top), 0.2), (plant, (-1.1, 0.2, 0), 0)])
    compose("plant_only", [(plant, (0, 0, 0), 0)])
    for o in (desk, chair, laptop, tv, plant, lamp):
        bpy.data.objects.remove(o)
    return variants


def people_sets(src):
    """Each person baked to one static mesh in their posed shape, 1.74 m tall, feet at the origin.

    The glTF rigs carry scale on parents and armatures (bounds before baking are wrong), so the evaluated mesh is read
    back in world space and measured from its real vertices.
    """
    sf = ASSETS / "sketchfab"
    out = []
    for name in ("renderpeople-mei-business", "renderpeople-nathan-walking"):
        before = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=str(next((sf / name).glob("*.glb"))))
        new = [o for o in bpy.data.objects if o not in before]
        dg = bpy.context.evaluated_depsgraph_get()
        bm = bmesh.new()
        mats = []
        for o in new:
            if o.type != "MESH":
                continue
            ev = o.evaluated_get(dg)
            me = ev.to_mesh()
            me.transform(o.matrix_world)
            offset = len(mats)
            mats += [s.material for s in o.material_slots]
            for p in me.polygons:
                p.material_index += offset
            bm.from_mesh(me)
            ev.to_mesh_clear()
        for o in new:
            bpy.data.objects.remove(o)
        zs = [v.co.z for v in bm.verts]
        k = 1.74 / (max(zs) - min(zs))
        cx = sum(v.co.x for v in bm.verts) / len(bm.verts)
        cy = sum(v.co.y for v in bm.verts) / len(bm.verts)
        bmesh.ops.translate(bm, verts=bm.verts, vec=(-cx, -cy, -min(zs)))
        bmesh.ops.scale(bm, verts=bm.verts, vec=(k, k, k))
        out.append(obj_from_bmesh(name, bm, src, mats))
    return out


# --------------------------------------------------------------------------------------------- West Bay (OpenStreetMap)
def led_lattice(name, height):
    """Tornado Tower's LED skin: a glowing diagonal lattice over dark glass, violet at the base to magenta at the top."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    L = nt.links.new
    coord = node(nt, "ShaderNodeTexCoord", (-1400, 0))
    sep = node(nt, "ShaderNodeSeparateXYZ", (-1200, 0))
    L(coord.outputs["Object"], sep.inputs[0])
    ang = node(nt, "ShaderNodeMath", (-1000, 200), operation="ARCTAN2")
    L(sep.outputs["Y"], ang.inputs[0])
    L(sep.outputs["X"], ang.inputs[1])
    u = node(nt, "ShaderNodeMath", (-800, 200), operation="MULTIPLY")
    u.inputs[1].default_value = 16 / math.pi
    L(ang.outputs[0], u.inputs[0])
    v = node(nt, "ShaderNodeMath", (-800, 0), operation="MULTIPLY")
    v.inputs[1].default_value = 1 / 9
    L(sep.outputs["Z"], v.inputs[0])
    lines = []
    for k, op in enumerate(("ADD", "SUBTRACT")):
        s = node(nt, "ShaderNodeMath", (-600, 200 - 200 * k), operation=op)
        L(u.outputs[0], s.inputs[0])
        L(v.outputs[0], s.inputs[1])
        fr = node(nt, "ShaderNodeMath", (-450, 200 - 200 * k), operation="FRACT")
        L(s.outputs[0], fr.inputs[0])
        c = node(nt, "ShaderNodeMath", (-300, 200 - 200 * k), operation="SUBTRACT")
        c.inputs[1].default_value = 0.5
        L(fr.outputs[0], c.inputs[0])
        a = node(nt, "ShaderNodeMath", (-150, 200 - 200 * k), operation="ABSOLUTE")
        L(c.outputs[0], a.inputs[0])
        g = node(nt, "ShaderNodeMath", (0, 200 - 200 * k), operation="GREATER_THAN")
        g.inputs[1].default_value = 0.43
        L(a.outputs[0], g.inputs[0])
        lines.append(g)
    mask = node(nt, "ShaderNodeMath", (150, 100), operation="MAXIMUM")
    L(lines[0].outputs[0], mask.inputs[0])
    L(lines[1].outputs[0], mask.inputs[1])
    grad = node(nt, "ShaderNodeMapRange", (-600, -300))
    grad.inputs["From Max"].default_value = height
    L(sep.outputs["Z"], grad.inputs["Value"])
    ramp = node(nt, "ShaderNodeValToRGB", (-350, -300))
    ramp.color_ramp.elements[0].color = (0.32, 0.18, 1.0, 1)
    ramp.color_ramp.elements[1].color = (1.0, 0.2, 0.62, 1)
    L(grad.outputs[0], ramp.inputs[0])
    em = node(nt, "ShaderNodeEmission", (350, 0))
    L(ramp.outputs["Color"], em.inputs["Color"])
    st = node(nt, "ShaderNodeMath", (300, 200), operation="MULTIPLY")
    st.inputs[1].default_value = 16
    L(mask.outputs[0], st.inputs[0])
    L(st.outputs[0], em.inputs["Strength"])
    shell = node(nt, "ShaderNodeBsdfPrincipled", (350, -300))
    shell.inputs["Base Color"].default_value = (0.02, 0.025, 0.035, 1)
    shell.inputs["Metallic"].default_value = 0.7
    shell.inputs["Roughness"].default_value = 0.1
    add = node(nt, "ShaderNodeAddShader", (600, 0))
    L(em.outputs[0], add.inputs[0])
    L(shell.outputs[0], add.inputs[1])
    out = node(nt, "ShaderNodeOutputMaterial", (800, 0))
    L(add.outputs[0], out.inputs["Surface"])
    return m


def windows(name, bay, floor_h, lit, tint, warm_share=0.6):
    """Night tower facade from UVs in metres (u along the perimeter, v up): a grid of office windows, each randomly lit
    warm or cool or left dark, behind tinted glass, with dark spandrels between floors. Reads at any distance."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    L = nt.links.new
    b = nt.nodes["Principled BSDF"]

    def math_(op, *args):
        n = node(nt, "ShaderNodeMath", (-400, 0), operation=op)
        for i, x in enumerate(args):
            if isinstance(x, (int, float)):
                n.inputs[i].default_value = x
            else:
                L(x, n.inputs[i])
        return n.outputs[0]

    uv = node(nt, "ShaderNodeUVMap", (-1600, 0))
    sep = node(nt, "ShaderNodeSeparateXYZ", (-1400, 0))
    L(uv.outputs[0], sep.inputs[0])
    cu, cv = math_("DIVIDE", sep.outputs["X"], bay), math_("DIVIDE", sep.outputs["Y"], floor_h)
    cell = node(nt, "ShaderNodeCombineXYZ", (-900, 200))
    L(math_("FLOOR", cu), cell.inputs["X"])
    L(math_("FLOOR", cv), cell.inputs["Y"])
    noise = node(nt, "ShaderNodeTexWhiteNoise", (-700, 200), noise_dimensions="3D")
    L(cell.outputs[0], noise.inputs["Vector"])
    floor_cell = node(nt, "ShaderNodeCombineXYZ", (-900, 400))
    L(math_("FLOOR", cv), floor_cell.inputs["Y"])
    floor_cell.inputs["Z"].default_value = 7.3
    floor_noise = node(nt, "ShaderNodeTexWhiteNoise", (-700, 400), noise_dimensions="3D")
    L(floor_cell.outputs[0], floor_noise.inputs["Vector"])
    # Pane mask: inside each cell, away from mullions (u) and the spandrel band (v).
    pane_u = math_("LESS_THAN", math_("ABSOLUTE", math_("SUBTRACT", math_("FRACT", cu), 0.5)), 0.44)
    pane_v = math_("LESS_THAN", math_("ABSOLUTE", math_("SUBTRACT", math_("FRACT", cv), 0.55)), 0.33)
    pane = math_("MULTIPLY", pane_u, pane_v)
    # Whole floors go dark together sometimes (empty floors, plant rooms), the rest is per-window.
    on = math_("MULTIPLY", math_("LESS_THAN", noise.outputs["Value"], lit), math_("GREATER_THAN", floor_noise.outputs["Value"], 0.18))
    sep_c = node(nt, "ShaderNodeSeparateColor", (-500, 0))
    L(noise.outputs["Color"], sep_c.inputs[0])
    warm = math_("LESS_THAN", sep_c.outputs[0], warm_share)
    col_ = node(nt, "ShaderNodeMix", (-200, 0), data_type="RGBA")
    col_.inputs["A"].default_value = (0.78, 0.88, 1.0, 1)
    col_.inputs["B"].default_value = (1.0, 0.74, 0.46, 1)
    L(warm, col_.inputs["Factor"])
    L(col_.outputs["Result"], b.inputs["Emission Color"])
    strength = math_("MULTIPLY", math_("MULTIPLY", on, pane), math_("MULTIPLY_ADD", math_("POWER", sep_c.outputs[1], 2.0), 2.2, 0.35))
    L(strength, b.inputs["Emission Strength"])
    base = node(nt, "ShaderNodeMix", (-200, -300), data_type="RGBA")
    base.inputs["A"].default_value = (0.035, 0.035, 0.04, 1)  # spandrel
    base.inputs["B"].default_value = (*tint, 1)  # glass
    L(pane, base.inputs["Factor"])
    L(base.outputs["Result"], b.inputs["Base Color"])
    L(math_("MULTIPLY_ADD", pane, -0.3, 0.36), b.inputs["Roughness"])
    L(math_("MULTIPLY_ADD", pane, -0.7, 0.8), b.inputs["Metallic"])
    return m


def revolve(name, centre, h, radius_at, col, mats, rings=48, segs=48):
    """Round tower from its OSM footprint centre: radius_at(t) for t = 0..1 of height h; origin at the base centre."""
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new("UVMap")
    r0 = radius_at(0)
    prev = None
    for j in range(rings + 1):
        t = j / rings
        r = radius_at(t)
        ring_ = [bm.verts.new((r * math.cos(a), r * math.sin(a), h * t)) for a in (math.tau * k / segs for k in range(segs))]
        if prev:
            for k in range(segs):
                f = bm.faces.new((prev[k], prev[(k + 1) % segs], ring_[(k + 1) % segs], ring_[k]))
                for loop, (kk, tt) in zip(f.loops, ((k, j - 1), (k + 1, j - 1), (k + 1, j), (k, j))):
                    loop[uvl].uv = (r0 * math.tau * kk / segs, h * tt / rings)
        prev = ring_
    bm.faces.new(prev).material_index = 1
    ob = obj_from_bmesh(name, bm, col, mats)
    ob.location = (centre.x, centre.y, 0)
    for p in ob.data.polygons:
        p.use_smooth = True
    return ob


def doha(col):
    """Every OSM building footprint in West Bay extruded to its mapped height, lit for blue hour, with neon crowns."""
    data = json.loads((OSM / "city.json").read_text(encoding="utf8"))
    towers = [
        windows("office_a", 1.5, 3.9, 0.4, (0.05, 0.08, 0.11)),
        windows("office_b", 3.0, 4.1, 0.45, (0.06, 0.07, 0.09), warm_share=0.35),
        windows("office_c", 2.0, 3.8, 0.32, (0.07, 0.09, 0.08)),
        windows("residential", 1.2, 3.4, 0.3, (0.06, 0.06, 0.07), warm_share=0.85),
    ]
    lowrise = windows("lowrise", 2.6, 3.5, 0.25, (0.09, 0.085, 0.08), warm_share=0.9)
    roof = principled("roof", (0.08, 0.08, 0.09), rough=0.6)
    neon = [emission(f"neon_{k}", c, 14.0) for k, c in enumerate(NEON)]
    beacon = emission("tower_beacon", (1.0, 0.08, 0.04), 40.0)
    mats = towers + [lowrise, roof] + neon + [beacon]
    LOW, ROOF, NEON0, BEACON = 4, 5, 6, 10

    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new("UVMap")

    def quad(a, b, z0, z1, mat, out=0.0):
        d = (b - a).normalized()
        n = Vector((d.y, -d.x)) * out  # footprints are counter-clockwise, so (dy, -dx) points outward
        v = [bm.verts.new((p.x + n.x, p.y + n.y, z)) for p, z in ((a, z0), (b, z0), (b, z1), (a, z1))]
        bm.faces.new(v).material_index = mat

    for b in data["buildings"]:
        pts = []
        for x, y in b["pts"]:
            p = Vector((x, y)) - SITE
            if not pts or (p - pts[-1]).length > 0.3:
                pts.append(p)
        if len(pts) > 2 and (pts[0] - pts[-1]).length < 0.3:
            pts.pop()
        if len(pts) < 3 or min(p.length for p in pts) < 45:
            continue  # degenerate, or on Fuerte's plot
        h = b["h"]
        kind = SPECIAL.get(b["id"])
        if kind:
            centre = sum(pts, Vector((0, 0))) / len(pts)
            r = sum((p - centre).length for p in pts) / len(pts)
            if kind == "tornado":
                revolve("tornado_tower", centre, h, lambda t: r * (0.7 + 0.3 * ((t - 0.6) / 0.6) ** 2), col, [led_lattice("tornado_led", h), roof])
            else:
                revolve("doha_tower", centre, h * 0.93, lambda t: r * (1.0 if t < 0.84 else math.sqrt(max(0.04, 1 - ((t - 0.84) / 0.16) ** 2))), col, [windows("doha_tower_screen", 0.9, 3.0, 0.55, (0.1, 0.09, 0.08), warm_share=0.95), roof])
                bpy.ops.mesh.primitive_cylinder_add(radius=0.5, depth=h * 0.09, location=(centre.x, centre.y, h * 0.955))
                spire = bpy.context.object
                spire.data.materials.append(neon[0])
                for c in spire.users_collection:
                    c.objects.unlink(spire)
                col.objects.link(spire)
            continue
        mat = RNG.randrange(0, 3) if h >= 60 else (RNG.randrange(0, 4) if h > 28 else LOW)
        lo = [bm.verts.new((p.x, p.y, 0)) for p in pts]
        hi = [bm.verts.new((p.x, p.y, h)) for p in pts]
        n = len(pts)
        u = RNG.uniform(0, 5000)  # random start so neighbouring towers don't share a lighting pattern
        for k in range(n):
            f = bm.faces.new((lo[k], lo[(k + 1) % n], hi[(k + 1) % n], hi[k]))
            f.material_index = mat
            w = (pts[(k + 1) % n] - pts[k]).length
            for loop, uv in zip(f.loops, ((u, 0), (u + w, 0), (u + w, h), (u, h))):
                loop[uvl].uv = uv
            u += w
        try:
            bm.faces.new(hi).material_index = ROOF
        except ValueError:
            pass
        if h >= 90:
            # Neon crown along the roof edge; some towers also get lit corner lines, as many West Bay towers do.
            glow = NEON0 + RNG.choices(range(4), weights=(3, 2, 3, 1))[0]
            for k in range(n):
                quad(pts[k], pts[(k + 1) % n], h - 2.4, h - 0.6, glow, out=0.35)
            if RNG.random() < 0.35:
                for k in range(n):
                    a, p, c = pts[k - 1], pts[k], pts[(k + 1) % n]
                    turn = (p - a).normalized().angle((c - p).normalized(), 0)
                    if turn > math.radians(35):
                        bis = ((p - a).normalized() - (c - p).normalized()).normalized()
                        side = Vector((-bis.y, bis.x)) * 0.35
                        quad(p - side, p + side, 2, h - 2.4, glow, out=0)
        if h > 150:
            ico = bmesh.ops.create_icosphere(bm, subdivisions=1, radius=1.0, matrix=Matrix.Translation((pts[0].x, pts[0].y, h + 1.2)))
            for f in {f for v in ico["verts"] for f in v.link_faces}:
                f.material_index = BEACON
    obj_from_bmesh("west_bay", bm, col, mats)


def corniche(col):
    """Street lamps every 32 m along the real shoreline around the shot (Poly Haven street_lamp_01), with warm light."""
    data = json.loads((OSM / "city.json").read_text(encoding="utf8"))
    pm = ASSETS / "polyhaven/models"
    src = collection("lamp_src", hide=True)
    lamp = join(append_objects(next((pm / "street_lamp_01").glob("*.blend")), src), "street_lamp")
    top = bounds(lamp)[1].z
    k = 0
    for line in data["coast"]:
        pts = [Vector(p) - SITE for p in line]
        carry = 0.0
        for a, b in zip(pts, pts[1:]):
            seg = (b - a).length
            if seg < 1e-3:
                continue
            d = (b - a) / seg
            inland = Vector((-d.y, d.x)) * 7  # OSM coastline: land on the left of the way
            s = carry
            while s < seg:
                p = a + d * s + inland
                if abs(p.x) < 1400 and -900 < p.y < 600:
                    inst = bpy.data.objects.new(f"lamp_{k}", lamp.data)
                    inst.location = (p.x, p.y, 0)
                    inst.rotation_euler = (0, 0, math.atan2(d.y, d.x))
                    col.objects.link(inst)
                    light = bpy.data.lights.new(f"lamp_light_{k}", "POINT")
                    light.energy = 450
                    light.color = (1.0, 0.78, 0.52)
                    light.shadow_soft_size = 0.3
                    lo_ = bpy.data.objects.new(f"lamp_light_{k}", light)
                    lo_.location = (p.x, p.y, top + 0.2)
                    col.objects.link(lo_)
                    k += 1
                s += 32
            carry = s - seg
    print("lamps", k, flush=True)


def atmosphere(col):
    """Homogeneous aerial haze over the whole set: depth and the warm dusk falloff."""
    bpy.ops.mesh.primitive_cube_add(size=1)
    cube = bpy.context.object
    for c in cube.users_collection:
        c.objects.unlink(cube)
    col.objects.link(cube)
    cube.name = "haze"
    cube.scale = (9000, 9000, 700)
    cube.location = (0, 0, 340)
    m = bpy.data.materials.new("haze")
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    vol = node(nt, "ShaderNodeVolumePrincipled")
    vol.inputs["Density"].default_value = 0.00022
    vol.inputs["Color"].default_value = (0.95, 0.78, 0.62, 1)
    vol.inputs["Anisotropy"].default_value = 0.55
    out = node(nt, "ShaderNodeOutputMaterial", (300, 0))
    nt.links.new(vol.outputs[0], out.inputs["Volume"])
    cube.data.materials.append(m)
    cube.visible_shadow = False


def camera(scene, col):
    cam_data = bpy.data.cameras.new("cam")
    cam_data.lens = 28
    cam_data.sensor_width = 36
    cam_data.clip_end = 8000
    cam = bpy.data.objects.new("cam", cam_data)
    col.objects.link(cam)
    scene.camera = cam
    target = bpy.data.objects.new("cam_target", None)
    col.objects.link(target)
    track = cam.constraints.new("TRACK_TO")
    track.target = target
    track.track_axis, track.up_axis = "TRACK_NEGATIVE_Z", "UP_Y"
    # Low glide over the water toward the tower; the aim lifts toward the crown as we close in.
    for f, loc, aim in ((1, (-60, -1250, 14), (0, 0, 120)), (FRAMES, (35, -360, 46), (0, 0, 190))):
        cam.location = loc
        cam.keyframe_insert("location", frame=f)
        target.location = aim
        target.keyframe_insert("location", frame=f)


def build():
    scene = reset()
    world()
    set_col = collection("set")
    src = collection("furniture_src", hide=True)
    furn = collection("furniture_variants", hide=True)
    for v in furniture_sets(src):
        for c in v.users_collection:
            c.objects.unlink(v)
        furn.objects.link(v)
    people_src = collection("people_src", hide=True)
    people_sets(people_src)
    land_and_sea(set_col)
    fuerte_tower(set_col, furn, people_src)
    doha(set_col)
    corniche(set_col)
    atmosphere(set_col)
    camera(scene, set_col)
    for name in HIDDEN:
        bpy.context.view_layer.layer_collection.children[name].exclude = True
    OUT.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT), compress=True)
    return scene


def render(scene, out_dir, w, h, samples, frames):
    scene.render.resolution_x, scene.render.resolution_y, scene.render.resolution_percentage = w, h, 100
    scene.cycles.samples = samples
    scene.render.image_settings.file_format = "PNG"
    for f in frames:
        scene.frame_set(f)
        scene.render.filepath = str(pathlib.Path(out_dir) / f"arrival_{f:04d}.png")
        bpy.ops.render.render(write_still=True)
        print("RENDERED", f, flush=True)


if __name__ == "__main__":
    sc = build()
    print("BUILT", OUT, flush=True)
    if "--render" in ARGS:
        i = ARGS.index("--render")
        out_dir, w, h, samples, frames = ARGS[i + 1], int(ARGS[i + 2]), int(ARGS[i + 3]), int(ARGS[i + 4]), ARGS[i + 5]
        render(sc, out_dir, w, h, samples, [int(x) for x in frames.split(",")])
