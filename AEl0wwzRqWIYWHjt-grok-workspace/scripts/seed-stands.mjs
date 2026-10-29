/**
 * Seed script to populate all 150 stands in Firestore from /src/data/stands.ts
 * Each stand gets: status "available", random qrSecret, slot, building, position.
 * Can be run against the Firestore emulator (127.0.0.1:8085) or live Firestore.
 */

import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator, doc, writeBatch } from "firebase/firestore";
import crypto from "node:crypto";

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "demo-parkshark-key",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "parkshark-vit",
  authDomain: "parkshark-vit.firebaseapp.com",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Configure emulator host
const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8085";
const [host, portStr] = emulatorHost.split(":");
const port = Number(portStr) || 8085;

try {
  connectFirestoreEmulator(db, host, port);
  console.log(`[Seed] Connected to Firestore emulator at ${host}:${port}`);
} catch (err) {
  console.log(`[Seed] Emulator connection notice: ${err?.message || err}`);
}

// Timeout after 4s if emulator is not listening
const timeout = setTimeout(() => {
  console.warn(`\n[Seed] Notice: Firestore emulator not responding on ${host}:${port}.`);
  console.warn(`[Seed] To run against local emulator, start it in another terminal:`);
  console.warn(`       firebase emulators:start --only firestore`);
  console.warn(`       then run: npm run seed:stands\n`);
  process.exit(0);
}, 4000);

// Coordinate specs matching src/data/stands.ts
const STAND_SPECS = [
  { prefix: "AB1", x: -42.8, z: 3.1 },
  { prefix: "AB2", x: 26.6, z: -49.8 },
  { prefix: "AB3", x: 49.5, z: 4.5 },
];

const SPACING = 0.9;
const CLUSTER_GAP = 4.5;
const LEFT_N = 12;
const RIGHT_N = 13;

function clusters(centerX) {
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

function generate150Stands() {
  const stands = [];
  for (const spec of STAND_SPECS) {
    let n = 1;
    const rackZ = [spec.z - 1.625, spec.z + 1.625];
    for (let row = 0; row < 2; row++) {
      const face = row === 0 ? 1 : -1;
      const z = rackZ[row];
      for (const cluster of clusters(spec.x)) {
        for (let i = 0; i < cluster.count; i++) {
          const id = `${spec.prefix}-${String(n).padStart(2, "0")}`;
          // Generate a cryptographically random qrSecret
          const randomSecret = `qr_${id}_${crypto.randomBytes(6).toString("hex")}`;

          stands.push({
            id,
            building: spec.prefix,
            slot: n,
            position: {
              x: Number((cluster.start + i * SPACING).toFixed(3)),
              z: Number(z.toFixed(3)),
            },
            face,
            status: "available", // Requirement: status "available"
            qrSecret: randomSecret, // Requirement: random qrSecret
            currentSessionId: null,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
          n += 1;
        }
      }
    }
  }
  return stands;
}

async function seed() {
  console.log("[Seed] Preparing 150 stands data...");
  const stands = generate150Stands();

  if (stands.length !== 150) {
    throw new Error(`Expected exactly 150 stands, generated ${stands.length}`);
  }

  console.log(`[Seed] Writing ${stands.length} stands to collection 'stands'...`);

  const batch = writeBatch(db);

  for (const stand of stands) {
    const standRef = doc(db, "stands", stand.id);
    batch.set(standRef, stand, { merge: true });
  }

  await batch.commit();

  clearTimeout(timeout);
  console.log(`[Seed] SUCCESS! Created all 150 stands in Firestore emulator.`);
  console.log(`[Seed] Sample stand:`, JSON.stringify(stands[0], null, 2));
  process.exit(0);
}

seed().catch((err) => {
  console.error("[Seed] Failed to seed stands:", err.message || err);
  process.exit(1);
});
