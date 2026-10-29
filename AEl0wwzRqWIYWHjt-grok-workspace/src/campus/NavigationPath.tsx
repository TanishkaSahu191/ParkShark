import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { sim } from "./sim";
import { useBikesStore } from "@/store/useBikesStore";

// Number of animated navigation chevron arrows
const MAX_CHEVRONS = 48;
const CHEVRON_SPACING = 2.4; // World units (meters) between chevrons
const DUMMY = new THREE.Object3D();

/**
 * Computes waypoints routing around central academic block AB2 if blocked
 */
function computeRoute(px: number, pz: number, tx: number, tz: number): [number, number][] {
  // AB2 bounding area with margin
  const ab2MinX = -18;
  const ab2MaxX = 18;
  const ab2MinZ = 24;
  const ab2MaxZ = 46;

  // Check if direct line between (px, pz) and (tx, tz) intersects AB2
  const crossesAB2Z = (pz > ab2MaxZ && tz < ab2MinZ) || (pz < ab2MinZ && tz > ab2MaxZ);
  const crossesAB2X = Math.min(px, tx) < ab2MaxX && Math.max(px, tx) > ab2MinX;

  if (crossesAB2Z && crossesAB2X) {
    // Choose east or west pedestrian walkway
    const useWest = px + tx < 0;
    const bypassX = useWest ? -26 : 26;
    const southZ = 50;
    const northZ = 20;

    if (pz > ab2MaxZ) {
      // Heading north
      return [
        [px, pz],
        [bypassX, southZ],
        [bypassX, northZ],
        [tx, tz],
      ];
    } else {
      // Heading south
      return [
        [px, pz],
        [bypassX, northZ],
        [bypassX, southZ],
        [tx, tz],
      ];
    }
  }

  return [
    [px, pz],
    [tx, tz],
  ];
}

