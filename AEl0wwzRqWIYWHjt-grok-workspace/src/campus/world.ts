export type Aabb = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  cam: boolean;
};

export type Circle = { x: number; z: number; r: number };

export type Block = {
  id: string;
  code?: string;
  title: string;
  subtitle: string;
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  floors: number;
  wall: string;
  accent: string;
  roof: string;
  glass: string;
  tower: number;
  entrance: "+z" | "-z" | "+x" | "-x";
  kind: "academic" | "hostel" | "house" | "security";
};

export type Slot = {
  id: string;
  x: number;
  z: number;
  /** +1 plate faces +Z (south); -1 faces -Z (north, into the aisle). */
  face: 1 | -1;
  building: "AB1" | "AB2" | "AB3";
};

export type Rect = { x: number; z: number; w: number; d: number };

export const SOUTH_FACE = 44;
export const RACK_Z: readonly [number, number] = [SOUTH_FACE + 3.9, SOUTH_FACE + 7.15];
export const SIDEWALK_Z = 56.5;
export const AVENUE_Z = 64;
export const AVENUE_D = 8;
export const SPAWN = { x: 0, z: 82, yaw: 0 };
export const GATE_Z = 92;
export const FOUNTAIN = { x: 0, z: 17, r: 3.35 };
export const AUD = {
  x: 0,
  z: -16,
  tiers: 6,
  r0: 4.2,
  rStep: 1.55,
  a0: 0.2,
  a1: 1.22,
  step: 0.16,
};

export function aabb(x: number, z: number, w: number, d: number, cam: boolean): Aabb {
  return {
    minX: x - w / 2,
    maxX: x + w / 2,
    minZ: z - d / 2,
    maxZ: z + d / 2,
    cam,
  };
}

function academic(
  partial: Omit<Block, "z" | "entrance" | "kind" | "tower"> & { tower?: number },
): Block {
  return {
    ...partial,
    tower: partial.tower ?? 0,
    z: SOUTH_FACE - partial.d / 2,
    entrance: "+z",
    kind: "academic",
  };
}

export const ACADEMICS: Block[] = [
  academic({
    id: "ab1",
    code: "AB1",
    title: "AB 1",
    subtitle: "Academic Block",
    x: -48,
    w: 26,
    d: 16,
    h: 14,
    floors: 4,
    wall: "#e4d2b0",
    accent: "#1d4e89",
    roof: "#cbb892",
    glass: "#1e4d73",
  }),
  academic({
    id: "ab2",
    code: "AB2",
    title: "AB 2",
    subtitle: "Academic Block",
    x: 0,
    w: 30,
    d: 18,
    h: 16,
    floors: 4,
    wall: "#b85a42",
    accent: "#f3e6d0",
    roof: "#8d4030",
    glass: "#6e90a8",
    tower: 26,
  }),
  academic({
    id: "ab3",
    code: "AB3",
    title: "AB 3",
    subtitle: "Academic Block",
    x: 48,
    w: 26,
    d: 16,
    h: 13,
    floors: 4,
    wall: "#f3f1ea",
    accent: "#1f7a4d",
    roof: "#d5d2c8",
    glass: "#1c4f45",
  }),
];

