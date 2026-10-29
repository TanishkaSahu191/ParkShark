import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { generateStandToken, parseAndVerifyQRPayload } from "../utils/qr.ts";

/**
 * Mock Firestore Transactional Engine simulating Firestore transactional concurrency semantics
 */
class MockFirestoreTransactionalStore {
  stands: Map<string, { status: "available" | "occupied"; currentSessionId: string | null }>;
  sessions: Map<string, any>;
  activityLogs: any[];

  constructor() {
    this.stands = new Map();
    this.sessions = new Map();
    this.activityLogs = [];
  }

  standVersions: Map<string, number> = new Map();

  setStand(id: string, status: "available" | "occupied") {
    this.stands.set(id, { status, currentSessionId: null });
    this.standVersions.set(id, 1);
  }

  /**
   * Simulates Firestore runTransaction with optimistic concurrency control.
   * If two transactions race on the same stand document, only one succeeds and the second fails.
   */
  async runTransaction<T>(updateFunction: (t: any) => Promise<T>): Promise<T> {
    const stageUpdates: (() => void)[] = [];
    const readVersions = new Map<string, number>();

    const transaction = {
      getStand: async (id: string) => {
        // Yield execution to allow concurrent callers to interleave reads
        await new Promise((r) => setTimeout(r, 10));
        const stand = this.stands.get(id);
        if (!stand) return null;
        readVersions.set(id, this.standVersions.get(id) || 1);
        return { ...stand };
      },
      hasActiveSession: async (userId: string) => {
        for (const s of this.sessions.values()) {
          if (s.userId === userId && s.status === "active") return true;
        }
        return false;
      },
      createSession: (session: any) => {
        stageUpdates.push(() => {
          this.sessions.set(session.id, session);
        });
      },
      setStandOccupied: (id: string, sessionId: string) => {
        stageUpdates.push(() => {
          const curVersion = this.standVersions.get(id) || 1;
          const readVer = readVersions.get(id) || 0;
          if (curVersion !== readVer) {
            throw new Error(`failed-precondition: Stand ${id} is currently occupied (concurrent write conflict)`);
          }
          const cur = this.stands.get(id);
          if (!cur || cur.status !== "available") {
            throw new Error(`failed-precondition: Stand ${id} is not available or occupied`);
          }
          this.stands.set(id, { status: "occupied", currentSessionId: sessionId });
          this.standVersions.set(id, curVersion + 1);
        });
      },
      logActivity: (log: any) => {
        stageUpdates.push(() => {
          this.activityLogs.push(log);
        });
      },
    };

    // Execute user transaction logic
    const result = await updateFunction(transaction);

    // Commit staged updates atomically
    for (const commitAction of stageUpdates) {
      commitAction();
    }

    return result;
  }
}

/**
 * Implementation of lockBicycle business logic matching Cloud Functions transaction
 */
async function executeLockBicycle(
  store: MockFirestoreTransactionalStore,
  request: { standId: string; token: string; hours: number; code: string; userId: string }
) {
  const { standId, token, hours, code, userId } = request;

  // 1. Input validations
  if (![1, 2, 3].includes(hours)) throw new Error("invalid-argument: Duration must be 1, 2, or 3 hours");
  if (!code || !/^\d{4}$/.test(code)) throw new Error("invalid-argument: Security PIN must be exactly 4 digits");

  // 2. Token verification
  const expectedToken = generateStandToken(standId);
  if (token !== expectedToken) {
    throw new Error("permission-denied: Invalid stand QR verification token");
  }

  // 3. Atomic transaction execution
  return await store.runTransaction(async (t) => {
    // Check no active session
    const hasActive = await t.hasActiveSession(userId);
    if (hasActive) {
      throw new Error("already-exists: User already has an active parking session");
    }

    // Check stand availability
    const stand = await t.getStand(standId);
    if (!stand) {
      throw new Error(`not-found: Stand ${standId} not found`);
    }
    if (stand.status !== "available") {
      throw new Error(`failed-precondition: Stand ${standId} is currently ${stand.status} and cannot be locked`);
    }

    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = Date.now();

    t.createSession({
      id: sessionId,
      userId,
      standId,
      durationHours: hours,
      startAt: now,
      endAt: now + hours * 3600 * 1000,
      status: "active",
    });

    t.setStandOccupied(standId, sessionId);

    t.logActivity({
      type: "lock",
      standId,
      userId,
      timestamp: now,
      hours,
    });

    return { success: true, sessionId };
  });
}

