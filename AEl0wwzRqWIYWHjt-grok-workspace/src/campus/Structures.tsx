import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { colored, mat } from "./materials";
import { Sign } from "./Sign";
import {
  AUD,
  BLOCKS,
  CARS,
  GATE_Z,
  PARKING,
  SOUTH_FACE,
  type Block,
} from "./world";

const dummy = new THREE.Object3D();
const color = new THREE.Color();

type Win = {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  glass: string;
};

function entrance(b: Block, outset: number, y: number) {
  if (b.entrance === "+z") return { x: b.x, y, z: b.z + b.d / 2 + outset, yaw: 0, axis: "z" as const };
  if (b.entrance === "-z") return { x: b.x, y, z: b.z - b.d / 2 - outset, yaw: Math.PI, axis: "z" as const };
  if (b.entrance === "+x") return { x: b.x + b.w / 2 + outset, y, z: b.z, yaw: Math.PI / 2, axis: "x" as const };
  return { x: b.x - b.w / 2 - outset, y, z: b.z, yaw: -Math.PI / 2, axis: "x" as const };
}

function pushFacade(
  out: Win[],
  along0: number,
  along1: number,
  fixed: number,
  vertical: "x" | "z",
  sign: number,
  floors: number,
  height: number,
  glass: string,
  door: boolean,
) {
  const length = Math.abs(along1 - along0);
  const dir = along1 >= along0 ? 1 : -1;
  const cols = Math.max(2, Math.floor(length / 2.2));
  const floorH = (height - 1.5) / floors;
  for (let f = 0; f < floors; f++) {
    for (let c = 0; c < cols; c++) {
      const along = along0 + dir * ((c + 0.5) / cols) * length;
      const mid = (along0 + along1) / 2;
      if (door && f === 0 && Math.abs(along - mid) < 1.4) continue;
      const y = 1.45 + f * floorH + floorH * 0.28;
      const sy = Math.min(1.35, floorH * 0.52);
      const span = Math.min(1.2, (length / cols) * 0.58);
      if (vertical === "z") {
        out.push({ x: along, y, z: fixed + sign * 0.09, sx: span, sy, sz: 0.08, glass });
      } else {
        out.push({ x: fixed + sign * 0.09, y, z: along, sx: 0.08, sy, sz: span, glass });
      }
    }
  }
}

function buildWindows() {
  const out: Win[] = [];
  for (const b of BLOCKS) {
    const x0 = b.x - b.w / 2 + 0.7;
    const x1 = b.x + b.w / 2 - 0.7;
    const z0 = b.z - b.d / 2 + 0.7;
    const z1 = b.z + b.d / 2 - 0.7;
    pushFacade(out, x0, x1, b.z + b.d / 2, "z", 1, b.floors, b.h, b.glass, b.entrance === "+z");
    pushFacade(out, x0, x1, b.z - b.d / 2, "z", -1, b.floors, b.h, b.glass, b.entrance === "-z");
    pushFacade(out, z0, z1, b.x + b.w / 2, "x", 1, b.floors, b.h, b.glass, b.entrance === "+x");
    pushFacade(out, z0, z1, b.x - b.w / 2, "x", -1, b.floors, b.h, b.glass, b.entrance === "-x");
    if (b.tower > 0) {
      const tw = 12;
      const upperFloors = 3;
      const base = b.h;
      const extra = b.tower - b.h;
      const floorH = extra / upperFloors;
      for (let f = 0; f < upperFloors; f++) {
        const y = base + f * floorH + floorH * 0.55;
        for (const [x, z, sx, sz] of [
          [b.x, b.z + tw / 2 + 0.08, 1.3, 0.08],
          [b.x, b.z - tw / 2 - 0.08, 1.3, 0.08],
          [b.x + tw / 2 + 0.08, b.z, 0.08, 1.3],
          [b.x - tw / 2 - 0.08, b.z, 0.08, 1.3],
        ] as const) {
          out.push({ x, y, z, sx, sy: floorH * 0.45, sz, glass: b.glass });
        }
      }
    }
  }
  return out;
}

