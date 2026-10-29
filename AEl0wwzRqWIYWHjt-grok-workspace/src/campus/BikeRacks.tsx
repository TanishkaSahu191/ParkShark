import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mat } from "./materials";
import { SLOTS, BIKE_SIGNS } from "./world";
import { Sign } from "./Sign";
import { useBikesStore } from "@/store/useBikesStore";
import { subscribeToStands } from "@/services/standsService";

const COLS = 10;
const CELL_W = 256;
const CELL_H = 112;

function makeAtlas(labels: string[]) {
  const rows = Math.ceil(labels.length / COLS);
  const canvas = document.createElement("canvas");
  canvas.width = COLS * CELL_W;
  canvas.height = rows * CELL_H;
  const g = canvas.getContext("2d");
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  if (!g) return { tex, rows };
  g.fillStyle = "#142033";
  g.fillRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < labels.length; i++) {
    const label = labels[i] ?? "";
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = col * CELL_W;
    const y = row * CELL_H;
    g.fillStyle = "#f4efe4";
    g.fillRect(x + 8, y + 8, CELL_W - 16, CELL_H - 16);
    g.fillStyle = "#d4a017";
    g.fillRect(x + 8, y + 8, CELL_W - 16, 10);
    g.fillStyle = "#142033";
    g.textAlign = "center";
    g.textBaseline = "middle";
    let size = 62;
    do {
      g.font = `700 ${size}px sans-serif`;
      if (g.measureText(label).width <= CELL_W - 36) break;
      size -= 2;
    } while (size > 28);
    g.fillText(label, x + CELL_W / 2, y + CELL_H / 2 + 6);
  }
  tex.needsUpdate = true;
  return { tex, rows };
}

const dummy = new THREE.Object3D();