export const HOSTELS: Block[] = [
  {
    id: "bh1",
    title: "Boys' Hostel 1",
    subtitle: "Men's residence",
    x: -82,
    z: -4,
    w: 14,
    d: 30,
    h: 12,
    floors: 4,
    wall: "#6d8caf",
    accent: "#e8eef5",
    roof: "#4e6e8e",
    glass: "#35597a",
    tower: 0,
    entrance: "+x",
    kind: "hostel",
  },
  {
    id: "gh1",
    title: "Girls' Hostel 1",
    subtitle: "Women's residence",
    x: 82,
    z: -4,
    w: 14,
    d: 30,
    h: 11,
    floors: 4,
    wall: "#e0a8b8",
    accent: "#fff4f6",
    roof: "#c48498",
    glass: "#8d5c6c",
    tower: 0,
    entrance: "-x",
    kind: "hostel",
  },
  {
    id: "bh2",
    title: "Boys' Hostel 2",
    subtitle: "Men's residence",
    x: -82,
    z: -64,
    w: 14,
    d: 28,
    h: 14,
    floors: 5,
    wall: "#35557c",
    accent: "#d4a017",
    roof: "#243e5c",
    glass: "#243e5c",
    tower: 0,
    entrance: "+x",
    kind: "hostel",
  },
  {
    id: "gh2",
    title: "Girls' Hostel 2",
    subtitle: "Women's residence",
    x: 82,
    z: -64,
    w: 16,
    d: 28,
    h: 12,
    floors: 4,
    wall: "#b089c4",
    accent: "#f7f0fb",
    roof: "#8a6aa0",
    glass: "#6d5080",
    tower: 0,
    entrance: "-x",
    kind: "hostel",
  },
];

export const CHANCELLOR: Block = {
  id: "chancellor",
  title: "Chancellor's Residence",
  subtitle: "Campus house",
  x: 0,
  z: -80,
  w: 22,
  d: 14,
  h: 8,
  floors: 2,
  wall: "#f7f3ea",
  accent: "#8e2e2e",
  roof: "#8e2e2e",
  glass: "#8aa4b8",
  tower: 0,
  entrance: "+z",
  kind: "house",
};

export const SECURITY: Block = {
  id: "security",
  title: "Security Residence",
  subtitle: "Campus security",
  x: -42,
  z: 78,
  w: 12,
  d: 10,
  h: 6.6,
  floors: 2,
  wall: "#efe3b0",
  accent: "#4e6274",
  roof: "#4e6274",
  glass: "#4e6274",
  tower: 0,
  entrance: "+x",
  kind: "security",
};

export const BLOCKS: Block[] = [...ACADEMICS, ...HOSTELS, CHANCELLOR, SECURITY];

export const PARKING = { x: 56, z: 79, w: 60, d: 22 };
export const ROADS: Rect[] = [
  { x: 0, z: AVENUE_Z, w: 184, d: AVENUE_D },
  { x: 0, z: 84, w: 9, d: 32 },
  { x: 0, z: -35, w: 170, d: 7 },
];
export const PATHS: Rect[] = [
  { x: 0, z: SIDEWALK_Z, w: 156, d: 2.8 },
  { x: -70, z: -32, w: 4, d: 124 },
  { x: 70, z: -32, w: 4, d: 124 },
  { x: -27, z: 40, w: 3.6, d: 34 },
  { x: 27, z: 40, w: 3.6, d: 34 },
  { x: 0, z: -52, w: 4.2, d: 42 },
  { x: 0, z: 95.5, w: 18, d: 7 },
  ...ACADEMICS.map((b) => ({
    x: b.x,
    z: (SOUTH_FACE + SIDEWALK_Z) / 2 - 0.4,
    w: 3.3,
    d: SIDEWALK_Z - SOUTH_FACE - 1.2,
  })),
];
export const LAWNS: Rect[] = [
  { x: 0, z: 18, w: 62, d: 12 },
  { x: 0, z: -80, w: 46, d: 26 },
  { x: -82, z: -34, w: 18, d: 16 },
  { x: 82, z: -34, w: 18, d: 16 },
];

import { INITIAL_STANDS, STAND_SPECS, clusters, mulberry32, slotId } from "@/data/stands";
export { STAND_SPECS };

export const SLOTS: Slot[] = INITIAL_STANDS.map((s) => ({
  id: s.id,
  x: s.position.x,
  z: s.position.z,
  face: s.face,
  building: s.building,
}));

export const BIKE_SIGNS = STAND_SPECS.map((spec) => {
  const right = clusters(spec.x)[1];
  return {
    code: spec.prefix,
    title: spec.title,
    subtitle: `${spec.prefix}-01 – ${spec.prefix}-50`,
    x: right.start + right.span + 3.3,
    z: spec.z,
  };
});

export const SOLIDS: Aabb[] = [];
export const CIRCLES: Circle[] = [];

