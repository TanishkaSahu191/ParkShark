import { test, describe } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

function hashPin(pin: string, salt: string): string {
  return crypto.createHmac("sha256", salt).update(pin).digest("hex");
}

class MockFirestoreUnlockStore {
  stands: Map<string, { id: string; status: "available" | "occupied"; currentSessionId: string | null }>;
  sessions: Map<string, any>;
  activityLogs: any[];

  constructor() {
    this.stands = new Map();
    this.sessions = new Map();
    this.activityLogs = [];
  }

  setStand(id: string, status: "available" | "occupied", currentSessionId: string | null = null) {
    this.stands.set(id, { id, status, currentSessionId });
  }

  setSession(id: string, sessionData: any) {
    this.sessions.set(id, { id, ...sessionData });
  }

  async runTransaction<T>(updateFunction: (t: any) => Promise<T>): Promise<T> {
    const stagedUpdates: (() => void)[] = [];

    const transaction = {
      getSession: async (id: string) => {
        const session = this.sessions.get(id);
        return session ? { ...session } : null;
      },
      updateSession: (id: string, updates: any) => {
        stagedUpdates.push(() => {
          const cur = this.sessions.get(id) || {};
          this.sessions.set(id, { ...cur, ...updates });
        });
      },
      updateStand: (id: string, updates: any) => {
        stagedUpdates.push(() => {
          const cur = this.stands.get(id) || {};
          this.stands.set(id, { ...cur, ...updates });
        });
      },
      logActivity: (log: any) => {
        stagedUpdates.push(() => {
          this.activityLogs.push(log);
        });
      },
    };

    const result = await updateFunction(transaction);

    for (const commit of stagedUpdates) {
      commit();
    }

    return result;
  }
}

/**
 * Implementation of unlockBicycle matching Cloud Functions specification
 */
async function executeUnlockBicycle(
  store: MockFirestoreUnlockStore,
  request: { sessionId: string; code: string; now?: number }
) {
  const { sessionId, code } = request;
  const now = request.now ?? Date.now();

  if (!sessionId) throw new Error("invalid-argument: Missing sessionId");
  if (!code || !/^\d{4}$/.test(code)) throw new Error("invalid-argument: Code must be exactly 4 digits");

  return await store.runTransaction(async (t) => {
    const session = await t.getSession(sessionId);
    if (!session) {
      throw new Error(`not-found: Session ${sessionId} not found`);
    }

    if (session.status !== "active") {
      throw new Error(`failed-precondition: Session is not active (status: ${session.status})`);
    }

    // Rate limiting: 5-minute lockout check
    const lockoutUntil = session.lockoutUntil || 0;
    if (now < lockoutUntil) {
      const waitMinutes = Math.ceil((lockoutUntil - now) / 60000);
      return {
        success: false,
        lockedOut: true,
        error: `resource-exhausted: Locked out. Wait ${waitMinutes} more minute(s).`,
      };
    }

    // Verify cryptographic PIN hash
    const computedHash = hashPin(code, session.salt);
    if (computedHash !== session.hashedPin) {
      const failedAttempts = (session.failedAttempts || 0) + 1;
      const updates: Record<string, any> = { failedAttempts };

      if (failedAttempts >= 5) {
        updates.lockoutUntil = now + 5 * 60 * 1000; // 5-minute lockout
      }

      t.updateSession(sessionId, updates);

      const remaining = Math.max(0, 5 - failedAttempts);
      return {
        success: false,
        lockedOut: failedAttempts >= 5,
        remainingAttempts: remaining,
        error:
          failedAttempts >= 5
            ? "resource-exhausted: Too many wrong attempts. Locked out for 5 minutes."
            : `permission-denied: Incorrect code. ${remaining} attempt(s) remaining.`,
      };
    }

    // PIN is correct: complete session and free stand
    t.updateSession(sessionId, {
      status: "completed",
      unlockedAt: now,
      failedAttempts: 0,
      lockoutUntil: 0,
    });

    t.updateStand(session.standId, {
      status: "available",
      currentSessionId: null,
      updatedAt: now,
    });

    t.logActivity({
      type: "unlock",
      standId: session.standId,
      userId: session.userId || "guest",
      sessionId,
      timestamp: now,
    });

    return {
      success: true,
      standId: session.standId,
      message: `Bicycle unlocked successfully! Stand ${session.standId} is now available.`,
    };
  });
}

