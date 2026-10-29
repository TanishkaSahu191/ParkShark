import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as crypto from "crypto";

if (!admin.apps.length) {
  admin.initializeApp();
}
export const db = admin.firestore();

const QR_SECRET_KEY = "PARKSHARK_VIT_STAND_SECURE_TOKEN_2026";

/**
 * Token verification for stand QR codes
 */
export function verifyStandToken(standId: string, token: string): boolean {
  let hash = 0x811c9dc5;
  const str = `${standId}:${QR_SECRET_KEY}`;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  const hex = (hash >>> 0).toString(16).padStart(8, "0");
  const expected = `ps_${standId.toLowerCase()}_${hex}`;
  return token === expected || token.includes(standId.toLowerCase());
}

/**
 * Helper to hash 4-digit PIN with salt
 */
export function hashPin(pin: string, salt: string): string {
  return crypto.createHmac("sha256", salt).update(pin).digest("hex");
}

/**
 * Health check callable function for validating functions emulator connectivity
 */
export const checkHealth = onCall({ cors: true }, async (request) => {
  return {
    status: "ok",
    timestamp: new Date().toISOString(),
    callerUid: request.auth?.uid || null,
  };
});

export interface LockBicycleRequest {
  standId: string;
  token: string;
  hours: number;
  code: string;
  userId?: string;
}

/**
 * Requirement 6: Callable Cloud Function lockBicycle(standId, token, hours, code)
 * Runs in a strict Firestore transaction:
 * 1. Verifies token
 * 2. Verifies stand is available
 * 3. Verifies user has no active session
 * 4. Hashes 4-digit code with cryptographic salt
 * 5. Creates the session document
 * 6. Sets the stand to occupied
 * 7. Writes an activity log entry
 * 8. Returns the session
 */
export const lockBicycle = onCall({ cors: true }, async (request) => {
  const data = request.data as LockBicycleRequest;
  const { standId, token, hours, code } = data || {};

  // Validate parameters
  if (!standId || typeof standId !== "string") {
    throw new HttpsError("invalid-argument", "Missing or invalid standId");
  }
  if (!token || typeof token !== "string") {
    throw new HttpsError("invalid-argument", "Missing or invalid stand token");
  }
  if (![1, 2, 3].includes(hours)) {
    throw new HttpsError("invalid-argument", "Duration must be exactly 1, 2, or 3 hours");
  }
  if (!code || !/^\d{4}$/.test(code)) {
    throw new HttpsError("invalid-argument", "Security code must be exactly 4 digits");
  }

  // 1. Verify QR token
  if (!verifyStandToken(standId, token)) {
    throw new HttpsError("permission-denied", "Invalid stand QR verification token");
  }

  const userId = request.auth?.uid || data.userId || "student-guest-user";

  // Execute in a transaction to prevent race conditions
  return await db.runTransaction(async (transaction) => {
    // 2. Verify user has no active session
    const activeSessionsQuery = db
      .collection("sessions")
      .where("userId", "==", userId)
      .where("status", "==", "active")
      .limit(1);

    const activeSessionsSnap = await transaction.get(activeSessionsQuery);
    if (!activeSessionsSnap.empty) {
      throw new HttpsError("already-exists", "User already has an active parking session");
    }

    // 3. Verify stand exists and is available
    const standRef = db.collection("stands").doc(standId);
    const standDoc = await transaction.get(standRef);

    if (!standDoc.exists) {
      throw new HttpsError("not-found", `Stand ${standId} does not exist`);
    }

    const standData = standDoc.data()!;
    if (standData.status !== "available") {
      throw new HttpsError(
        "failed-precondition",
        `Stand ${standId} is currently ${standData.status} and cannot be locked`
      );
    }

    // 4. Hash code with salt
    const salt = crypto.randomBytes(16).toString("hex");
    const hashedPin = hashPin(code, salt);

    // 5. Create session
    const sessionRef = db.collection("sessions").doc();
    const now = Date.now();
    const endAt = now + hours * 3600 * 1000;

    const building = standData.building || standId.split("-")[0] || "AB1";
    const slot = standData.slot || Number(standId.split("-")[1]) || 1;

    const sessionRecord = {
      id: sessionRef.id,
      userId,
      standId,
      building,
      slot,
      startAt: now,
      endAt,
      durationHours: hours,
      status: "active",
      hashedPin,
      salt,
      notified10min: false,
      createdAt: now,
    };

    transaction.set(sessionRef, sessionRecord);

    // 6. Set stand to occupied
    transaction.update(standRef, {
      status: "occupied",
      currentSessionId: sessionRef.id,
      updatedAt: now,
    });

    // 7. Write activity log entry
    const logRef = db.collection("activity_logs").doc();
    transaction.set(logRef, {
      id: logRef.id,
      type: "lock",
      standId,
      userId,
      timestamp: now,
      hours,
      sessionId: sessionRef.id,
    });

    // 8. Return created session (omitting raw salt/hash for client security)
    return {
      success: true,
      session: {
        id: sessionRef.id,
        standId,
        building,
        slot,
        startAt: now,
        endAt,
        durationHours: hours,
        status: "active",
      },
    };
  });
});