for (const b of BLOCKS) {
  SOLIDS.push(aabb(b.x, b.z, b.w + 0.9, b.d + 0.9, true));
}

for (const b of ACADEMICS) {
  SOLIDS.push(aabb(b.x - 1.7, SOUTH_FACE + 0.15, 0.5, 0.5, false));
  SOLIDS.push(aabb(b.x + 1.7, SOUTH_FACE + 0.15, 0.5, 0.5, false));
}

for (const spec of STAND_SPECS) {
  for (const z of [spec.z - 1.625, spec.z + 1.625]) {
    for (const cluster of clusters(spec.x)) {
      const length = cluster.span + 0.85;
      const cx = cluster.start + cluster.span / 2;
      SOLIDS.push(aabb(cx, z, length, 0.96, false));
    }
  }
}

export const CARS: { x: number; z: number; yaw: number; color: string }[] = [
  { x: 34, z: 73.6, yaw: Math.PI, color: "#1d4e89" },
  { x: 44, z: 73.6, yaw: Math.PI, color: "#8e2e2e" },
  { x: 58, z: 73.6, yaw: Math.PI, color: "#e8e4dc" },
  { x: 72, z: 73.6, yaw: Math.PI, color: "#2f6f4e" },
  { x: 36, z: 86.4, yaw: 0, color: "#c8962e" },
  { x: 48, z: 86.4, yaw: 0, color: "#35557c" },
  { x: 64, z: 86.4, yaw: 0, color: "#1a1a1a" },
  { x: 78, z: 86.4, yaw: 0, color: "#b85a42" },
];

for (const car of CARS) {
  SOLIDS.push(aabb(car.x, car.z, 1.9, 4.15, false));
}

SOLIDS.push(aabb(-6.5, GATE_Z, 1.7, 1.7, true));
SOLIDS.push(aabb(6.5, GATE_Z, 1.7, 1.7, true));
SOLIDS.push(aabb(-16, GATE_Z, 16, 1.15, true));
SOLIDS.push(aabb(16, GATE_Z, 16, 1.15, true));
SOLIDS.push(aabb(9.2, GATE_Z - 1.2, 3.2, 3.2, true));

SOLIDS.push(aabb(0, 99, 200, 0.9, true));
SOLIDS.push(aabb(0, -95, 200, 0.9, true));
SOLIDS.push(aabb(-98, 2, 0.9, 196, true));
SOLIDS.push(aabb(98, 2, 0.9, 196, true));

SOLIDS.push(aabb(-26, -80, 0.7, 24, true));
SOLIDS.push(aabb(26, -80, 0.7, 24, true));
SOLIDS.push(aabb(0, -92, 52, 0.7, true));
SOLIDS.push(aabb(-14.2, -68.2, 22, 0.7, true));
SOLIDS.push(aabb(14.2, -68.2, 22, 0.7, true));

const audR = AUD.r0 + (AUD.tiers - 1) * AUD.rStep;
SOLIDS.push(aabb(-7.6, AUD.z + 2.2, 11, audR * 0.92, true));
SOLIDS.push(aabb(7.6, AUD.z + 2.2, 11, audR * 0.92, true));
SOLIDS.push(aabb(0, AUD.z - 4.6, 18, 0.8, true));

CIRCLES.push({ x: FOUNTAIN.x, z: FOUNTAIN.z, r: FOUNTAIN.r + 0.35 });

export type Tree = { x: number; z: number; s: number; kind: number };
export const TREES: Tree[] = [];
export const BENCHES: { x: number; z: number; yaw: number }[] = [];

function hitsRect(x: number, z: number, rect: Rect, pad: number) {
  return (
    Math.abs(x - rect.x) < rect.w / 2 + pad && Math.abs(z - rect.z) < rect.d / 2 + pad
  );
}