function Windows() {
  const mesh = useMemo(() => {
    const wins = buildWindows();
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const inst = new THREE.InstancedMesh(geo, mat.glass, wins.length);
    wins.forEach((w, i) => {
      dummy.position.set(w.x, w.y, w.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(w.sx, w.sy, w.sz);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
      color.set(w.glass);
      inst.setColorAt(i, color);
    });
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    inst.frustumCulled = false;
    inst.receiveShadow = true;
    return inst;
  }, []);
  useEffect(
    () => () => {
      mesh.geometry.dispose();
      mesh.dispose();
    },
    [mesh],
  );
  return <primitive object={mesh} />;
}

function BlockMesh({ b }: { b: Block }) {
  const wall = colored(b.wall);
  const accent = colored(b.accent);
  const roof = colored(b.roof, 0.72, 0.05);
  const door = entrance(b, 0.12, 1.25);
  const sign = entrance(b, 0.7, Math.max(4.4, b.h * 0.62));
  const canopy = entrance(b, 1.15, 3.15);
  const doorArgs: [number, number, number] =
    door.axis === "z" ? [1.7, 2.5, 0.12] : [0.12, 2.5, 1.7];
  const canopyArgs: [number, number, number] =
    canopy.axis === "z" ? [6.2, 0.22, 2.5] : [2.5, 0.22, Math.min(8, b.d * 0.7)];
  const floors = [];
  for (let f = 1; f < b.floors; f++) floors.push(f);

  return (
    <group>
      <mesh position={[b.x, 0.28, b.z]} material={mat.concrete} receiveShadow>
        <boxGeometry args={[b.w + 0.7, 0.56, b.d + 0.7]} />
      </mesh>
      <mesh position={[b.x, b.h / 2, b.z]} material={wall} castShadow receiveShadow>
        <boxGeometry args={[b.w, b.h, b.d]} />
      </mesh>
      {b.tower === 0 && (
        <mesh position={[b.x, b.h + 0.16, b.z]} material={roof} castShadow>
          <boxGeometry args={[b.w + 0.45, 0.32, b.d + 0.45]} />
        </mesh>
      )}
      {(b.kind === "academic" || b.kind === "hostel") && (
        <mesh position={[b.x, 1.15, b.z]} material={accent}>
          <boxGeometry args={[b.w + 0.12, 0.28, b.d + 0.12]} />
        </mesh>
      )}
      <mesh position={[door.x, door.y, door.z]} material={mat.door}>
        <boxGeometry args={doorArgs} />
      </mesh>
      {b.kind !== "house" && (
        <mesh position={[canopy.x, canopy.y, canopy.z]} material={accent} castShadow>
          <boxGeometry args={canopyArgs} />
        </mesh>
      )}
      {b.tower > 0 && (
        <mesh position={[b.x, b.tower / 2, b.z]} material={colored(b.accent, 0.7, 0.08)} castShadow>
          <boxGeometry args={[12, b.tower, 12]} />
        </mesh>
      )}
      {b.code === "AB3" &&
        [-10, -6, -2, 2, 6, 10].map((dx) => (
          <mesh
            key={dx}
            position={[b.x + dx, b.h / 2, SOUTH_FACE + 0.28]}
            material={accent}
            castShadow
          >
            <boxGeometry args={[0.38, b.h - 1, 0.4]} />
          </mesh>
        ))}
      {b.kind === "hostel" &&
        floors.map((f) => {
          const y = (f * b.h) / b.floors;
          const slab = entrance(b, 0.55, y);
          const args: [number, number, number] =
            slab.axis === "z"
              ? [b.w * 0.84, 0.12, 1.15]
              : [1.15, 0.12, b.d * 0.84];
          return (
            <mesh key={f} position={[slab.x, slab.y, slab.z]} material={accent} castShadow>
              <boxGeometry args={args} />
            </mesh>
          );
        })}
      {b.kind === "hostel" && (
        <mesh
          position={[b.x + b.w * 0.22, b.h + 1.05, b.z - b.d * 0.22]}
          material={colored("#d9cdb6")}
          castShadow
        >
          <cylinderGeometry args={[1.05, 1.05, 1.6, 12]} />
        </mesh>
      )}
      {b.kind === "house" && (
        <>
          <mesh
            position={[b.x, b.h + 1.8, b.z]}
            rotation={[0, Math.PI / 4, 0]}
            material={roof}
            castShadow
          >
            <coneGeometry args={[Math.max(b.w, b.d) * 0.58, 3.6, 4]} />
          </mesh>
          {[-7.2, -2.4, 2.4, 7.2].map((dx) => (
            <mesh
              key={dx}
              position={[b.x + dx, 1.7, b.z + b.d / 2 + 0.35]}
              material={mat.stone}
              castShadow
            >
              <cylinderGeometry args={[0.28, 0.32, 3.4, 10]} />
            </mesh>
          ))}
        </>
      )}
      {b.kind === "security" && (
        <mesh
          position={[b.x, b.h + 1.15, b.z]}
          rotation={[0, Math.PI / 4, 0]}
          material={roof}
          castShadow
        >
          <coneGeometry args={[Math.max(b.w, b.d) * 0.48, 2.2, 4]} />
        </mesh>
      )}
      <Sign
        title={b.title}
        subtitle={b.subtitle}
        position={[sign.x, sign.y, sign.z]}
        yaw={sign.yaw}
        width={b.kind === "academic" ? 8 : 6.5}
      />
    </group>
  );
}

function Gate() {
  return (
    <group position={[0, 0, GATE_Z]}>
      {[-6.5, 6.5].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, 3.5, 0]} material={mat.stone} castShadow receiveShadow>
            <boxGeometry args={[1.7, 7, 1.7]} />
          </mesh>
          <mesh position={[0, 6.2, 0]} material={mat.gold}>
            <boxGeometry args={[1.9, 0.28, 1.9]} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 6.55, 0]} material={mat.stone} castShadow>
        <boxGeometry args={[14.8, 1.15, 1.5]} />
      </mesh>
      <mesh position={[-16, 0.8, 0]} material={mat.fence} castShadow>
        <boxGeometry args={[16, 1.6, 0.7]} />
      </mesh>
      <mesh position={[16, 0.8, 0]} material={mat.fence} castShadow>
        <boxGeometry args={[16, 1.6, 0.7]} />
      </mesh>
      <mesh position={[9.2, 1.35, -1.2]} material={colored("#efe3b0")} castShadow>
        <boxGeometry args={[3.1, 2.7, 2.8]} />
      </mesh>
      <mesh position={[9.2, 2.85, -1.2]} material={colored("#4e6274")}>
        <boxGeometry args={[3.4, 0.28, 3.1]} />
      </mesh>
      <Sign title="VIT VELLORE" subtitle="Main Gate" position={[0, 6.55, 0.85]} width={8.5} />
      <Sign
        title="VIT VELLORE"
        subtitle="Main Gate"
        position={[0, 6.55, -0.85]}
        yaw={Math.PI}
        width={8.5}
      />
    </group>
  );
}

