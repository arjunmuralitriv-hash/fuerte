"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  CircleGeometry,
  Color,
  CylinderGeometry,
  Euler,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  RingGeometry,
  Vector2,
  Vector3,
  type BufferGeometry,
  type Group,
  type Material,
} from "three";

import { useScene } from "./context";
import { aim, disposeMeshes, instanced, place } from "./instancing";
import { applyGlowBlending, createConeMaterial, createLedMaterial, createRippleMaterial } from "./materials";
import { random } from "./math";
import { accessPoint, bmsSensor, bulletCamera, cardReader, ceilingSpeaker, domeCamera, hornSpeaker } from "./models";
import { createEquipmentMaterials, disposeMaterials, withReveal } from "./pbr";
import type { Quality } from "./quality";
import { speakerGrille } from "./textures";
import { layerWeights } from "./timeline";
import { PODIUM_RADIUS, TOWER, floorY } from "./tower";

const POLE = { radius: 3.3, height: 0.45 };
const ENTRANCE = Math.PI / 4;
const SLAB_UNDERSIDE = 0.03;
/** Devices are drawn larger than life so they still read from the beat-3 camera. */
const DEVICE_SCALE = 1.6;

/** Position plus a heading (about Y) and pitch (positive looks down). */
function mount(p: Vector3, yaw: number, pitch = 0) {
  return new Matrix4().compose(p, new Quaternion().setFromEuler(new Euler(pitch, yaw, 0, "YXZ")), new Vector3(1, 1, 1));
}
/** Yaw and pitch that point a +Z-facing model from `from` at `to`. */
function aimAngles(from: Vector3, to: Vector3) {
  const d = to.clone().sub(from);
  return { yaw: Math.atan2(d.x, d.z), pitch: Math.asin(-d.y / d.length()) };
}

function createMaterials() {
  const eq = createEquipmentMaterials();
  const uReveal = { value: 0 };
  const reveal = <M extends MeshStandardMaterial>(m: M) => withReveal(m, uReveal);
  const grille = new MeshStandardMaterial({ color: "#d9d9d6", roughness: 0.6, normalMap: speakerGrille(), normalScale: new Vector2(0.8, 0.8) });
  grille.normalMap?.repeat.set(6, 6);
  return {
    uReveal,
    white: reveal(eq.whitePlastic),
    grey: reveal(eq.greyPlastic),
    black: reveal(eq.blackPlastic),
    dome: reveal(eq.smokedDome),
    lens: reveal(eq.lens),
    grille: reveal(grille),
    statusRing: reveal(new MeshStandardMaterial({ color: "#ffffff", emissive: new Color(0.6, 0.85, 2.2), roughness: 0.3 })),
    display: reveal(new MeshStandardMaterial({ color: "#0b1620", emissive: new Color(0.25, 0.9, 1.2), roughness: 0.2 })),
    pad: reveal(new MeshStandardMaterial({ color: "#2b2e33", emissive: new Color(0.05, 0.05, 0.06), roughness: 0.3 })),
    pole: reveal(new MeshStandardMaterial({ color: "#8c9097", roughness: 0.4, metalness: 0.8 })),
    cone: createConeMaterial(),
    ripple: createRippleMaterial(),
    led: createLedMaterial(),
  };
}
type DeviceMaterials = ReturnType<typeof createMaterials>;

type Batch = { m: Matrix4[]; phase: number[] };
const batch = (): Batch => ({ m: [], phase: [] });