export const NavigationPath: React.FC = () => {
  const { navigatingStandId, getStandById } = useBikesStore();
  const stand = navigatingStandId ? getStandById(navigatingStandId) : null;

  // Instanced mesh reference for animated ground arrows
  const chevronsRef = useRef<THREE.InstancedMesh>(null);
  const beaconGroupRef = useRef<THREE.Group>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const pinRef = useRef<THREE.Mesh>(null);
  const lineRef = useRef<THREE.Line>(null);

  // Chevron arrow geometry: a sleek extruded flat triangle/arrow
  const arrowGeo = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0.45);
    shape.lineTo(0.3, -0.3);
    shape.lineTo(0, -0.12);
    shape.lineTo(-0.3, -0.3);
    shape.closePath();

    const geo = new THREE.ShapeGeometry(shape);
    // Rotate to lie flat on the ground X-Z plane, pointing along -Z
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, []);

  const arrowMat = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: "#00d2ff",
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
  }, []);

  // Dashed line geometry & material
  const lineMat = useMemo(() => {
    return new THREE.LineDashedMaterial({
      color: "#38bdf8",
      dashSize: 1.2,
      gapSize: 0.6,
      linewidth: 3,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
    });
  }, []);

  const lineGeo = useMemo(() => {
    return new THREE.BufferGeometry();
  }, []);

  useFrame((state) => {
    if (!stand) return;

    const t = state.clock.elapsedTime;
    const tx = stand.position.x;
    const tz = stand.position.z;
    const px = sim.x;
    const pz = sim.z;

    // 1. Update Route & Ground Path Line
    const waypoints = computeRoute(px, pz, tx, tz);

    // Build line points slightly above ground (y = 0.08)
    const linePoints: THREE.Vector3[] = waypoints.map(([x, z]) => new THREE.Vector3(x, 0.08, z));
    lineGeo.setFromPoints(linePoints);
    if (lineRef.current) {
      lineRef.current.computeLineDistances();
    }

    // 2. Sample Polyline for Floating Arrows
    // Calculate total polyline length
    let totalDist = 0;
    const segLengths: number[] = [];
    for (let i = 0; i < waypoints.length - 1; i++) {
      const d = Math.hypot(
        waypoints[i + 1][0] - waypoints[i][0],
        waypoints[i + 1][1] - waypoints[i][1]
      );
      segLengths.push(d);
      totalDist += d;
    }

    // Function to interpolate along polyline by distance
    const getPointAtDist = (targetDist: number): { x: number; z: number; angle: number } => {
      let accumulated = 0;
      for (let i = 0; i < segLengths.length; i++) {
        const segLen = segLengths[i];
        if (accumulated + segLen >= targetDist || i === segLengths.length - 1) {
          const remain = targetDist - accumulated;
          const ratio = segLen > 0.0001 ? Math.min(1, Math.max(0, remain / segLen)) : 0;
          const x0 = waypoints[i][0];
          const z0 = waypoints[i][1];
          const x1 = waypoints[i + 1][0];
          const z1 = waypoints[i + 1][1];

          const curX = x0 + (x1 - x0) * ratio;
          const curZ = z0 + (z1 - z0) * ratio;
          // Angle in radians facing forward along segment
          const angle = Math.atan2(x1 - x0, z1 - z0);
          return { x: curX, z: curZ, angle };
        }
        accumulated += segLen;
      }
      return { x: tx, z: tz, angle: 0 };
    };

    // Animate chevrons streaming forward
    if (chevronsRef.current) {
      const speed = 2.8; // m/s animation speed
      const offset = (t * speed) % CHEVRON_SPACING;

      let arrowIdx = 0;
      for (let d = offset; d < totalDist - 1.2 && arrowIdx < MAX_CHEVRONS; d += CHEVRON_SPACING) {
        const { x, z, angle } = getPointAtDist(d);
        // Position chevron slightly above ground
        DUMMY.position.set(x, 0.09, z);
        DUMMY.rotation.set(0, angle + Math.PI, 0); // Orient forward along path
        // Gentle hover scale
        const scale = Math.min(1, d / 2) * Math.min(1, (totalDist - d) / 2);
        DUMMY.scale.set(scale, scale, scale);
        DUMMY.updateMatrix();

        chevronsRef.current.setMatrixAt(arrowIdx, DUMMY.matrix);
        arrowIdx++;
      }

      // Hide unused instances
      for (let i = arrowIdx; i < MAX_CHEVRONS; i++) {
        DUMMY.scale.set(0.0001, 0.0001, 0.0001);
        DUMMY.updateMatrix();
        chevronsRef.current.setMatrixAt(i, DUMMY.matrix);
      }
      chevronsRef.current.instanceMatrix.needsUpdate = true;
    }

    // 3. Pulsing Destination Marker & Beacon
    if (beaconGroupRef.current) {
      beaconGroupRef.current.position.set(tx, 0, tz);
    }

    // Floating 3D pin rotation and bobbing
    if (pinRef.current) {
      pinRef.current.position.y = 2.6 + Math.sin(t * 3.5) * 0.28;
      pinRef.current.rotation.y = t * 1.8;
    }

    // Ground ripple rings
    if (ring1Ref.current) {
      const phase1 = (t * 0.9) % 1;
      const s1 = 0.4 + phase1 * 2.2;
      ring1Ref.current.scale.set(s1, s1, 1);
      (ring1Ref.current.material as THREE.MeshBasicMaterial).opacity = (1 - phase1) * 0.8;
    }
    if (ring2Ref.current) {
      const phase2 = (t * 0.9 + 0.5) % 1;
      const s2 = 0.4 + phase2 * 2.2;
      ring2Ref.current.scale.set(s2, s2, 1);
      (ring2Ref.current.material as THREE.MeshBasicMaterial).opacity = (1 - phase2) * 0.8;
    }
  });

  if (!stand) return null;

  return (
    <group>
      {/* 1. Ground Path Dashed Guide Line */}
      <primitive object={new THREE.Line(lineGeo, lineMat)} ref={lineRef} />

      {/* 2. Streaming Floating Chevron Arrows */}
      <instancedMesh
        ref={chevronsRef}
        args={[arrowGeo, arrowMat, MAX_CHEVRONS]}
        renderOrder={10}
      />

      {/* 3. Pulsing Marker & Sky Beacon above Destination Rack */}
      <group ref={beaconGroupRef}>
        {/* Sky Light Beam (vertical cylinder reaching 22m upwards) */}
        <mesh position={[0, 11, 0]}>
          <cylinderGeometry args={[0.22, 0.35, 22, 16, 1, true]} />
          <meshBasicMaterial
            color="#38bdf8"
            transparent
            opacity={0.38}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        {/* Floating 3D Destination Pin (Inverted Cone + Sphere Crown) */}
        <group ref={pinRef}>
          <mesh position={[0, 0, 0]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.36, 0.72, 8]} />
            <meshStandardMaterial
              color="#0284c7"
              emissive="#38bdf8"
              emissiveIntensity={1.8}
              roughness={0.2}
            />
          </mesh>
          <mesh position={[0, 0.38, 0]}>
            <sphereGeometry args={[0.22, 16, 16]} />
            <meshStandardMaterial
              color="#38bdf8"
              emissive="#0284c7"
              emissiveIntensity={1.6}
            />
          </mesh>
        </group>

        {/* Concentric Ground Pulsing Rings */}
        <mesh ref={ring1Ref} position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.65, 0.85, 32]} />
          <meshBasicMaterial
            color="#38bdf8"
            transparent
            opacity={0.8}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>

        <mesh ref={ring2Ref} position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.65, 0.85, 32]} />
          <meshBasicMaterial
            color="#0ea5e9"
            transparent
            opacity={0.8}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>

        {/* Point light illuminating the rack ground */}
        <pointLight position={[0, 2, 0]} color="#38bdf8" intensity={3.5} distance={7} />
      </group>
    </group>
  );
};
