import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mat } from "./materials";
import {
  BENCHES,
  DASHES,
  FOUNTAIN,
  LAMPS,
  LAWNS,
  PATHS,
  ROADS,
  TREES,
} from "./world";

const dummy = new THREE.Object3D();
const tint = new THREE.Color();

function GroundPatches() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 2]} receiveShadow material={mat.grass}>
        <planeGeometry args={[210, 210]} />
      </mesh>
      {LAWNS.map((lawn) => (
        <mesh
          key={`${lawn.x}-${lawn.z}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[lawn.x, 0.008, lawn.z]}
          receiveShadow
          material={mat.grassDark}
        >
          <planeGeometry args={[lawn.w, lawn.d]} />
        </mesh>
      ))}
      {ROADS.map((road) => (
        <mesh
          key={`r-${road.x}-${road.z}-${road.w}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[road.x, 0.02, road.z]}
          receiveShadow
          material={mat.road}
        >
          <planeGeometry args={[road.w, road.d]} />
        </mesh>
      ))}
      {PATHS.map((path) => (
        <mesh
          key={`p-${path.x}-${path.z}-${path.w}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[path.x, 0.04, path.z]}
          receiveShadow
          material={mat.path}
        >
          <planeGeometry args={[path.w, path.d]} />
        </mesh>
      ))}
    </group>
  );
}

function Markings() {
  const mesh = useMemo(() => {
    const geo = new THREE.BoxGeometry(1, 0.02, 1);
    const inst = new THREE.InstancedMesh(geo, mat.line, DASHES.length);
    const yellow = new THREE.InstancedMesh(geo, mat.yellow, DASHES.length);
    let whiteI = 0;
    let yellowI = 0;
    for (const dash of DASHES) {
      dummy.position.set(dash.x, 0.05, dash.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(dash.w, 1, dash.d);
      dummy.updateMatrix();
      if (dash.d > 1) {
        inst.setMatrixAt(whiteI, dummy.matrix);
        whiteI += 1;
      } else {
        yellow.setMatrixAt(yellowI, dummy.matrix);
        yellowI += 1;
      }
    }
    inst.count = whiteI;
    yellow.count = yellowI;
    inst.instanceMatrix.needsUpdate = true;
    yellow.instanceMatrix.needsUpdate = true;
    inst.frustumCulled = false;
    yellow.frustumCulled = false;
    return { inst, yellow, geo };
  }, []);
  useEffect(
    () => () => {
      mesh.geo.dispose();
      mesh.inst.dispose();
      mesh.yellow.dispose();
    },
    [mesh],
  );
  return (
    <group>
      <primitive object={mesh.inst} />
      <primitive object={mesh.yellow} />
    </group>
  );
}

function Trees() {
  const built = useMemo(() => {
    const broad = TREES.filter((t) => t.kind !== 1);
    const pines = TREES.filter((t) => t.kind === 1);
    const trunks = TREES.filter((t) => t.kind !== 2);
    const trunkGeo = new THREE.CylinderGeometry(0.22, 0.3, 1, 6);
    const ballGeo = new THREE.SphereGeometry(1, 8, 7);
    const coneGeo = new THREE.ConeGeometry(1, 1, 8);
    const trunkMesh = new THREE.InstancedMesh(trunkGeo, mat.trunk, Math.max(1, trunks.length));
    const ballMesh = new THREE.InstancedMesh(ballGeo, mat.leaf, Math.max(1, broad.length));
    const coneMesh = new THREE.InstancedMesh(coneGeo, mat.leaf, Math.max(1, pines.length));
    trunks.forEach((tree, i) => {
      const h = tree.kind === 1 ? 2.1 * tree.s : 1.7 * tree.s;
      dummy.position.set(tree.x, h / 2, tree.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(tree.s, h, tree.s);
      dummy.updateMatrix();
      trunkMesh.setMatrixAt(i, dummy.matrix);
    });
    broad.forEach((tree, i) => {
      const y = tree.kind === 2 ? 0.45 * tree.s : 1.7 * tree.s + 0.85 * tree.s;
      const r = tree.kind === 2 ? 0.55 * tree.s : 1.15 * tree.s;
      dummy.position.set(tree.x, y, tree.z);
      dummy.scale.set(r, tree.kind === 2 ? r * 0.7 : r, r);
      dummy.updateMatrix();
      ballMesh.setMatrixAt(i, dummy.matrix);
      tint.setHSL(0.28 + (i % 7) * 0.012, 0.48, tree.kind === 2 ? 0.24 : 0.32);
      ballMesh.setColorAt(i, tint);
    });
    pines.forEach((tree, i) => {
      dummy.position.set(tree.x, 2.1 * tree.s + 1.1 * tree.s, tree.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1.15 * tree.s, 2.4 * tree.s, 1.15 * tree.s);
      dummy.updateMatrix();
      coneMesh.setMatrixAt(i, dummy.matrix);
      tint.setHSL(0.3, 0.42, 0.26);
      coneMesh.setColorAt(i, tint);
    });
    for (const mesh of [trunkMesh, ballMesh, coneMesh]) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.frustumCulled = false;
      mesh.castShadow = false;
      mesh.receiveShadow = true;
    }
    return { trunkMesh, ballMesh, coneMesh };
  }, []);
  useEffect(
    () => () => {
      for (const mesh of [built.trunkMesh, built.ballMesh, built.coneMesh]) {
        mesh.geometry.dispose();
        mesh.dispose();
      }
    },
    [built],
  );
  return (
    <group>
      <primitive object={built.trunkMesh} />
      <primitive object={built.ballMesh} />
      <primitive object={built.coneMesh} />
    </group>
  );
}

function Benches() {
  return (
    <group>
      {BENCHES.map((bench) => (
        <group key={`${bench.x}-${bench.z}`} position={[bench.x, 0, bench.z]} rotation={[0, bench.yaw, 0]}>
          <mesh position={[0, 0.46, 0]} material={mat.stage} castShadow>
            <boxGeometry args={[1.6, 0.1, 0.46]} />
          </mesh>
          <mesh position={[0, 0.72, -0.18]} material={mat.stage} castShadow>
            <boxGeometry args={[1.6, 0.42, 0.08]} />
          </mesh>
          {[-0.65, 0.65].map((x) => (
            <mesh key={x} position={[x, 0.22, 0]} material={mat.metalDark}>
              <boxGeometry args={[0.08, 0.44, 0.4]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function Lamps() {
  const built = useMemo(() => {
    const pole = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.07, 0.1, 1, 6),
      mat.metalDark,
      LAMPS.length,
    );
    const bulb = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.18, 8, 6),
      mat.bulb,
      LAMPS.length,
    );
    LAMPS.forEach((lamp, i) => {
      dummy.position.set(lamp.x, 1.7, lamp.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 3.4, 1);
      dummy.updateMatrix();
      pole.setMatrixAt(i, dummy.matrix);
      dummy.position.set(lamp.x, 3.5, lamp.z);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      bulb.setMatrixAt(i, dummy.matrix);
    });
    pole.instanceMatrix.needsUpdate = true;
    bulb.instanceMatrix.needsUpdate = true;
    pole.frustumCulled = false;
    bulb.frustumCulled = false;
    return { pole, bulb };
  }, []);
  useEffect(
    () => () => {
      built.pole.geometry.dispose();
      built.bulb.geometry.dispose();
      built.pole.dispose();
      built.bulb.dispose();
    },
    [built],
  );
  return (
    <group>
      <primitive object={built.pole} />
      <primitive object={built.bulb} />
    </group>
  );
}

function Fountain() {
  const water = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const mesh = water.current;
    if (!mesh) return;
    const s = 1 + Math.sin(clock.elapsedTime * 2) * 0.025;
    mesh.scale.set(s, s, 1);
  });
  return (
    <group position={[FOUNTAIN.x, 0, FOUNTAIN.z]}>
      <mesh position={[0, 0.38, 0]} material={mat.concrete} receiveShadow castShadow>
        <cylinderGeometry args={[3.25, 3.5, 0.76, 28]} />
      </mesh>
      <mesh ref={water} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.8, 0]} material={mat.water}>
        <circleGeometry args={[2.95, 28]} />
      </mesh>
      <mesh position={[0, 1.55, 0]} material={mat.water}>
        <cylinderGeometry args={[0.16, 0.28, 1.5, 10]} />
      </mesh>
    </group>
  );
}

function Fence() {
  return (
    <group>
      <mesh position={[0, 0.8, 99]} material={mat.fence} castShadow>
        <boxGeometry args={[196, 1.6, 0.7]} />
      </mesh>
      <mesh position={[0, 0.8, -95]} material={mat.fence} castShadow>
        <boxGeometry args={[196, 1.6, 0.7]} />
      </mesh>
      <mesh position={[-98, 0.8, 2]} material={mat.fence} castShadow>
        <boxGeometry args={[0.7, 1.6, 194]} />
      </mesh>
      <mesh position={[98, 0.8, 2]} material={mat.fence} castShadow>
        <boxGeometry args={[0.7, 1.6, 194]} />
      </mesh>
    </group>
  );
}

export function Scenery() {
  return (
    <group>
      <GroundPatches />
      <Markings />
      <Trees />
      <Benches />
      <Lamps />
      <Fountain />
      <Fence />
    </group>
  );
}
