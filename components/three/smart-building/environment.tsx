"use client";

import { ContactShadows, Environment, EnvironmentPortal, Lightformer } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  BufferAttribute,
  BufferGeometry,
  CircleGeometry,
  Fog,
  Mesh,
  Points,
  PointsMaterial,
  SphereGeometry,
  Object3D,
  type Color,
  type PointLight,
  type SpotLight,
} from "three";

import { useScene } from "./context";
import { KEY_DIR, RIM_DIR, createGroundMaterial, createSkyMaterial } from "./materials";
import { random } from "./math";
import { layerWeights } from "./timeline";
import { TOWER, floorY } from "./tower";

/**
 * Image-based lighting. Desktop: the theme's Poly Haven HDRI (night: Rooftop Night, dusk: Qwantani
 * Dusk 2) rendered once into a cube map, with the brand's red rim strip added on top so glass and
 * metal still catch a red edge. Mobile/low, or until the HDRI arrives: Lightformers only.
 * Night: a moonlit sky band, warm city glow on the horizon, a red rim strip behind the tower.
 * Dusk: a low warm sunset, a pale sky dome, the same red rim at lower strength.
 */
function Lighting() {
  const { quality, palette, environment } = useScene();
  const red = `#${palette.primary.getHexString()}`;
  if (environment) {
    return (
      <EnvironmentPortal
        key={palette.dark ? "night-hdri" : "dusk-hdri"}
        map={environment}
        resolution={quality.envResolution}
        frames={1}
        environmentIntensity={palette.dark ? 0.4 : 0.9}
      >
        <Lightformer form="rect" intensity={palette.dark ? 1.2 : 2} color={red} scale={[2, 16, 1]} position={[22, 7, -14]} target={[0, 7, 0]} />
      </EnvironmentPortal>
    );
  }
  return palette.dark ? (
    <Environment key="night" resolution={quality.envResolution} frames={1} environmentIntensity={0.75}>
      <color attach="background" args={["#06070a"]} />
      <Lightformer form="rect" intensity={0.9} color="#aab8ff" scale={[50, 10, 1]} position={[0, 18, -30]} target={[0, 4, 0]} />
      <Lightformer form="rect" intensity={1.4} color="#ffcf9e" scale={[70, 2, 1]} position={[0, 1.5, 32]} target={[0, 3, 0]} />
      <Lightformer form="rect" intensity={1.2} color={red} scale={[2, 16, 1]} position={[22, 7, -14]} target={[0, 7, 0]} />
      <Lightformer form="circle" intensity={0.6} color="#dfe6ff" scale={8} position={[0, 30, 0]} rotation-x={Math.PI / 2} />
    </Environment>
  ) : (
    <Environment key="dusk" resolution={quality.envResolution} frames={1} environmentIntensity={1}>
      <color attach="background" args={["#efe5df"]} />
      <Lightformer form="rect" intensity={3.2} color="#ffb48a" scale={[60, 7, 1]} position={[-30, 3, -22]} target={[0, 4, 0]} />
      <Lightformer form="rect" intensity={1.5} color="#e8eeff" scale={[90, 90, 1]} position={[0, 40, 0]} rotation-x={Math.PI / 2} />
      <Lightformer form="rect" intensity={0.9} color="#fff3e8" scale={[50, 12, 1]} position={[0, 8, 36]} target={[0, 5, 0]} />
      <Lightformer form="rect" intensity={2} color={red} scale={[3, 20, 1]} position={[22, 6, -14]} target={[0, 6, 0]} />
    </Environment>
  );
}

