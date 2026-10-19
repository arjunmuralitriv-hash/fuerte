"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  Vector2,
  type Group,
  type Matrix4,
} from "three";

import { useScene } from "./context";
import { disposeMeshes, instanced, place } from "./instancing";
import { createLedMaterial } from "./materials";
import { random } from "./math";
import { brushedParams, createEquipmentMaterials, disposeMaterials } from "./pbr";
import type { Quality } from "./quality";
import type { SceneMaps } from "./assets";
import { cabinetFaces, floorTiles, ladderTray, perforation, serverFaces } from "./textures";
import { layerWeights } from "./timeline";
import { TOWER, floorY, radiusAt } from "./tower";

/** Rack footprint: 600 × 1200 mm, 42U (≈ 2 m) at 1 unit ≈ 12 m. */
const RACK = { w: 0.05, d: 0.1, h: 0.17, pitch: 0.052 };
const RAISED = 0.05;
const LED_COLOURS = [
  [0.15, 1, 0.35],
  [0.15, 1, 0.35],
  [0.15, 1, 0.35],
  [0.2, 0.55, 1],
  [0.2, 0.55, 1],
  [1, 0.6, 0.1],
  [1, 0.12, 0.08],
];

function createMaterials(maps: SceneMaps | null) {
  const faces = serverFaces();
  const { cooler, ups } = cabinetFaces();
  const tiles = floorTiles();
  const perf = perforation();
  const eq = createEquipmentMaterials(maps);
  const faceMaterial = (map: (typeof faces)[number]) =>
    new MeshStandardMaterial({ map: map.map, normalMap: map.normal, roughness: 0.45, metalness: 0.4 });
  const perforatedDoor = new MeshStandardMaterial({
    color: "#17181c",
    roughness: 0.4,
    metalness: 0.7,
    alphaMap: perf.alpha.clone(),
    normalMap: perf.normal.clone(),
    transparent: true,
    depthWrite: false,
  });
  perforatedDoor.alphaMap?.repeat.set(10, 34);
  perforatedDoor.normalMap?.repeat.set(10, 34);
  const floor = new MeshStandardMaterial({ map: tiles.solid.map.clone(), normalMap: tiles.solid.normal.clone(), roughness: 0.55, metalness: 0.15 });
  const perfTiles = new MeshStandardMaterial({
    map: tiles.perforated.map.clone(),
    normalMap: tiles.perforated.normal.clone(),
    roughness: 0.5,
    metalness: 0.2,
  });
  const tray = new MeshStandardMaterial({
    color: "#c4c8ce",
    roughness: 0.35,
    metalness: 0.9,
    alphaMap: ladderTray().clone(),
    alphaTest: 0.5,
    side: DoubleSide,
  });
  return {
    ...eq,
    faces: faces.map(faceMaterial),
    cooler: new MeshStandardMaterial({ map: cooler.map, normalMap: cooler.normal, roughness: 0.5, metalness: 0.2 }),
    ups: new MeshStandardMaterial({ map: ups.map, normalMap: ups.normal, emissiveMap: ups.emissive, emissive: new Color(2, 2, 2), roughness: 0.5, metalness: 0.3 }),
    coolerBody: new MeshStandardMaterial({ color: "#d3d6db", metalness: 0.2, ...brushedParams(maps, 0.45) }),
    perforatedDoor,
    floor,
    perfTiles,
    tray,
    fixture: new MeshBasicMaterial({ color: new Color(3, 3, 3.2) }),
    led: createLedMaterial(),
  };
}
type HallMaterials = ReturnType<typeof createMaterials>;

