"use client";

import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

/*
 * The polished-steel Switchblade compass star, rotating in 3D.
 * Ported from the brand site's Star3D (react-three-fiber) with the same
 * material, lights and "sunset" environment, but without the helper library
 * (drei), and with the HDR self-hosted rather than fetched from drei's CDN.
 * The model is meshopt-compressed; the decoder ships with three.
 */

const MODEL_URL = "/models/compass.glb";
/** drei's "sunset" preset (Poly Haven, CC0). Its reflections give the steel its look. */
const ENVIRONMENT_URL = "/hdri/venice_sunset_1k.hdr";

const ENTRANCE_SECONDS = 1.15;
/** Radians per second of the slow ambient turn. */
const SPIN_SPEED = 0.25;

type StarProps = {
  /** Height of the star in scene units (the camera frames ~4.8 units). */
  scale: number;
  reducedMotion: boolean;
  onReady?: () => void;
};

function StarModel({ scale, reducedMotion, onReady }: StarProps) {
  const group = useRef<THREE.Group>(null);
  const elapsed = useRef(0);
  const spin = useRef(0);
  const gltf = useLoader(GLTFLoader, MODEL_URL, (loader) => {
    loader.setMeshoptDecoder(MeshoptDecoder);
  });

  // Polished steel, normalised to 1 unit tall and centred on the origin.
  const model = useMemo(() => {
    const clone = gltf.scene.clone(true);
    const steel = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#B8C0CE"),
      metalness: 0.97,
      roughness: 0.05,
      clearcoat: 0.6,
      clearcoatRoughness: 0.04,
      envMapIntensity: 2.4,
      side: THREE.DoubleSide,
    });
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) (child as THREE.Mesh).material = steel;
    });
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const s = 1 / (size.y || 1);
    clone.scale.setScalar(s);
    clone.position.set(-center.x * s, -center.y * s, -center.z * s);
    return clone;
  }, [gltf]);

  useEffect(() => {
    onReady?.();
  }, [onReady]);

  useFrame((_state, delta) => {
    const g = group.current;
    if (!g) return;
    if (reducedMotion) {
      g.scale.setScalar(scale);
      g.rotation.y = 0;
      return;
    }
    // Accumulate delta rather than reading the clock: the clock restarts from 0
    // when the canvas resumes after scrolling back into view, replaying the intro.
    elapsed.current += delta;
    // Entrance: grow in while settling from a half-turn, easeOutCubic.
    const p = Math.min(elapsed.current / ENTRANCE_SECONDS, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    // The ambient spin starts only once settled, so it always begins front-facing.
    if (p >= 1) spin.current += SPIN_SPEED * delta;
    g.rotation.y = spin.current + (1 - eased) * Math.PI * 0.6;
    g.scale.setScalar(scale * (0.05 + eased * 0.95));
  });

  return (
    <group ref={group} scale={0.001}>
      <primitive object={model} />
    </group>
  );
}

/** Image-based lighting for the steel: the reflections it shows. */
function SunsetEnvironment() {
  const texture = useLoader(HDRLoader, ENVIRONMENT_URL);
  // Attached to the scene as scene.environment.
  return (
    <primitive
      object={texture}
      attach="environment"
      mapping={THREE.EquirectangularReflectionMapping}
    />
  );
}

export type Star3DProps = {
  scale?: number;
  cameraZ?: number;
  fov?: number;
  /** Render continuously; set false to pause (e.g. when scrolled off screen). */
  active?: boolean;
  reducedMotion?: boolean;
  onReady?: () => void;
  className?: string;
};

export default function Star3D({
  scale = 4.6,
  cameraZ = 5.9,
  fov = 44,
  active = true,
  reducedMotion = false,
  onReady,
  className,
}: Star3DProps) {
  return (
    <Canvas
      className={className}
      camera={{ position: [0, 0, cameraZ], fov }}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      dpr={[1, 2]}
      // Paused frames cost nothing; reduced motion only needs to draw on change.
      frameloop={!active ? "never" : reducedMotion ? "demand" : "always"}
      style={{ pointerEvents: "none" }}
      aria-hidden
    >
      <ambientLight intensity={0.4} />
      <directionalLight position={[4, 8, 4]} intensity={2.4} color="#FFFFFF" />
      <directionalLight
        position={[-4, -4, -4]}
        intensity={1.2}
        color="#7090FF"
      />
      <Suspense fallback={null}>
        <SunsetEnvironment />
        <StarModel
          scale={scale}
          reducedMotion={reducedMotion}
          onReady={onReady}
        />
      </Suspense>
    </Canvas>
  );
}