function buildDevices(quality: Quality, mat: DeviceMaterials) {
  const rand = random(23);
  const domes = batch();
  const bullets = batch();
  const aps = batch();
  const speakers = batch();
  const sensors = batch();
  const readers = batch();
  const horns = batch();
  const poles = batch();
  const cones: Matrix4[] = [];
  const ripples: Matrix4[] = [];
  const rippleSize: number[] = [];
  const ripplePhase: number[] = [];
  const leds: Matrix4[] = [];
  const ledColour: number[] = [];
  const ledPhase: number[] = [];
  const add = (b: Batch, m: Matrix4) => {
    b.m.push(m);
    b.phase.push(rand());
  };
  const ripple = (p: Vector3, size: number) => {
    ripples.push(place(p.x, p.y - 0.005, p.z));
    rippleSize.push(size);
    ripplePhase.push(rand());
  };
  const led = (p: Vector3, colour: number[], yaw: number) => {
    leds.push(place(p.x, p.y, p.z, yaw, 0.006, 0.006, 0.006));
    ledColour.push(...colour);
    ledPhase.push(rand());
  };
  const radial = (a: number, r: number, y: number) => new Vector3(Math.cos(a) * r, y, Math.sin(a) * r);

  // Entrance: dome cameras under the canopy, card readers either side of the doors.
  for (const off of [-0.2, 0.2]) {
    const t = new Vector3(-Math.sin(ENTRANCE), 0, Math.cos(ENTRANCE)).multiplyScalar(off);
    const p = radial(ENTRANCE, PODIUM_RADIUS + 0.3, 0.612).add(t);
    add(domes, place(p.x, p.y, p.z, Math.PI / 2 - ENTRANCE));
    cones.push(aim(p.clone().setY(p.y - 0.03), radial(ENTRANCE, 1, -0.75), 0.32, 0.75, 0.32));
  }
  for (const off of [-0.13, 0.13]) {
    const a = ENTRANCE + off;
    const p = radial(a, PODIUM_RADIUS + 0.02, 0.3);
    add(readers, mount(p, Math.PI / 2 - a));
    led(p.clone().add(radial(a, 0.0105, 0.012)), [1, 0.12, 0.08], Math.PI / 2 - a);
  }
  // Podium roof overhang: domes all round; bullets on two corners looking out along the drive.
  for (let i = 0; i < 4; i++) {
    const a = ENTRANCE + Math.PI / 4 + (i * Math.PI) / 2;
    add(domes, place(Math.cos(a) * 2.36, 0.68, Math.sin(a) * 2.36, Math.PI / 2 - a));
  }
  for (const a of [ENTRANCE - 1.1, ENTRANCE + 1.1]) {
    const p = radial(a, 2.4, 0.78);
    const target = radial(a + 0.15, 3.6, 0);
    const { yaw, pitch } = aimAngles(p, target);
    add(bullets, mount(p, yaw, pitch));
    cones.push(aim(p, target.clone().sub(p), 0.35, p.distanceTo(target), 0.35));
  }

  // Perimeter poles: a bullet camera on top watching the forecourt, a PA horn half-way up.
  const poleCount = quality.tier === "desktop" ? 6 : 4;
  for (let i = 0; i < poleCount; i++) {
    const a = ENTRANCE + ((i + 0.5) / poleCount - 0.5) * Math.PI * 1.4;
    const base = radial(a, POLE.radius, 0);
    add(poles, place(base.x, POLE.height / 2, base.z, 0, 1, 1, 1));
    const head = base.clone().setY(POLE.height + 0.01);
    const target = radial(a + 0.25, PODIUM_RADIUS + 0.4, 0);
    const { yaw, pitch } = aimAngles(head, target);
    add(bullets, mount(head, yaw, pitch));
    cones.push(aim(head, target.clone().sub(head), 0.42, head.distanceTo(target), 0.42));
    const hornAt = base.clone().setY(POLE.height * 0.62);
    add(horns, mount(hornAt, Math.PI / 2 - a));
    ripple(hornAt.clone().setY(hornAt.y + 0.005), 0.7);
  }

  // Lower floors: ceiling APs, PA speakers and a dome; BMS sensors and a reader on the core.
  for (let f = 0; f < quality.deviceFloors; f++) {
    const ceiling = floorY(f + 1) - SLAB_UNDERSIDE;
    for (let k = 0; k < 2; k++) {
      const a = f * 1.1 + k * Math.PI;
      const ap = radial(a, 0.95, ceiling);
      add(aps, place(ap.x, ap.y, ap.z, a));
      ripple(ap, 0.28);
      const spk = radial(a + Math.PI / 2, 1.15, ceiling);
      add(speakers, place(spk.x, spk.y, spk.z));
      ripple(spk, 0.34);
      const face = k === 0 ? 1 : -1;
      const sensor = new Vector3(0.12 * face, floorY(f) + 0.14, face * (TOWER.coreHalf + 0.001));
      add(sensors, mount(sensor, k === 0 ? 0 : Math.PI));
      led(sensor.clone().add(new Vector3(0, -0.012, face * 0.0106)), [0.15, 1, 0.35], k === 0 ? 0 : Math.PI);
    }
    const dome = radial(f * 1.1 + 0.8, 1.25, ceiling);
    add(domes, place(dome.x, dome.y, dome.z));
    const door = new Vector3(TOWER.coreHalf + 0.001, floorY(f) + 0.13, -0.18);
    add(readers, mount(door, Math.PI / 2));
  }

  const detail = quality.latheDetail;
  const rounding = quality.tier === "desktop" ? 2 : 1;
  const grow = new Matrix4().makeScale(DEVICE_SCALE, DEVICE_SCALE, DEVICE_SCALE);
  const make = (geometry: BufferGeometry, materials: Material | Material[], b: Batch) =>
    instanced(
      geometry,
      materials,
      b.m.map((m) => m.clone().multiply(grow)),
      { aPhase: { array: b.phase, size: 1 } },
    );
  const geos = {
    dome: domeCamera(detail),
    bullet: bulletCamera(detail),
    ap: accessPoint(rounding),
    speaker: ceilingSpeaker(detail),
    sensor: bmsSensor(rounding),
    reader: cardReader(rounding),
    horn: hornSpeaker(detail),
    pole: new CylinderGeometry(0.012, 0.016, POLE.height, 8),
    cone: new CylinderGeometry(0, 1, 1, quality.tier === "desktop" ? 20 : 12, 1, true).translate(0, -0.5, 0),
    ring: new RingGeometry(0.9, 1, quality.tier === "desktop" ? 40 : 24).rotateX(-Math.PI / 2),
    led: new CircleGeometry(0.5, 8),
  };
  const meshes = {
    domes: make(geos.dome, [mat.white, mat.dome, mat.lens], domes),
    bullets: make(geos.bullet, [mat.white, mat.white, mat.lens, mat.grey], bullets),
    aps: make(geos.ap, [mat.white, mat.statusRing], aps),
    speakers: make(geos.speaker, [mat.white, mat.grille], speakers),
    sensors: make(geos.sensor, [mat.white, mat.display], sensors),
    readers: make(geos.reader, [mat.black, mat.pad], readers),
    horns: make(geos.horn, mat.grey, horns),
    poles: instanced(geos.pole, mat.pole, poles.m, { aPhase: { array: poles.phase, size: 1 } }),
    cones: instanced(geos.cone, mat.cone, cones),
    ripples: instanced(geos.ring, mat.ripple, ripples, {
      aPhase: { array: ripplePhase, size: 1 },
      aSize: { array: rippleSize, size: 1 },
    }),
    leds: instanced(geos.led, mat.led, leds, { aColor: { array: ledColour, size: 3 }, aPhase: { array: ledPhase, size: 1 } }),
  };
  // Cones and rings change size in the shader.
  meshes.cones.frustumCulled = false;
  meshes.ripples.frustumCulled = false;
  for (const g of Object.values(geos)) g.dispose();
  return meshes;
}