function hitsSolid(x: number, z: number, pad: number) {
  for (let i = 0; i < SOLIDS.length; i++) {
    const b = SOLIDS[i];
    if (x > b.minX - pad && x < b.maxX + pad && z > b.minZ - pad && z < b.maxZ + pad) return true;
  }
  for (let i = 0; i < CIRCLES.length; i++) {
    const c = CIRCLES[i];
    const dx = x - c.x;
    const dz = z - c.z;
    if (dx * dx + dz * dz < (c.r + pad) * (c.r + pad)) return true;
  }
  return false;
}

function occupied(x: number, z: number, pad: number) {
  if (hitsSolid(x, z, pad)) return true;
  for (const rect of ROADS) if (hitsRect(x, z, rect, pad)) return true;
  for (const rect of PATHS) if (hitsRect(x, z, rect, pad)) return true;
  if (hitsRect(x, z, PARKING, pad)) return true;
  if (Math.abs(x - AUD.x) < 16 + pad && Math.abs(z - AUD.z) < 14 + pad) return true;
  if (Math.hypot(x - SPAWN.x, z - SPAWN.z) < 9) return true;
  return false;
}

const benchWanted = [
  { x: -18, z: 20, yaw: 0 },
  { x: 18, z: 20, yaw: 0 },
  { x: -18, z: 23, yaw: Math.PI },
  { x: 18, z: 23, yaw: Math.PI },
  { x: -40, z: 21, yaw: Math.PI / 2 },
  { x: 40, z: 21, yaw: -Math.PI / 2 },
  { x: -66, z: 6, yaw: 0 },
  { x: 66, z: 6, yaw: Math.PI },
  { x: -66, z: -48, yaw: 0 },
  { x: 66, z: -48, yaw: Math.PI },
  { x: -12, z: -46, yaw: 0 },
  { x: 12, z: -46, yaw: Math.PI },
];

for (const bench of benchWanted) {
  if (occupied(bench.x, bench.z, 0.7)) continue;
  BENCHES.push(bench);
  SOLIDS.push(aabb(bench.x, bench.z, 1.7, 0.7, false));
}



const rand = mulberry32(20260321);
const placed: { x: number; z: number }[] = [];
for (let n = 0; n < 700 && TREES.length < 78; n++) {
  const x = -94 + rand() * 188;
  const z = -92 + rand() * 188;
  const kind = rand() < 0.22 ? 2 : rand() < 0.55 ? 1 : 0;
  const pad = kind === 2 ? 1.2 : 2.4;
  if (occupied(x, z, pad)) continue;
  let near = false;
  const minD = kind === 2 ? 3.2 : 5.2;
  for (const p of placed) {
    if ((p.x - x) ** 2 + (p.z - z) ** 2 < minD * minD) {
      near = true;
      break;
    }
  }
  if (near) continue;
  const s = kind === 2 ? 0.7 + rand() * 0.45 : 0.85 + rand() * 0.7;
  TREES.push({ x, z, s, kind });
  placed.push({ x, z });
  if (kind !== 2) CIRCLES.push({ x, z, r: 0.34 * s });
}

export const LAMPS: { x: number; z: number }[] = [];
for (let x = -84; x <= 84; x += 21) {
  if (Math.abs(x) < 8) continue;
  LAMPS.push({ x, z: AVENUE_Z - AVENUE_D / 2 - 1 });
  LAMPS.push({ x, z: AVENUE_Z + AVENUE_D / 2 + 1 });
}
for (let x = -60; x <= 60; x += 30) {
  LAMPS.push({ x, z: -35 - 4.2 });
}

export const DASHES: { x: number; z: number; w: number; d: number }[] = [];
for (let x = -78; x <= 78; x += 6.5) {
  if (Math.abs(x) < 7) continue;
  DASHES.push({ x, z: AVENUE_Z, w: 2.4, d: 0.16 });
}
for (const cx of [-48, 0, 48]) {
  for (let i = -3; i <= 2; i++) {
    DASHES.push({ x: cx + i * 0.9 + 0.45, z: AVENUE_Z, w: 0.42, d: 6.2 });
  }
}

export type Zone = { name: string; x: number; z: number; rx: number; rz: number };

