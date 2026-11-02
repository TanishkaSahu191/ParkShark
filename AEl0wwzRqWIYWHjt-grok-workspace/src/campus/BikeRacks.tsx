import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mat } from "./materials";
import { SLOTS, BIKE_SIGNS } from "./world";
import { Sign } from "./Sign";
import { useBikesStore } from "@/store/useBikesStore";
import { useSessionStore } from "@/store/useSessionStore";
import { subscribeToStands } from "@/services/standsService";
import { createLowPolyBicycleGeometry } from "./BicycleGeometry";

const COLS = 10;
const CELL_W = 384;
const CELL_H = 180;

// Deterministic QR matrix generator for stand placards
function generateQRGrid(standId: string) {
  const N = 25;
  const grid: boolean[][] = Array.from({ length: N }, () => Array(N).fill(false));

  const drawFinder = (r0: number, c0: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        grid[r0 + r][c0 + c] = isBorder || isCenter;
      }
    }
  };

  drawFinder(0, 0); // Top-left
  drawFinder(0, N - 7); // Top-right
  drawFinder(N - 7, 0); // Bottom-left

  // Timing patterns
  for (let i = 8; i < N - 8; i++) {
    grid[6][i] = i % 2 === 0;
    grid[i][6] = i % 2 === 0;
  }

  // Alignment pattern
  const ar0 = 16;
  const ac0 = 16;
  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) {
      const isBorder = Math.abs(r) === 2 || Math.abs(c) === 2;
      const isCenter = r === 0 && c === 0;
      grid[ar0 + r][ac0 + c] = isBorder || isCenter;
    }
  }

  let seed = 0;
  for (let i = 0; i < standId.length; i++) {
    seed = (seed * 31 + standId.charCodeAt(i)) >>> 0;
  }
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  const isReserved = (r: number, c: number) => {
    if (r < 9 && c < 9) return true;
    if (r < 9 && c >= N - 8) return true;
    if (r >= N - 8 && c < 9) return true;
    if (r === 6 || c === 6) return true;
    if (r >= 14 && r <= 18 && c >= 14 && c <= 18) return true;
    return false;
  };

  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (!isReserved(r, c)) {
        grid[r][c] = rand() > 0.48;
      }
    }
  }
  return grid;
}

function drawRoundedBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

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

  // Background sheet
  g.fillStyle = "#0b192c";
  g.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < labels.length; i++) {
    const label = labels[i] ?? "";
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = col * CELL_W;
    const y = row * CELL_H;

    const pad = 6;
    const cardW = CELL_W - pad * 2; // 372
    const cardH = CELL_H - pad * 2; // 168
    const cx0 = x + pad;
    const cy0 = y + pad;

    // 1. Crisp white placard body
    drawRoundedBox(g, cx0, cy0, cardW, cardH, 10);
    g.fillStyle = "#ffffff";
    g.fill();
    g.strokeStyle = "#cbd5e1";
    g.lineWidth = 1.5;
    g.stroke();

    // 2. Header Strip
    g.save();
    drawRoundedBox(g, cx0, cy0, cardW, 26, 10);
    g.clip();
    g.fillStyle = "#0a192f";
    g.fillRect(cx0, cy0, cardW, 26);
    g.fillStyle = "#f59e0b";
    g.fillRect(cx0, cy0 + 23, cardW, 3);
    g.restore();

    g.fillStyle = "#38bdf8";
    g.font = "bold 11px sans-serif";
    g.textAlign = "left";
    g.textBaseline = "middle";
    g.fillText("PARKSHARK SMART STAND", cx0 + 12, cy0 + 12);

    g.fillStyle = "#f59e0b";
    g.font = "bold 10px sans-serif";
    g.textAlign = "right";
    g.fillText("SCAN TO LOCK", cx0 + cardW - 12, cy0 + 12);

    // 3. QR CODE on the LEFT side of the stand placard
    const qrSize = 110;
    const qrX = cx0 + 12;
    const qrY = cy0 + 34;

    g.fillStyle = "#ffffff";
    g.fillRect(qrX - 3, qrY - 3, qrSize + 6, qrSize + 6);
    g.strokeStyle = "#94a3b8";
    g.lineWidth = 1;
    g.strokeRect(qrX - 3, qrY - 3, qrSize + 6, qrSize + 6);

    const grid = generateQRGrid(label);
    const modSize = qrSize / 25;
    g.fillStyle = "#000000";
    for (let r = 0; r < 25; r++) {
      for (let c = 0; c < 25; c++) {
        if (grid[r][c]) {
          g.fillRect(qrX + c * modSize, qrY + r * modSize, modSize + 0.15, modSize + 0.15);
        }
      }
    }

    // Small cyan center logo dot
    const centerSize = modSize * 5;
    const centerX = qrX + (qrSize - centerSize) / 2;
    const centerY = qrY + (qrSize - centerSize) / 2;
    g.fillStyle = "#0284c7";
    drawRoundedBox(g, centerX, centerY, centerSize, centerSize, 3);
    g.fill();
    g.fillStyle = "#ffffff";
    g.font = "bold 10px sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("P", centerX + centerSize / 2, centerY + centerSize / 2 + 1);

    // QR Helper caption
    g.fillStyle = "#64748b";
    g.font = "bold 9px sans-serif";
    g.textAlign = "center";
    g.fillText("STAND QR CODE", qrX + qrSize / 2, qrY + qrSize + 12);

    // 4. RIGHT SIDE: Stand Info & Building Details BESIDE the QR
    const infoX = qrX + qrSize + 18;
    const building = label.startsWith("AB1") ? "AB1" : label.startsWith("AB2") ? "AB2" : "AB3";

    // Building Section Pill
    g.fillStyle = "#e0f2fe";
    drawRoundedBox(g, infoX, cy0 + 34, 115, 20, 6);
    g.fill();
    g.strokeStyle = "#0284c7";
    g.lineWidth = 1;
    g.stroke();

    g.fillStyle = "#0284c7";
    g.font = "bold 10px sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(`${building} SECTION`, infoX + 57, cy0 + 44);

    // Stand ID (Large, bold, crisp monospace font)
    g.fillStyle = "#0f172a";
    g.font = "900 38px monospace, sans-serif";
    g.textAlign = "left";
    g.fillText(label, infoX, cy0 + 88);

    // Smart lock indicator
    g.fillStyle = "#10b981";
    g.beginPath();
    g.arc(infoX + 5, cy0 + 118, 4, 0, Math.PI * 2);
    g.fill();

    g.fillStyle = "#334155";
    g.font = "bold 11px sans-serif";
    g.textAlign = "left";
    g.fillText("Smart Electric Lock", infoX + 16, cy0 + 118);

    g.fillStyle = "#64748b";
    g.font = "10px sans-serif";
    g.fillText("Press E or Tap to scan", infoX, cy0 + 140);
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
    const plateGeo = new THREE.PlaneGeometry(0.85, 0.40);
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

    // Phase 6 Requirement 2: Low-poly bicycle instanced mesh
    const bicycleGeo = createLowPolyBicycleGeometry();
    const bicycleMat = new THREE.MeshStandardMaterial({
      roughness: 0.35,
      metalness: 0.45,
    });
    const bicycles = new THREE.InstancedMesh(bicycleGeo, bicycleMat, SLOTS.length);

    for (const mesh of [plates, backs, posts, bars, stands, bicycles]) {
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
      dummy.scale.set(0.89, 0.44, 0.045);
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

      // Bicycles start hidden (scale 0.0001) until stand is occupied
      dummy.position.set(0, -10, 0);
      dummy.scale.set(0.0001, 0.0001, 0.0001);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      bicycles.setMatrixAt(i, dummy.matrix);
    });

    for (let i = 0; i < SLOTS.length; i++) {
      dummy.position.set(0, -5, 0);
      dummy.scale.set(0.0001, 0.0001, 0.0001);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      posts.setMatrixAt(SLOTS.length * 2 + i, dummy.matrix);
    }

    for (const mesh of [plates, backs, posts, bars, stands, bicycles]) {
      mesh.instanceMatrix.needsUpdate = true;
    }

    return {
      tex,
      faceMat,
      backMat,
      plates,
      backs,
      posts,
      bars,
      stands,
      plateGeo,
      bicycles,
      bicycleGeo,
      bicycleMat,
    };
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
  const heatmapMode = useBikesStore((s) => s.heatmapMode);
  const standUsageCounts = useBikesStore((s) => s.standUsageCounts);
  const activeSession = useSessionStore((s) => s.activeSession);

  // Track previous status & selection per slot so ONLY changed instances update
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
      const isUserStand = activeSession?.standId === slot.id;
      const usage = standUsageCounts[slot.id] || 25;
      const key = `${heatmapMode ? "heat" : "norm"}-${status}-${isSelected ? "sel" : "norm"}-${isUserStand ? "user" : "other"}-${usage}`;

      if (prevColorKeys.current.get(slot.id) !== key) {
        prevColorKeys.current.set(slot.id, key);

        if (heatmapMode) {
          // Phase 7 Requirement 3: Heatmap mode color gradient (Blue -> Green -> Yellow -> Orange -> Red)
          const ratio = Math.max(0, Math.min(1, usage / 100));
          const col = new THREE.Color();
          if (ratio < 0.3) {
            col.lerpColors(new THREE.Color("#0284c7"), new THREE.Color("#10b981"), ratio / 0.3);
          } else if (ratio < 0.65) {
            col.lerpColors(new THREE.Color("#10b981"), new THREE.Color("#f59e0b"), (ratio - 0.3) / 0.35);
          } else {
            col.lerpColors(new THREE.Color("#f59e0b"), new THREE.Color("#ef4444"), (ratio - 0.65) / 0.35);
          }
          built.backs.setColorAt(i, col);
        } else {
          const col = isSelected
            ? colSelected
            : isUserStand
              ? new THREE.Color("#10b981") // User's stand highlighted
              : status === "occupied"
                ? colOccupied
                : status === "maintenance"
                  ? colMaintenance
                  : colAvailable;
          built.backs.setColorAt(i, col);
        }
        hasChanges = true;
      }
    });

    if (hasChanges && built.backs.instanceColor) {
      built.backs.instanceColor.needsUpdate = true;
    }
  }, [built.backs, standsData, selectedStandId, activeSession, heatmapMode, standUsageCounts]);

  // Phase 6 Requirement 2: Show bicycle model on occupied stands and highlight user's locked rack
  useEffect(() => {
    const colDefaultBike = new THREE.Color("#2563eb"); // Sleek university blue
    const colUserBike = new THREE.Color("#10b981");    // Radiant emerald green for user's bicycle

    SLOTS.forEach((slot, i) => {
      const stand = standsData.find((s) => s.id === slot.id);
      const isOccupied = stand?.status === "occupied";
      const isUserStand = activeSession?.standId === slot.id;

      if (isOccupied || isUserStand) {
        dummy.position.set(slot.x, 0.02, slot.z);
        dummy.rotation.set(0, slot.face === 1 ? 0 : Math.PI, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        built.bicycles.setMatrixAt(i, dummy.matrix);

        const bikeColor = isUserStand ? colUserBike : colDefaultBike;
        built.bicycles.setColorAt(i, bikeColor);
      } else {
        dummy.position.set(0, -10, 0);
        dummy.scale.set(0.0001, 0.0001, 0.0001);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        built.bicycles.setMatrixAt(i, dummy.matrix);
      }
    });

    built.bicycles.instanceMatrix.needsUpdate = true;
    if (built.bicycles.instanceColor) {
      built.bicycles.instanceColor.needsUpdate = true;
    }
  }, [built.bicycles, standsData, activeSession]);

  // Proximity-based slot label visibility
  const nearStatesRef = useRef<boolean[]>(new Array(SLOTS.length).fill(false));
  const tickRef = useRef(0);

  useFrame(() => {
    tickRef.current += 1;
    if (tickRef.current % 6 !== 0) return;

    const px = playerPosition.x;
    const pz = playerPosition.z;
    let matrixChanged = false;

    for (let i = 0; i < SLOTS.length; i++) {
      const slot = SLOTS[i];
      const dist = Math.hypot(slot.x - px, slot.z - pz);
      // Visible if within 22 meters OR if actively selected OR if it's the user's locked stand
      const isNear =
        dist < 22 || slot.id === selectedStandId || slot.id === activeSession?.standId;

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

  // Phase 6 Requirement 2: User's locked stand in 3D scene
  const userStandSlot = activeSession
    ? SLOTS.find((s) => s.id === activeSession.standId)
    : null;

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
      built.bicycleGeo.dispose();
      built.bicycleMat.dispose();
      built.plates.dispose();
      built.backs.dispose();
      built.posts.dispose();
      built.bars.dispose();
      built.stands.dispose();
      built.bicycles.dispose();
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
      <primitive object={built.bicycles} />

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

      {/* Phase 6 Requirement 2: 3D Scene Highlight for User's Locked Bicycle */}
      {userStandSlot && (
        <group position={[userStandSlot.x, 2.3, userStandSlot.z]}>
          {/* Downward beacon pointer */}
          <mesh rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.28, 0.62, 8]} />
            <meshStandardMaterial
              color="#10b981"
              emissive="#059669"
              emissiveIntensity={2.8}
              roughness={0.1}
            />
          </mesh>

          {/* Pulsing ring over the stand */}
          <mesh position={[0, -0.45, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.42, 0.62, 24]} />
            <meshBasicMaterial color="#34d399" side={THREE.DoubleSide} transparent opacity={0.85} />
          </mesh>

          {/* Point light illuminating the user's bike */}
          <pointLight color="#10b981" intensity={3.5} distance={8} />
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