/** CCTV (dome and bullet) with sight-line cones, card readers, Wi-Fi APs, PA and BMS devices (beat 3). */
export function ElvDevices() {
  const { state, quality, palette } = useScene();
  const materials = useMemo(createMaterials, []);
  const meshes = useMemo(() => buildDevices(quality, materials), [quality, materials]);
  const group = useRef<Group>(null);

  useEffect(() => () => disposeMeshes(Object.values(meshes)), [meshes]);
  useEffect(() => () => disposeMaterials(materials), [materials]);

  useEffect(() => {
    const { cone, ripple } = materials;
    for (const m of [cone, ripple]) (m.uniforms.uColor.value as Color).copy(palette.dark ? palette.glow : palette.primary);
    applyGlowBlending(palette, cone, ripple);
  }, [palette, materials]);

  useFrame(({ clock }) => {
    const w = layerWeights(state.beat).devices;
    const t = clock.elapsedTime;
    if (group.current) group.current.visible = w > 0.002;
    materials.uReveal.value = w;
    const { cone, ripple, led } = materials;
    cone.uniforms.uOpacity.value = w * 0.22;
    cone.uniforms.uTime.value = t;
    ripple.uniforms.uOpacity.value = w * 0.35;
    ripple.uniforms.uTime.value = t;
    led.uniforms.uTime.value = t;
  });

  return (
    <group name="elv_devices" ref={group}>
      {Object.entries(meshes).map(([key, mesh]) => (
        <primitive key={key} object={mesh} />
      ))}
    </group>
  );
}