export const ZONES: Zone[] = [
  ...STAND_SPECS.map((s) => ({
    name: s.name,
    x: s.x,
    z: s.z,
    rx: 15,
    rz: 3.8,
  })),
  { name: "AB 1", x: ACADEMICS[0].x, z: ACADEMICS[0].z, rx: 16, rz: 11 },
  { name: "AB 2", x: ACADEMICS[1].x, z: ACADEMICS[1].z, rx: 18, rz: 12 },
  { name: "AB 3", x: ACADEMICS[2].x, z: ACADEMICS[2].z, rx: 16, rz: 11 },
  { name: "Main Vehicle Parking", x: PARKING.x, z: PARKING.z, rx: 32, rz: 13 },
  { name: "Chancellor's Residence", x: CHANCELLOR.x, z: CHANCELLOR.z, rx: 18, rz: 16 },
  { name: "Girls' Hostel 1", x: HOSTELS[1].x, z: HOSTELS[1].z, rx: 12, rz: 18 },
  { name: "Boys' Hostel 1", x: HOSTELS[0].x, z: HOSTELS[0].z, rx: 12, rz: 18 },
  { name: "Girls' Hostel 2", x: HOSTELS[3].x, z: HOSTELS[3].z, rx: 13, rz: 17 },
  { name: "Boys' Hostel 2", x: HOSTELS[2].x, z: HOSTELS[2].z, rx: 12, rz: 17 },
  { name: "Main Gate", x: 0, z: 90, rx: 16, rz: 14 },
  { name: "Security Residence", x: SECURITY.x, z: SECURITY.z, rx: 10, rz: 8 },
  { name: "Open Auditorium", x: AUD.x, z: AUD.z, rx: 16, rz: 14 },
];

export const PLACES = [
  { name: "AB 1", x: ACADEMICS[0].x, z: ACADEMICS[0].z },
  { name: "AB 2", x: ACADEMICS[1].x, z: ACADEMICS[1].z },
  { name: "AB 3", x: ACADEMICS[2].x, z: ACADEMICS[2].z },
  { name: "Main Vehicle Parking", x: PARKING.x, z: PARKING.z },
  { name: "Chancellor's Residence", x: CHANCELLOR.x, z: CHANCELLOR.z },
  { name: "Girls' Hostel 1", x: HOSTELS[1].x, z: HOSTELS[1].z },
  { name: "Boys' Hostel 1", x: HOSTELS[0].x, z: HOSTELS[0].z },
  { name: "Girls' Hostel 2", x: HOSTELS[3].x, z: HOSTELS[3].z },
  { name: "Boys' Hostel 2", x: HOSTELS[2].x, z: HOSTELS[2].z },
  { name: "Main Gate", x: 0, z: GATE_Z },
  { name: "Security Residence", x: SECURITY.x, z: SECURITY.z },
  { name: "Open Auditorium", x: AUD.x, z: AUD.z },
];

export const MAP_RECTS: { x: number; z: number; w: number; d: number; color: string }[] = [
  ...BLOCKS.map((b) => ({ x: b.x, z: b.z, w: b.w, d: b.d, color: b.wall })),
  { x: PARKING.x, z: PARKING.z, w: PARKING.w, d: PARKING.d, color: "#3e4550" },
  { x: AUD.x, z: AUD.z, w: 26, d: 18, color: "#b5654a" },
  { x: 0, z: GATE_Z, w: 16, d: 2, color: "#d9cdb6" },
  ...STAND_SPECS.map((s) => ({ x: s.x, z: s.z, w: 26, d: 4.5, color: "#d4a017" })),
];

export function placeAt(x: number, z: number) {
  let best = "Campus grounds";
  let bestArea = Infinity;
  for (const zone of ZONES) {
    const dx = (x - zone.x) / zone.rx;
    const dz = (z - zone.z) / zone.rz;
    if (dx * dx + dz * dz > 1) continue;
    const area = zone.rx * zone.rz;
    if (area < bestArea) {
      best = zone.name;
      bestArea = area;
    }
  }
  return best;
}