function buildHall(quality: Quality, m: HallMaterials) {
  const rand = random(61);
  const R = radiusAt(TOWER.hallFloor) - 0.07;
  const aisles = quality.rackRows === 6 ? [-0.62, 0, 0.62] : [-0.55, 0.55];
  const racks: Matrix4[][] = [[], [], []];
  const doors: Matrix4[] = [];
  const coolers: Matrix4[] = [];
  const ups: Matrix4[] = [];
  const leds: Matrix4[] = [];
  const ledColour: number[] = [];
  const ledPhase: number[] = [];
  const perfTiles: Matrix4[] = [];
  const roofs: Matrix4[] = [];
  const frames: Matrix4[] = [];
  const trays: Matrix4[] = [];
  const raceways: Matrix4[] = [];
  const fixtures: Matrix4[] = [];
  const bodyY = RAISED + RACK.h / 2;
  const top = RAISED + RACK.h;

  for (const aisle of aisles) {
    // Usable run along x: inside the floor plate, and clear of the core and its riser.
    const halfLength = Math.sqrt(R * R - (Math.abs(aisle) + RACK.d + 0.06) ** 2) - 0.06;
    const spans: [number, number][] = Math.abs(aisle) < 0.5 ? [[-halfLength, -0.52], [0.52, halfLength]] : [[-halfLength, halfLength]];
    for (const [x0, x1] of spans) {
      const slots = Math.floor((x1 - x0) / RACK.pitch);
      const len = slots * RACK.pitch;
      const mid = (x0 + x1) / 2;
      const outer = Math.abs(aisle) > 0.5;
      perfTiles.push(place(mid, RAISED + 0.0006, aisle, 0, len, 1, 0.12));
      // Cold-aisle containment: glass roof, framed, with sliding doors at both ends.
      roofs.push(place(mid, top + 0.004, aisle, 0, len, 0.004, 0.12));
      roofs.push(place(mid - len / 2, bodyY, aisle, 0, 0.004, RACK.h, 0.12));
      roofs.push(place(mid + len / 2, bodyY, aisle, 0, 0.004, RACK.h, 0.12));
      for (const e of [-0.06, 0.06]) frames.push(place(mid, top + 0.006, aisle + e, 0, len, 0.006, 0.006));
      raceways.push(place(mid, top + 0.11, aisle, 0, len, 0.018, 0.035));
      fixtures.push(place(mid, 0.58, aisle, 0, len * 0.9, 0.006, 0.012));
      for (const facing of [1, -1]) {
        // facing +1: row sits on the -z side of the aisle, front looking +z into it.
        const z = aisle - facing * (0.06 + RACK.d / 2);
        const turn = facing > 0 ? 0 : Math.PI;
        trays.push(place(mid, top + 0.07, z, 0, len, 1, 0.07));
        fixtures.push(place(mid, 0.58, z - facing * 0.12, 0, len * 0.9, 0.006, 0.012));
        for (let s = 0; s < slots; s++) {
          const x = x0 + (s + 0.5) * RACK.pitch;
          const isUps = outer && s < 2;
          const isCooler = !isUps && s % 7 === 3;
          const at = place(x, bodyY, z, turn, RACK.w, RACK.h, RACK.d);
          if (isUps) ups.push(at);
          else if (isCooler) coolers.push(at);
          else {
            racks[Math.floor(rand() * 3)].push(at);
            const front = z + facing * (RACK.d / 2 + 0.004);
            doors.push(place(x, bodyY, front, turn, RACK.w * 0.92, RACK.h * 0.97, 1));
            for (let l = 0; l < quality.ledsPerRack; l++) {
              const ly = RAISED + 0.01 + rand() * (RACK.h - 0.02);
              leds.push(place(x + facing * 0.016, ly, z + facing * (RACK.d / 2 + 0.0012), turn, 0.0035, 0.0022, 1));
              ledColour.push(...LED_COLOURS[Math.floor(rand() * LED_COLOURS.length)]);
              ledPhase.push(rand());
            }
          }
        }
      }
    }
  }

  const box = new BoxGeometry(1, 1, 1);
  const plane = new PlaneGeometry(1, 1);
  const flat = new PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const steel = m.rackSteel;
  const faceArray = (front: MeshStandardMaterial, body = steel) => [body, body, body, body, front, body];
  const raisedFloor = new Mesh(new CylinderGeometry(R, R, RAISED, quality.facets * 2).translate(0, RAISED / 2, 0), m.floor);
  m.floor.map?.repeat.set((2 * R) / 0.05, (2 * R) / 0.05);
  m.floor.normalMap?.repeat.set((2 * R) / 0.05, (2 * R) / 0.05);
  m.floor.normalScale = new Vector2(0.6, 0.6);
  m.perfTiles.map?.repeat.set(40, 2);
  m.perfTiles.normalMap?.repeat.set(40, 2);
  m.tray.alphaMap?.repeat.set(60, 1);

  const meshes = {
    raisedFloor,
    perfTiles: instanced(flat, m.perfTiles, perfTiles),
    racks0: instanced(box, faceArray(m.faces[0]), racks[0]),
    racks1: instanced(box, faceArray(m.faces[1]), racks[1]),
    racks2: instanced(box, faceArray(m.faces[2]), racks[2]),
    doors: instanced(plane, m.perforatedDoor, doors),
    coolers: instanced(box, faceArray(m.cooler, m.coolerBody), coolers),
    ups: instanced(box, faceArray(m.ups), ups),
    leds: instanced(plane, m.led, leds, { aColor: { array: ledColour, size: 3 }, aPhase: { array: ledPhase, size: 1 } }),
    roofs: instanced(box, m.containmentGlass, roofs),
    frames: instanced(box, m.whitePlastic, frames),
    trays: instanced(flat, m.tray, trays),
    raceways: instanced(box, m.fibreYellow, raceways),
    fixtures: instanced(box, m.fixture, fixtures),
  };
  for (const g of [box, plane, flat]) g.dispose();
  return meshes;
}

/** The opened data-hall floor (beat 2): raised floor, contained rack rows, cooling, UPS, overhead trays. */
export function DataHall() {
  const { state, quality, maps } = useScene();
  const materials = useMemo(() => createMaterials(maps), [maps]);
  const meshes = useMemo(() => buildHall(quality, materials), [quality, materials]);
  const group = useRef<Group>(null);

  useEffect(() => () => disposeMeshes(Object.values(meshes)), [meshes]);
  useEffect(() => () => disposeMaterials(materials), [materials]);

  useFrame(({ clock }) => {
    const w = layerWeights(state.beat).slice;
    if (group.current) {
      group.current.visible = w > 0.002;
      group.current.scale.y = Math.max(w, 0.001);
    }
    materials.led.uniforms.uTime.value = clock.elapsedTime;
  });

  // The hall's work light lives in Atmosphere, so the light count is final from the first layer on.
  return (
    <group name="racks" ref={group} position-y={floorY(TOWER.hallFloor) + 0.03}>
      {Object.entries(meshes).map(([key, mesh]) => (
        <primitive key={key} object={mesh} />
      ))}
    </group>
  );
}