/** Sky, ground, stars, image-based light, sun/moon and rim lights, contact shadows and fog. */
export function Atmosphere() {
  const { state, quality, palette } = useScene();
  const scene = useThree((s) => s.scene);
  const rim = useRef<SpotLight>(null);
  const work = useRef<PointLight>(null);
  const rimTarget = useMemo(() => {
    const target = new Object3D();
    target.position.set(0, 7, 0);
    return target;
  }, []);

  const objects = useMemo(() => {
    const sky = new Mesh(new SphereGeometry(420, 32, 16), createSkyMaterial());
    sky.frustumCulled = false;
    sky.renderOrder = -1;
    const ground = new Mesh(new CircleGeometry(260, 48).rotateX(-Math.PI / 2), createGroundMaterial());

    const rand = random(71);
    const positions = new Float32Array(quality.stars * 3);
    for (let i = 0; i < quality.stars; i++) {
      const theta = Math.acos(0.08 + rand() * 0.92);
      const phi = rand() * Math.PI * 2;
      positions.set([Math.sin(theta) * Math.cos(phi) * 380, Math.cos(theta) * 380, Math.sin(theta) * Math.sin(phi) * 380], i * 3);
    }
    const starGeo = new BufferGeometry();
    starGeo.setAttribute("position", new BufferAttribute(positions, 3));
    const stars = new Points(
      starGeo,
      new PointsMaterial({ size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.6, fog: false, depthWrite: false }),
    );
    return { sky, ground, stars };
  }, [quality]);

  useEffect(
    () => () => {
      for (const o of Object.values(objects)) {
        o.geometry.dispose();
        o.material.dispose();
      }
    },
    [objects],
  );

  useEffect(() => {
    scene.fog = new Fog(palette.horizon, palette.fogNear, palette.fogFar);
    const sky = objects.sky.material.uniforms;
    (sky.uTop.value as Color).copy(palette.skyTop);
    (sky.uHorizon.value as Color).copy(palette.horizon);
    (sky.uHaze.value as Color).copy(palette.haze);
    const ground = objects.ground.material.uniforms;
    (ground.uBase.value as Color).copy(palette.ground);
    (ground.uLine.value as Color).copy(palette.groundLine);
    (ground.uPrimary.value as Color).copy(palette.primary);
    (ground.uGlow.value as Color).copy(palette.glow);
    ground.uEmissive.value = palette.emissive;
    objects.stars.visible = palette.stars;
    return () => {
      scene.fog = null;
    };
  }, [palette, objects, scene]);

  useFrame(({ clock }) => {
    const network = layerWeights(state.beat).network;
    // Open the fog up as the camera pulls out over the city.
    if (scene.fog instanceof Fog) scene.fog.far = palette.fogFar * (1 + network * 0.7);
    // Inside the opened data hall the rim-light would wash the room red; let it fall away.
    const slice = layerWeights(state.beat).slice;
    if (rim.current) rim.current.intensity = palette.rimIntensity * (1 - slice);
    if (work.current) work.current.intensity = slice * 3.5;
    const ground = objects.ground.material.uniforms;
    ground.uNetwork.value = network;
    ground.uTime.value = clock.elapsedTime;
  });

  return (
    <>
      <Lighting />
      <primitive object={objects.sky} />
      <primitive object={objects.ground} />
      <primitive object={objects.stars} />
      <hemisphereLight color={palette.hemiSky} groundColor={palette.hemiGround} intensity={palette.hemiIntensity} />
      <directionalLight position={KEY_DIR.clone().multiplyScalar(30)} color={palette.key} intensity={palette.keyIntensity} />
      {/* Red rim-light: a narrow spot from behind the tower, so it edges the tower and not the whole city. */}
      <spotLight
        ref={rim}
        position={RIM_DIR.clone().multiplyScalar(30).setY(14)}
        color={palette.primary}
        intensity={palette.rimIntensity}
        angle={0.3}
        penumbra={0.7}
        decay={0}
        target={rimTarget}
      />
      <primitive object={rimTarget} />
      {/* The data hall's work light. Mounted here, with the other lights, and never hidden: every
          lit shader is built for the light count, so a light that arrived with the hall layer (or
          dropped out while the hall is closed) would rebuild all of them. */}
      <pointLight ref={work} position={[0, floorY(TOWER.hallFloor) + 0.59, 0]} distance={3} decay={1.2} intensity={0} color="#eef3ff" />
      {/* Grounds the podium and poles; drawn once (nothing near the ground moves). Desktop only:
          its depth and blur shaders cost ~100 ms of start-up on a throttled phone. */}
      {quality.tier === "desktop" && (
        <ContactShadows
          position={[0, 0.004, 0]}
          scale={14}
          resolution={quality.contactShadowResolution}
          blur={2.4}
          far={2.5}
          opacity={palette.dark ? 0.8 : 0.5}
          frames={1}
        />
      )}
    </>
  );
}