export function BikeRacks() {
  const built = useMemo(() => {
    const { tex, rows } = makeAtlas(SLOTS.map((s) => s.id));
    const texW = COLS * CELL_W;
    const texH = rows * CELL_H;
    const plateGeo = new THREE.PlaneGeometry(0.8, 0.38);
    const uvRect = new THREE.InstancedBufferAttribute(new Float32Array(SLOTS.length * 4), 4);
    for (let i = 0; i < SLOTS.length; i++) {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const u0 = (col * CELL_W) / texW;
      const uSize = CELL_W / texW;
      const vSize = CELL_H / texH;
      const v0 = 1 - ((row + 1) * CELL_H) / texH;
      uvRect.setXYZW(i, u0, v0, uSize, vSize);
    }
    plateGeo.setAttribute("uvRect", uvRect);

    const faceMat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
    faceMat.customProgramCacheKey = () => "bike-slot-atlas";
    faceMat.polygonOffset = true;
    faceMat.polygonOffsetFactor = -2;
    faceMat.polygonOffsetUnits = -2;
    faceMat.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <uv_pars_vertex>",
          "#include <uv_pars_vertex>\nattribute vec4 uvRect;\nvarying vec4 vUvRect;\n",
        )
        .replace("#include <uv_vertex>", "#include <uv_vertex>\nvUvRect = uvRect;\n");
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <uv_pars_fragment>",
          "#include <uv_pars_fragment>\nvarying vec4 vUvRect;\n",
        )
        .replace(
          "#include <map_fragment>",
          `#ifdef USE_MAP
            vec2 atlasUv = vUvRect.xy + vMapUv * vUvRect.zw;
            vec4 sampledDiffuseColor = texture2D(map, atlasUv);
            diffuseColor *= sampledDiffuseColor;
          #endif`,
        );
    };

    const backMat = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.2 });
    const plates = new THREE.InstancedMesh(plateGeo, faceMat, SLOTS.length);
    const backs = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      backMat,
      SLOTS.length,
    );
    const posts = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.034, 0.034, 1, 7),
      mat.metal,
      SLOTS.length * 3,
    );
    const bars = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.03, 0.03, 1, 7),
      mat.metal,
      SLOTS.length,
    );
    const stands = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.028, 0.028, 1, 6),
      mat.metalDark,
      SLOTS.length,
    );

    for (const mesh of [plates, backs, posts, bars, stands]) {
      mesh.frustumCulled = false;
      mesh.castShadow = false;
      mesh.receiveShadow = true;
    }

    SLOTS.forEach((slot, i) => {
      const plateZ = slot.z + slot.face * 0.42;
      const rotY = slot.face === 1 ? 0 : Math.PI;

      // Requirement 3: Slot number labels start scaled to 0 (hidden) until player is near
      dummy.position.set(slot.x, 1.12, plateZ);
      dummy.rotation.set(0, rotY, 0);
      dummy.scale.set(0.0001, 0.0001, 0.0001);
      dummy.updateMatrix();
      plates.setMatrixAt(i, dummy.matrix);

      dummy.position.set(slot.x, 1.12, plateZ - slot.face * 0.03);
      dummy.scale.set(0.84, 0.42, 0.045);
      dummy.updateMatrix();
      backs.setMatrixAt(i, dummy.matrix);

      dummy.scale.set(1, 0.86, 1);
      dummy.rotation.set(0, 0, 0);
      dummy.position.set(slot.x - 0.2, 0.43, slot.z);
      dummy.updateMatrix();
      posts.setMatrixAt(i * 2, dummy.matrix);
      dummy.position.set(slot.x + 0.2, 0.43, slot.z);
      dummy.updateMatrix();
      posts.setMatrixAt(i * 2 + 1, dummy.matrix);

      dummy.position.set(slot.x, 0.56, plateZ);
      dummy.scale.set(1, 1.12, 1);
      dummy.updateMatrix();
      stands.setMatrixAt(i, dummy.matrix);

      dummy.position.set(slot.x, 0.86, slot.z);
      dummy.rotation.set(0, 0, Math.PI / 2);
      dummy.scale.set(1, 0.48, 1);
      dummy.updateMatrix();
      bars.setMatrixAt(i, dummy.matrix);
    });

    for (let i = 0; i < SLOTS.length; i++) {
      dummy.position.set(0, -5, 0);
      dummy.scale.set(0.0001, 0.0001, 0.0001);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      posts.setMatrixAt(SLOTS.length * 2 + i, dummy.matrix);
    }

    for (const mesh of [plates, backs, posts, bars, stands]) {
      mesh.instanceMatrix.needsUpdate = true;
    }

    return { tex, faceMat, backMat, plates, backs, posts, bars, stands, plateGeo };
  }, []);

  // Real-time Firestore subscription on mount
  useEffect(() => {
    const unsubscribe = subscribeToStands();
    return () => unsubscribe();
  }, []);

  const standsData = useBikesStore((s) => s.stands);
  const selectedStandId = useBikesStore((s) => s.selectedStandId);
  const playerPosition = useBikesStore((s) => s.playerPosition);
  const selectStand = useBikesStore((s) => s.selectStand);

  // Track previous status & selection per slot so ONLY changed instances update (Requirement 3)
  const prevColorKeys = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    const colAvailable = new THREE.Color("#16a34a");
    const colOccupied = new THREE.Color("#dc2626");
    const colMaintenance = new THREE.Color("#6b7280");
    const colSelected = new THREE.Color("#38bdf8"); // Glowing cyan highlight for selected stand

    let hasChanges = false;

    SLOTS.forEach((slot, i) => {
      const stand = standsData.find((s) => s.id === slot.id);
      const status = stand?.status || "available";
      const isSelected = slot.id === selectedStandId;
      const key = `${status}-${isSelected ? "sel" : "norm"}`;

      if (prevColorKeys.current.get(slot.id) !== key) {
        prevColorKeys.current.set(slot.id, key);
        const col = isSelected
          ? colSelected
          : status === "occupied"
            ? colOccupied
            : status === "maintenance"
              ? colMaintenance
              : colAvailable;
        built.backs.setColorAt(i, col);
        hasChanges = true;
      }
    });

    if (hasChanges && built.backs.instanceColor) {
      built.backs.instanceColor.needsUpdate = true;
    }
  }, [built.backs, standsData, selectedStandId]);

  // Proximity-based slot label visibility (Requirement 3: "Show the slot number label only when near")
  const nearStatesRef = useRef<boolean[]>(new Array(SLOTS.length).fill(false));
  const tickRef = useRef(0);

  useFrame(() => {
    // Throttled to run every 6 frames for performance
    tickRef.current += 1;
    if (tickRef.current % 6 !== 0) return;

    const px = playerPosition.x;
    const pz = playerPosition.z;
    let matrixChanged = false;

    for (let i = 0; i < SLOTS.length; i++) {
      const slot = SLOTS[i];
      const dist = Math.hypot(slot.x - px, slot.z - pz);
      // Visible if within 10 meters OR if actively selected
      const isNear = dist < 10.5 || slot.id === selectedStandId;

      if (isNear !== nearStatesRef.current[i]) {
        nearStatesRef.current[i] = isNear;
        const plateZ = slot.z + slot.face * 0.42;
        const rotY = slot.face === 1 ? 0 : Math.PI;

        dummy.position.set(slot.x, 1.12, plateZ);
        dummy.rotation.set(0, rotY, 0);
        if (isNear) {
          dummy.scale.set(1, 1, 1);
        } else {
          dummy.scale.set(0.0001, 0.0001, 0.0001);
        }
        dummy.updateMatrix();
        built.plates.setMatrixAt(i, dummy.matrix);
        matrixChanged = true;
      }
    }

    if (matrixChanged) {
      built.plates.instanceMatrix.needsUpdate = true;
    }
  });

  // Selected stand 3D highlight beacon
  const selectedStand = standsData.find((s) => s.id === selectedStandId);

  // Click on back plate to select stand
  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    if (e.instanceId !== undefined && e.instanceId < SLOTS.length) {
      const slot = SLOTS[e.instanceId];
      if (slot) {
        selectStand(slot.id);
      }
    }
  };

  useEffect(
    () => () => {
      built.tex.dispose();
      built.faceMat.dispose();
      built.backMat.dispose();
      built.plateGeo.dispose();
      built.plates.geometry.dispose();
      built.backs.geometry.dispose();
      built.posts.geometry.dispose();
      built.bars.geometry.dispose();
      built.stands.geometry.dispose();
      built.plates.dispose();
      built.backs.dispose();
      built.posts.dispose();
      built.bars.dispose();
      built.stands.dispose();
    },
    [built],
  );

  return (
    <group>
      <primitive object={built.plates} />
      <primitive object={built.backs} onPointerDown={handlePointerDown} />
      <primitive object={built.posts} />
      <primitive object={built.bars} />
      <primitive object={built.stands} />

      {/* 3D Highlight Beacon for Selected Stand */}
      {selectedStand && (
        <group position={[selectedStand.position.x, 2.2, selectedStand.position.z]}>
          <mesh rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.26, 0.55, 6]} />
            <meshStandardMaterial
              color="#38bdf8"
              emissive="#0284c7"
              emissiveIntensity={1.4}
              roughness={0.2}
            />
          </mesh>
          <pointLight color="#38bdf8" intensity={2.5} distance={6} />
        </group>
      )}

      {BIKE_SIGNS.map((sign) => (
        <Sign
          key={sign.code}
          title={sign.title}
          subtitle={sign.subtitle}
          position={[sign.x, 2.5, sign.z]}
          width={6.4}
        />
      ))}
    </group>
  );
}
