export type StandStatus = "available" | "occupied" | "maintenance";

export type StandSpec = {
  prefix: "AB1" | "AB2" | "AB3";
  title: string;
  name: string;
  x: number;
  z: number;
};

export type Stand = {
  id: string;
  building: "AB1" | "AB2" | "AB3";
  slot: number; // 1 to 50
  position: { x: number; z: number };
  face: 1 | -1;
  status: StandStatus;
  currentSessionId?: string | null;
  qrSecret?: string;
};

// Seeded generator to maintain deterministic, clean stand positions
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const standRand = mulberry32(739162);

export const STAND_SPECS: StandSpec[] = [
  {
    prefix: "AB1",
    title: "West Lawn Bicycles",
    name: "West Lawn bicycle parking",
    x: Math.round((-46 + (standRand() - 0.5) * 8) * 10) / 10, // -42.8
    z: Math.round((6 + (standRand() - 0.5) * 6) * 10) / 10,   // 3.1
  },
  {
    prefix: "AB2",
    title: "North Grounds Bicycles",
    name: "North Grounds bicycle parking",
    x: Math.round((28 + (standRand() - 0.5) * 8) * 10) / 10,  // 26.6
    z: Math.round((-52 + (standRand() - 0.5) * 6) * 10) / 10, // -49.8
  },
  {
    prefix: "AB3",
    title: "East Lawn Bicycles",
    name: "East Lawn bicycle parking",
    x: Math.round((46 + (standRand() - 0.5) * 8) * 10) / 10,  // 49.5
    z: Math.round((6 + (standRand() - 0.5) * 6) * 10) / 10,   // 4.5
  },
];

const SPACING = 0.9;
const CLUSTER_GAP = 4.5;
const LEFT_N = 12;
const RIGHT_N = 13;

type Cluster = { start: number; count: number; span: number };

export function clusters(centerX: number): [Cluster, Cluster] {
  const leftSpan = (LEFT_N - 1) * SPACING;
  const rightSpan = (RIGHT_N - 1) * SPACING;
  const total = leftSpan + CLUSTER_GAP + rightSpan;
  const leftStart = centerX - total / 2;
  const rightStart = leftStart + leftSpan + CLUSTER_GAP;
  return [
    { start: leftStart, count: LEFT_N, span: leftSpan },
    { start: rightStart, count: RIGHT_N, span: rightSpan },
  ];
}

export function slotId(prefix: string, n: number): string {
  return `${prefix}-${String(n).padStart(2, "0")}`;
}

// Initial mock occupied/maintenance distribution for realism
const MOCK_OCCUPIED_SLOTS = new Set([
  "AB1-03", "AB1-07", "AB1-14", "AB1-22", "AB1-31", "AB1-45",
  "AB2-05", "AB2-12", "AB2-19", "AB2-28", "AB2-37", "AB2-48",
  "AB3-02", "AB3-11", "AB3-20", "AB3-33", "AB3-41", "AB3-49",
]);

const MOCK_MAINTENANCE_SLOTS = new Set([
  "AB1-18", "AB2-25", "AB3-08",
]);

function buildInitialStands(): Stand[] {
  const stands: Stand[] = [];
  for (const spec of STAND_SPECS) {
    let n = 1;
    const rackZ = [spec.z - 1.625, spec.z + 1.625] as const;
    for (let row = 0; row < 2; row++) {
      const face: 1 | -1 = row === 0 ? 1 : -1;
      const z = rackZ[row];
      for (const cluster of clusters(spec.x)) {
        for (let i = 0; i < cluster.count; i++) {
          const id = slotId(spec.prefix, n);
          let status: StandStatus = "available";
          if (MOCK_MAINTENANCE_SLOTS.has(id)) {
            status = "maintenance";
          } else if (MOCK_OCCUPIED_SLOTS.has(id)) {
            status = "occupied";
          }

          stands.push({
            id,
            building: spec.prefix,
            slot: n,
            position: {
              x: Number((cluster.start + i * SPACING).toFixed(3)),
              z: Number(z.toFixed(3)),
            },
            face,
            status,
            currentSessionId: status === "occupied" ? `mock-session-${id}` : null,
            qrSecret: `secret-qr-${id}-${1000 + n * 3}`,
          });
          n += 1;
        }
      }
    }
  }

  // Strict verification: exactly 150 unique IDs
  if (stands.length !== 150) {
    throw new Error(`Expected 150 bicycle stands, got ${stands.length}`);
  }
  const idSet = new Set(stands.map((s) => s.id));
  if (idSet.size !== 150) {
    throw new Error(`Stand IDs must be unique, got ${idSet.size} unique IDs for 150 stands`);
  }

  return stands;
}

export const INITIAL_STANDS: Stand[] = buildInitialStands();