/**
 * Scheduled job simulation
 */
function runScheduledExpiry(
  store: MockFirestoreUnlockStore,
  now: number,
  gracePeriodMs = 15 * 60 * 1000
) {
  const TEN_MINUTES_MS = 10 * 60 * 1000;
  const notifications: any[] = [];

  for (const [id, session] of store.sessions.entries()) {
    if (session.status === "active") {
      const timeLeft = session.endAt - now;

      // 10-minute warning check
      if (timeLeft <= TEN_MINUTES_MS && timeLeft > 0 && !session.notified10min) {
        session.notified10min = true;
        notifications.push({
          type: "10min_push",
          standId: session.standId,
          sessionId: id,
        });
      }

      // Expiry check
      if (now >= session.endAt) {
        session.status = "expired";
        session.expiredAt = session.endAt;
      }
    }

    // Stand freeing after grace period
    if (session.status === "expired" && !session.standReleased) {
      if (now >= session.endAt + gracePeriodMs) {
        session.standReleased = true;
        const stand = store.stands.get(session.standId);
        if (stand) {
          stand.status = "available";
          stand.currentSessionId = null;
        }
        notifications.push({
          type: "grace_expired_freed",
          standId: session.standId,
          sessionId: id,
        });
      }
    }
  }

  return notifications;
}