describe("Phase 5: QR Verification and lockBicycle Transaction", () => {
  test("generates and verifies valid QR payload and tokens for stands", () => {
    const standId = "AB1-12";
    const token = generateStandToken(standId);
    assert.match(token, /^ps_ab1-12_[0-9a-f]{8}$/);

    const parsedJson = parseAndVerifyQRPayload(JSON.stringify({ standId, token }));
    assert.equal(parsedJson.valid, true);
    assert.equal(parsedJson.standId, "AB1-12");

    const parsedUrl = parseAndVerifyQRPayload("https://parkshark.app/lock/AB2-05");
    assert.equal(parsedUrl.valid, true);
    assert.equal(parsedUrl.standId, "AB2-05");

    const parsedRaw = parseAndVerifyQRPayload("ab3-20");
    assert.equal(parsedRaw.valid, true);
    assert.equal(parsedRaw.standId, "AB3-20");
  });

  test("rejects invalid PIN formats (must be exactly 4 digits)", async () => {
    const store = new MockFirestoreTransactionalStore();
    store.setStand("AB1-01", "available");
    const token = generateStandToken("AB1-01");

    await assert.rejects(
      async () => {
        await executeLockBicycle(store, {
          standId: "AB1-01",
          token,
          hours: 2,
          code: "123", // only 3 digits
          userId: "user-1",
        });
      },
      /exactly 4 digits/
    );

    await assert.rejects(
      async () => {
        await executeLockBicycle(store, {
          standId: "AB1-01",
          token,
          hours: 2,
          code: "12a4", // non-digits
          userId: "user-1",
        });
      },
      /exactly 4 digits/
    );
  });

  test("locks bicycle and writes activity log in an isolated transaction", async () => {
    const store = new MockFirestoreTransactionalStore();
    store.setStand("AB2-10", "available");
    const token = generateStandToken("AB2-10");

    const res = await executeLockBicycle(store, {
      standId: "AB2-10",
      token,
      hours: 2,
      code: "7890",
      userId: "student-alpha",
    });

    assert.equal(res.success, true);
    assert.ok(res.sessionId);
    assert.equal(store.stands.get("AB2-10")?.status, "occupied");
    assert.equal(store.sessions.size, 1);
    assert.equal(store.activityLogs.length, 1);
    assert.equal(store.activityLogs[0].type, "lock");
  });

  test("Requirement 6 Race Condition: Two users concurrently lock the same stand", async () => {
    const store = new MockFirestoreTransactionalStore();
    const standId = "AB1-25";
    store.setStand(standId, "available");
    const token = generateStandToken(standId);

    // Simulate User A and User B concurrently hitting lockBicycle
    const lockUserA = executeLockBicycle(store, {
      standId,
      token,
      hours: 1,
      code: "1111",
      userId: "user-A",
    });

    const lockUserB = executeLockBicycle(store, {
      standId,
      token,
      hours: 2,
      code: "2222",
      userId: "user-B",
    });

    // Execute concurrently with Promise.allSettled
    const results = await Promise.allSettled([lockUserA, lockUserB]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    // Exactly one transaction must succeed
    assert.equal(fulfilled.length, 1, "Exactly one user must win the race condition");
    // Exactly one transaction must fail due to failed-precondition (occupied)
    assert.equal(rejected.length, 1, "The second user must be rejected");

    const failureReason = (rejected[0] as PromiseRejectedResult).reason?.message;
    assert.match(
      failureReason,
      /failed-precondition|not available|occupied/,
      "Error must indicate stand is unavailable"
    );

    // Stand should be occupied and exactly 1 active session in database
    assert.equal(store.stands.get(standId)?.status, "occupied");
    assert.equal(store.sessions.size, 1);
  });

  test("rejects user who already has an active session", async () => {
    const store = new MockFirestoreTransactionalStore();
    store.setStand("AB1-01", "available");
    store.setStand("AB1-02", "available");

    const token1 = generateStandToken("AB1-01");
    const token2 = generateStandToken("AB1-02");

    // User locks stand 1
    await executeLockBicycle(store, {
      standId: "AB1-01",
      token: token1,
      hours: 2,
      code: "1234",
      userId: "student-busy",
    });

    // Same user attempts to lock stand 2 while session 1 is active
    await assert.rejects(
      async () => {
        await executeLockBicycle(store, {
          standId: "AB1-02",
          token: token2,
          hours: 1,
          code: "5678",
          userId: "student-busy",
        });
      },
      /already has an active parking session/
    );
  });
});