const _tmp = { x: 0, z: 0 };

function separateAabb(px: number, pz: number, r: number, box: Aabb, out: { x: number; z: number }) {
  const cx = Math.max(box.minX, Math.min(px, box.maxX));
  const cz = Math.max(box.minZ, Math.min(pz, box.maxZ));
  const dx = px - cx;
  const dz = pz - cz;
  const d2 = dx * dx + dz * dz;
  if (d2 >= r * r) return false;
  if (d2 < 1e-8) {
    const left = px - box.minX;
    const right = box.maxX - px;
    const near = pz - box.minZ;
    const far = box.maxZ - pz;
    const m = Math.min(left, right, near, far);
    out.x = px;
    out.z = pz;
    if (m === left) out.x = box.minX - r;
    else if (m === right) out.x = box.maxX + r;
    else if (m === near) out.z = box.minZ - r;
    else out.z = box.maxZ + r;
    return true;
  }
  const d = Math.sqrt(d2);
  const push = (r - d) / d;
  out.x = px + dx * push;
  out.z = pz + dz * push;
  return true;
}

function separateCircle(
  px: number,
  pz: number,
  r: number,
  circle: Circle,
  out: { x: number; z: number },
) {
  const dx = px - circle.x;
  const dz = pz - circle.z;
  const min = r + circle.r;
  const d2 = dx * dx + dz * dz;
  if (d2 >= min * min) return false;
  if (d2 < 1e-8) {
    out.x = px + min;
    out.z = pz;
    return true;
  }
  const d = Math.sqrt(d2);
  const push = (min - d) / d;
  out.x = px + dx * push;
  out.z = pz + dz * push;
  return true;
}

export function circleHitsAabb(px: number, pz: number, r: number, box: Aabb) {
  const cx = Math.max(box.minX, Math.min(px, box.maxX));
  const cz = Math.max(box.minZ, Math.min(pz, box.maxZ));
  const dx = px - cx;
  const dz = pz - cz;
  return dx * dx + dz * dz < r * r;
}

export function resolve(x: number, z: number, radius: number, out: { x: number; z: number }) {
  let px = x;
  let pz = z;
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < SOLIDS.length; i++) {
      if (separateAabb(px, pz, radius, SOLIDS[i], _tmp)) {
        px = _tmp.x;
        pz = _tmp.z;
      }
    }
    for (let i = 0; i < CIRCLES.length; i++) {
      if (separateCircle(px, pz, radius, CIRCLES[i], _tmp)) {
        px = _tmp.x;
        pz = _tmp.z;
      }
    }
  }
  out.x = Math.max(-99, Math.min(99, px));
  out.z = Math.max(-96, Math.min(102, pz));
}

export function cameraBlocked(x: number, z: number, radius: number) {
  for (let i = 0; i < SOLIDS.length; i++) {
    const box = SOLIDS[i];
    if (!box.cam) continue;
    if (circleHitsAabb(x, z, radius, box)) return true;
  }
  return false;
}

function assertWorld() {
  if (SLOTS.length !== 150) throw new Error(`Expected 150 bicycle slots, got ${SLOTS.length}`);
  const ids = new Set<string>();
  for (const prefix of ["AB1", "AB2", "AB3"]) {
    for (let n = 1; n <= 50; n++) {
      const id = slotId(prefix, n);
      if (!SLOTS.some((s) => s.id === id)) throw new Error(`Missing bicycle slot ${id}`);
      ids.add(id);
    }
  }
  if (ids.size !== 150) throw new Error("Bicycle slot ids are not unique");
  const open = [
    [0, 82],
    [0, 64],
    [0, 49.5],
    [-48, 49.5],
    [48, 49.5],
    [0, -50],
    [0, -70],
    [56, 80],
  ];
  for (const [x, z] of open) {
    if (hitsSolid(x, z, 0)) throw new Error(`Layout blocks a required path at ${x}, ${z}`);
  }
  if (PLACES.length !== 12) throw new Error("Expected 12 campus places");
}

assertWorld();