describe("Phase 6: Timer, Notifications, and Unlock System", () => {
  test("Callable unlockBicycle verifies hash, completes session, frees stand, and returns exact success message", async () => {
    const store = new MockFirestoreUnlockStore();
    const standId = "AB1-12";
    const sessionId = "session_test_01";
    const salt = "test_crypto_salt_99";
    const code = "4321";
    const hashedPin = hashPin(code, salt);

    store.setStand(standId, "occupied", sessionId);
    store.setSession(sessionId, {
      standId,
      status: "active",
      salt,
      hashedPin,
      userId: "user-vit-42",
      endAt: Date.now() + 3600 * 1000,
    });

    const result = await executeUnlockBicycle(store, {
      sessionId,
      code,
    });

    // Requirement 6: exact success message verification
    assert.equal(result.success, true);
    assert.equal(result.message, "Bicycle unlocked successfully! Stand AB1-12 is now available.");

    // Requirement 4: Stand freed and session completed
    assert.equal(store.stands.get(standId)?.status, "available");
    assert.equal(store.stands.get(standId)?.currentSessionId, null);
    assert.equal(store.sessions.get(sessionId)?.status, "completed");
    assert.equal(store.activityLogs.length, 1);
    assert.equal(store.activityLogs[0].type, "unlock");
  });

  test("Rate limiting: limits to 5 wrong attempts, then enforces a 5-minute lockout", async () => {
    const store = new MockFirestoreUnlockStore();
    const standId = "AB2-04";
    const sessionId = "session_test_lockout";
    const salt = "salt_secure_xyz";
    const correctCode = "8899";
    const wrongCode = "0000";
    const hashedPin = hashPin(correctCode, salt);

    store.setStand(standId, "occupied", sessionId);
    store.setSession(sessionId, {
      standId,
      status: "active",
      salt,
      hashedPin,
      failedAttempts: 0,
      lockoutUntil: 0,
    });

    const baseTime = Date.now();

    // 4 failed attempts: each records failed attempt and returns error
    for (let i = 1; i <= 4; i++) {
      const res = await executeUnlockBicycle(store, { sessionId, code: wrongCode, now: baseTime });
      assert.equal(res.success, false);
      assert.match(res.error || "", /permission-denied: Incorrect code/);
      assert.equal(store.sessions.get(sessionId)?.failedAttempts, i);
      assert.equal(store.sessions.get(sessionId)?.lockoutUntil || 0, 0);
    }

    // 5th failed attempt: triggers 5-minute lockout
    const res5 = await executeUnlockBicycle(store, { sessionId, code: wrongCode, now: baseTime });
    assert.equal(res5.success, false);
    assert.equal(res5.lockedOut, true);
    assert.match(res5.error || "", /resource-exhausted: Too many wrong attempts/);

    const sessionAfter5 = store.sessions.get(sessionId);
    assert.equal(sessionAfter5?.failedAttempts, 5);
    assert.equal(sessionAfter5?.lockoutUntil, baseTime + 5 * 60 * 1000);

    // Any attempt during lockout (even with correct PIN) is blocked!
    const resDuringLockout = await executeUnlockBicycle(store, {
      sessionId,
      code: correctCode,
      now: baseTime + 2 * 60 * 1000, // 2 minutes into lockout
    });
    assert.equal(resDuringLockout.success, false);
    assert.equal(resDuringLockout.lockedOut, true);
    assert.match(resDuringLockout.error || "", /resource-exhausted: Locked out/);

    // After 5 minutes, lockout expires and correct PIN unlocks successfully!
    const resAfterExpiry = await executeUnlockBicycle(store, {
      sessionId,
      code: correctCode,
      now: baseTime + 5.1 * 60 * 1000, // 5.1 minutes later
    });

    assert.equal(resAfterExpiry.success, true);
    assert.equal(resAfterExpiry.message, "Bicycle unlocked successfully! Stand AB2-04 is now available.");
    assert.equal(store.stands.get(standId)?.status, "available");
    assert.equal(store.sessions.get(sessionId)?.status, "completed");
  });

  test("Requirement 3 & 5: 10-minute warning notification and stand release after grace period", () => {
    const store = new MockFirestoreUnlockStore();
    const standId = "AB3-18";
    const sessionId = "session_expiry_test";
    const startTime = Date.now();
    const endAt = startTime + 3600 * 1000; // 1 hour session

    store.setStand(standId, "occupied", sessionId);
    store.setSession(sessionId, {
      standId,
      status: "active",
      startAt: startTime,
      endAt,
      notified10min: false,
    });

    // 1. At 20 minutes before endAt: no notification
    let notifs = runScheduledExpiry(store, endAt - 20 * 60 * 1000);
    assert.equal(notifs.length, 0);
    assert.equal(store.sessions.get(sessionId)?.notified10min, false);

    // 2. At 8 minutes before endAt: sends 10-minute push notification and sets notified10min flag
    notifs = runScheduledExpiry(store, endAt - 8 * 60 * 1000);
    assert.equal(notifs.length, 1);
    assert.equal(notifs[0].type, "10min_push");
    assert.equal(store.sessions.get(sessionId)?.notified10min, true);

    // 3. Next minute check does NOT send duplicate notification
    notifs = runScheduledExpiry(store, endAt - 7 * 60 * 1000);
    assert.equal(notifs.length, 0, "Flag notified10min prevents duplicate notifications");

    // 4. At endAt: marks session "expired", stand remains held during grace period
    notifs = runScheduledExpiry(store, endAt + 1000);
    assert.equal(store.sessions.get(sessionId)?.status, "expired");
    assert.equal(store.stands.get(standId)?.status, "occupied", "Stand still occupied during grace period");

    // 5. After grace period (15 minutes after endAt): stand is freed and final notification emitted
    notifs = runScheduledExpiry(store, endAt + 16 * 60 * 1000);
    assert.equal(notifs.length, 1);
    assert.equal(notifs[0].type, "grace_expired_freed");
    assert.equal(store.stands.get(standId)?.status, "available", "Stand freed after grace period");
  });
});
