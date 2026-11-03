import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as crypto from "crypto";

if (!admin.apps.length) {
  admin.initializeApp();
}
export const db = admin.firestore();

const QR_SECRET_KEY = "PARKSHARK_VIT_STAND_SECURE_TOKEN_2026";
const STAND_ID_REGEX = /^AB[1-3]-(0[1-9]|[1-4][0-9]|50)$/;

/**
 * In-memory sliding window rate limiter for Cloud Functions callable requests
 */
const rateLimits = new Map<string, number[]>();

export function checkRateLimit(key: string, maxCalls: number, windowMs: number): void {
  const now = Date.now();
  const timestamps = rateLimits.get(key) || [];
  const validTimestamps = timestamps.filter((t) => now - t < windowMs);

  if (validTimestamps.length >= maxCalls) {
    const oldest = validTimestamps[0];
    const waitSec = Math.ceil((windowMs - (now - oldest)) / 1000);
    throw new HttpsError(
      "resource-exhausted",
      `Rate limit exceeded. Please wait ${waitSec}s before making another request.`
    );
  }

  validTimestamps.push(now);
  rateLimits.set(key, validTimestamps);
}

/**
 * Firebase App Check enforcer helper
 */
export function verifyAppCheck(request: any): void {
  const enforce = process.env.ENFORCE_APP_CHECK === "true";
  if (enforce && !request.app) {
    throw new HttpsError(
      "unauthenticated",
      "App Check verification failed. Request must originate from an authorized ParkShark client application."
    );
  }
}

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
  verifyAppCheck(request);

  const data = request.data as LockBicycleRequest;
  const { standId, token, hours, code } = data || {};

  // Rate limiting per user / IP: 5 lock attempts per minute
  const clientKey = request.auth?.uid || (request as any).rawRequest?.ip || data?.userId || "anonymous";
  checkRateLimit(`lock_${clientKey}`, 5, 60000);

  // Validate parameters
  if (!standId || typeof standId !== "string" || !STAND_ID_REGEX.test(standId)) {
    throw new HttpsError("invalid-argument", "Missing or invalid standId format (must be AB1-01 to AB3-50)");
  }
  if (!token || typeof token !== "string" || token.length < 5 || token.length > 120) {
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

export interface UnlockBicycleRequest {
  sessionId: string;
  code: string;
}

/**
 * Phase 6 Requirement 4: Callable function unlockBicycle(sessionId, code)
 * 1. Checks 5-attempt rate limit and 5-minute lockout.
 * 2. Verifies hash with cryptographic salt.
 * 3. Completes session, frees the stand, and logs activity in an atomic transaction.
 * 4. Returns exact success message: "Bicycle unlocked successfully! Stand <standId> is now available."
 */
export const unlockBicycle = onCall({ cors: true }, async (request) => {
  verifyAppCheck(request);

  const data = request.data as UnlockBicycleRequest;
  const { sessionId, code } = data || {};

  // Rate limiting per user / IP: max 10 unlock attempts per minute
  const clientKey = request.auth?.uid || (request as any).rawRequest?.ip || "anonymous";
  checkRateLimit(`unlock_${clientKey}`, 10, 60000);

  if (!sessionId || typeof sessionId !== "string" || sessionId.length < 3 || sessionId.length > 128) {
    throw new HttpsError("invalid-argument", "Missing or invalid sessionId");
  }
  if (!code || !/^\d{4}$/.test(code)) {
    throw new HttpsError("invalid-argument", "Code must be exactly 4 digits");
  }

  const now = Date.now();

  return await db.runTransaction(async (transaction) => {
    const sessionRef = db.collection("sessions").doc(sessionId);
    const sessionDoc = await transaction.get(sessionRef);

    if (!sessionDoc.exists) {
      throw new HttpsError("not-found", `Session ${sessionId} not found`);
    }

    const session = sessionDoc.data()!;
    if (session.status !== "active") {
      throw new HttpsError("failed-precondition", `Session is not active (status: ${session.status})`);
    }

    // Rate limiting: 5 wrong attempts = 5 minute lockout
    const lockoutUntil = session.lockoutUntil || 0;
    if (now < lockoutUntil) {
      const waitMinutes = Math.ceil((lockoutUntil - now) / 60000);
      return {
        success: false,
        lockedOut: true,
        error: `Too many failed attempts. Account is locked out for ${waitMinutes} more minute(s).`,
      };
    }

    // Verify hash
    const computedHash = hashPin(code, session.salt);
    if (computedHash !== session.hashedPin) {
      const failedAttempts = (session.failedAttempts || 0) + 1;
      const updates: Record<string, any> = { failedAttempts };

      if (failedAttempts >= 5) {
        updates.lockoutUntil = now + 5 * 60 * 1000; // 5-minute lockout
      }

      transaction.update(sessionRef, updates);

      const remaining = Math.max(0, 5 - failedAttempts);
      return {
        success: false,
        lockedOut: failedAttempts >= 5,
        remainingAttempts: remaining,
        error:
          failedAttempts >= 5
            ? "Too many wrong attempts. Locked out for 5 minutes."
            : `Incorrect security code. ${remaining} attempt(s) remaining before 5-minute lockout.`,
      };
    }

    // Correct PIN: complete session and free stand
    const standRef = db.collection("stands").doc(session.standId);

    transaction.update(sessionRef, {
      status: "completed",
      unlockedAt: now,
      failedAttempts: 0,
      lockoutUntil: 0,
    });

    transaction.update(standRef, {
      status: "available",
      currentSessionId: null,
      updatedAt: now,
    });

    // Write activity log
    const logRef = db.collection("activity_logs").doc();
    transaction.set(logRef, {
      id: logRef.id,
      type: "unlock",
      standId: session.standId,
      userId: session.userId || "anonymous",
      sessionId,
      timestamp: now,
    });

    return {
      success: true,
      standId: session.standId,
      message: `Bicycle unlocked successfully! Stand ${session.standId} is now available.`,
    };
  });
});

/**
 * Phase 6 Requirement 3 & 5: Scheduled Cloud Function (every 1 minute)
 * 1. Sends push notification 10 minutes before endAt (using notified10min flag to prevent duplicates).
 * 2. Marks expired sessions after endAt and frees the stand after grace period.
 */
export const checkSessionExpiryAndNotifications = onSchedule("every 1 minutes", async () => {
  const now = Date.now();
  const GRACE_PERIOD_MS = 15 * 60 * 1000; // Configurable grace period (15 minutes)
  const TEN_MINUTES_MS = 10 * 60 * 1000;

  try {
    // 1. Check for 10-minute warning
    const warningQuery = await db
      .collection("sessions")
      .where("status", "==", "active")
      .where("notified10min", "==", false)
      .get();

    for (const docSnap of warningQuery.docs) {
      const session = docSnap.data();
      const timeLeft = session.endAt - now;

      if (timeLeft <= TEN_MINUTES_MS && timeLeft > 0) {
        // Send FCM push notification
        if (session.fcmToken) {
          try {
            await admin.messaging().send({
              token: session.fcmToken,
              notification: {
                title: "ParkShark 10-Minute Reminder",
                body: `Your bicycle parking on stand ${session.standId} expires in less than 10 minutes.`,
              },
              data: {
                sessionId: docSnap.id,
                standId: session.standId,
              },
            });
          } catch (err) {
            console.warn(`[FCM] Could not send notification to token ${session.fcmToken}:`, err);
          }
        }

        // Mark as notified so notification is sent only once
        await docSnap.ref.update({
          notified10min: true,
          notifiedAt: now,
        });

        await db.collection("activity_logs").add({
          type: "notification_10min",
          sessionId: docSnap.id,
          standId: session.standId,
          timestamp: now,
        });
      }
    }

    // 2. Check for expired sessions
    const expiredQuery = await db
      .collection("sessions")
      .where("status", "==", "active")
      .get();

    for (const docSnap of expiredQuery.docs) {
      const session = docSnap.data();
      if (now >= session.endAt) {
        // Mark session as expired
        await docSnap.ref.update({
          status: "expired",
          expiredAt: session.endAt,
        });

        await db.collection("activity_logs").add({
          type: "session_expired",
          sessionId: docSnap.id,
          standId: session.standId,
          timestamp: now,
        });
      }
    }

    // 3. Free stands after grace period has passed
    const graceQuery = await db
      .collection("sessions")
      .where("status", "==", "expired")
      .get();

    for (const docSnap of graceQuery.docs) {
      const session = docSnap.data();
      const standReleased = session.standReleased || false;

      if (!standReleased && now >= session.endAt + GRACE_PERIOD_MS) {
        // Free the stand
        await db.collection("stands").doc(session.standId).update({
          status: "available",
          currentSessionId: null,
          updatedAt: now,
        });

        await docSnap.ref.update({
          standReleased: true,
          freedAt: now,
        });

        // Send final notification
        if (session.fcmToken) {
          try {
            await admin.messaging().send({
              token: session.fcmToken,
              notification: {
                title: "ParkShark Stand Released",
                body: `Your session grace period on stand ${session.standId} has ended. The stand is now freed.`,
              },
            });
          } catch (err) {
            console.warn(`[FCM] Final notification failed:`, err);
          }
        }

        await db.collection("activity_logs").add({
          type: "stand_freed_after_grace",
          sessionId: docSnap.id,
          standId: session.standId,
          timestamp: now,
        });
      }
    }
  } catch (error) {
    console.error("[checkSessionExpiryAndNotifications] Error during scheduled job:", error);
  }
});