function Flag() {
  const cloth = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (cloth.current) cloth.current.rotation.y = Math.sin(clock.elapsedTime * 2.2) * 0.35;
  });
  return (
    <group position={[-11.5, 0, GATE_Z - 5]}>
      <mesh position={[0, 4.2, 0]} material={mat.metal} castShadow>
        <cylinderGeometry args={[0.07, 0.1, 8.4, 8]} />
      </mesh>
      <group ref={cloth} position={[0, 7.5, 0]}>
        <mesh position={[0.75, 0, 0]} material={mat.gold}>
          <boxGeometry args={[1.5, 0.85, 0.05]} />
        </mesh>
      </group>
    </group>
  );
}

function Auditorium() {
  const seats = useMemo(() => {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const count =
      AUD.tiers * (Math.floor((AUD.a1 - AUD.a0) / AUD.step) * 2);
    const mesh = new THREE.InstancedMesh(geo, mat.seat, count);
    let i = 0;
    for (let tier = 0; tier < AUD.tiers; tier++) {
      const r = AUD.r0 + tier * AUD.rStep;
      const h = 0.45 + tier * 0.32;
      for (const side of [-1, 1]) {
        for (let a = AUD.a0; a <= AUD.a1; a += AUD.step) {
          const x = AUD.x + side * Math.sin(a) * r;
          const z = AUD.z + Math.cos(a) * r * 0.92;
          dummy.position.set(x, h / 2, z);
          dummy.rotation.set(0, side * a, 0);
          dummy.scale.set(1.25, h, 0.95);
          dummy.updateMatrix();
          if (i < count) mesh.setMatrixAt(i, dummy.matrix);
          i += 1;
        }
      }
    }
    mesh.count = i;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    return mesh;
  }, []);
  useEffect(
    () => () => {
      seats.geometry.dispose();
      seats.dispose();
    },
    [seats],
  );
  return (
    <group>
      <primitive object={seats} />
      <mesh position={[AUD.x, 0.45, AUD.z - 2.2]} material={mat.stage} receiveShadow>
        <boxGeometry args={[14, 0.9, 6]} />
      </mesh>
      <mesh position={[AUD.x, 2.4, AUD.z - 4.7]} material={mat.backdrop} castShadow>
        <boxGeometry args={[16, 4.2, 0.6]} />
      </mesh>
      <Sign
        title="Open Auditorium"
        subtitle="Campus stage"
        position={[AUD.x, 2.6, AUD.z - 4.3]}
        width={8}
      />
    </group>
  );
}

function ParkingLot() {
  const lines = useMemo(() => {
    const geo = new THREE.BoxGeometry(0.1, 0.03, 5.2);
    const mesh = new THREE.InstancedMesh(geo, mat.line, 18);
    let i = 0;
    for (const z of [73.6, 86.4]) {
      for (let x = 30; x <= 82; x += 8) {
        dummy.position.set(x, 0.05, z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        i += 1;
      }
    }
    mesh.count = i;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    return mesh;
  }, []);
  useEffect(
    () => () => {
      lines.geometry.dispose();
      lines.dispose();
    },
    [lines],
  );
  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[PARKING.x, 0.025, PARKING.z]}
        material={mat.asphalt}
        receiveShadow
      >
        <planeGeometry args={[PARKING.w, PARKING.d]} />
      </mesh>
      <primitive object={lines} />
      {CARS.map((car) => (
        <group key={`${car.x}-${car.z}`} position={[car.x, 0, car.z]} rotation={[0, car.yaw, 0]}>
          <mesh position={[0, 0.55, 0]} material={colored(car.color, 0.42, 0.4)} castShadow>
            <boxGeometry args={[1.7, 0.7, 4]} />
          </mesh>
          <mesh position={[0, 1.05, -0.15]} material={colored("#d5e3ee", 0.2, 0.15)} castShadow>
            <boxGeometry args={[1.5, 0.55, 2]} />
          </mesh>
          {[
            [-0.7, 0.32, 1.25],
            [0.7, 0.32, 1.25],
            [-0.7, 0.32, -1.25],
            [0.7, 0.32, -1.25],
          ].map(([x, y, z]) => (
            <mesh
              key={`${x}-${z}`}
              position={[x, y, z]}
              rotation={[0, 0, Math.PI / 2]}
              material={mat.metalDark}
            >
              <cylinderGeometry args={[0.32, 0.32, 0.22, 10]} />
            </mesh>
          ))}
        </group>
      ))}
      <Sign
        title="Main Vehicle Parking"
        subtitle="Campus lot"
        position={[24.2, 2.6, PARKING.z]}
        yaw={-Math.PI / 2}
        width={7}
      />
    </group>
  );
}

function Garden() {
  return (
    <group>
      <mesh position={[-26, 0.6, -80]} material={mat.fence} castShadow>
        <boxGeometry args={[0.55, 1.2, 24]} />
      </mesh>
      <mesh position={[26, 0.6, -80]} material={mat.fence} castShadow>
        <boxGeometry args={[0.55, 1.2, 24]} />
      </mesh>
      <mesh position={[0, 0.6, -92]} material={mat.fence} castShadow>
        <boxGeometry args={[52, 1.2, 0.55]} />
      </mesh>
      <mesh position={[-14.2, 0.6, -68.2]} material={mat.fence} castShadow>
        <boxGeometry args={[22, 1.2, 0.55]} />
      </mesh>
      <mesh position={[14.2, 0.6, -68.2]} material={mat.fence} castShadow>
        <boxGeometry args={[22, 1.2, 0.55]} />
      </mesh>
    </group>
  );
}

export function Structures() {
  return (
    <group>
      {BLOCKS.map((b) => (
        <BlockMesh key={b.id} b={b} />
      ))}
      <Windows />
      <Gate />
      <Flag />
      <Auditorium />
      <ParkingLot />
      <Garden />
    </group>
  );
}
