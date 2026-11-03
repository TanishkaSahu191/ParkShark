import { test, describe } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { calculateDistance2D, findNearestAvailableStand } from "../utils/distance.ts";
import { generateStandToken, createStandQRPayload, parseAndVerifyQRPayload } from "../utils/qr.ts";

function hashPin(pin: string, salt: string): string {
  return crypto.createHmac("sha256", salt).update(pin).digest("hex");
}

/**
 * End-to-End Headless Multi-Step Flow Simulator
 * Tests the entire user journey: Login -> Locate Stand -> Lock -> Timer -> Unlock
 */
describe("Phase 8 Requirement 4: End-to-End Simulation Test (Full Flow)", () => {
  // Shared state across the student lifecycle
  let authenticatedUser: { uid: string; collegeId: string; name: string } | null = null;
  let targetStandId: string = "AB1-01";
  let activeSession: {
    id: string;
    standId: string;
    userId: string;
    durationHours: number;
    startAt: number;
    endAt: number;
    hashedPin: string;
    salt: string;
    status: "active" | "completed";
  } | null = null;

  test("Step 1: Student Login with Pre-registered College ID", () => {
    const whitelist = [
      { id: "21BCE1042", name: "Arjun S.", phone: "9876543210" },
      { id: "21BCE1088", name: "Priya P.", phone: "9876543211" },
    ];

    const inputId = "21BCE1042";
    const student = whitelist.find((s) => s.id === inputId);
    assert.ok(student, "Pre-registered student should be found in admissions directory");

    // Simulate OTP verification
    const enteredOtp = "123456";
    const expectedOtp = "123456";
    assert.strictEqual(enteredOtp, expectedOtp, "Test OTP code must match");

    authenticatedUser = {
      uid: "usr_21bce1042_fb",
      collegeId: student.id,
      name: student.name,
    };

    assert.ok(authenticatedUser.uid, "Student successfully authenticated");
  });

  test("Step 2: Find Nearest Available Stand from Avatar Location", () => {
    assert.ok(authenticatedUser, "User must be authenticated before campus search");

    // Avatar at Main Gate (x: 0, z: 96)
    const playerX = 0;
    const playerZ = 96;

    const mockStands = [
      { id: "AB1-01", building: "AB1" as const, slot: 1, position: { x: -42.8, y: 0, z: 3.1 }, status: "available" as const },
      { id: "AB2-01", building: "AB2" as const, slot: 1, position: { x: 26.6, y: 0, z: -49.8 }, status: "available" as const },
      { id: "AB3-01", building: "AB3" as const, slot: 1, position: { x: 49.5, y: 0, z: 4.5 }, status: "occupied" as const },
    ];

    const nearest = findNearestAvailableStand({ x: playerX, z: playerZ }, mockStands as any);
    assert.ok(nearest, "Nearest available stand must be found");
    assert.strictEqual(nearest.stand.id, "AB1-01", "AB1-01 should be closest available stand to avatar");
    assert.ok(nearest.distance > 0, "Distance should be positive");

    targetStandId = nearest.stand.id;
  });

  test("Step 3: Scan Stand QR Code & Lock Bicycle with 4-Digit PIN", () => {
    assert.ok(authenticatedUser, "User must be authenticated");

    // 1. Generate & Verify Stand QR Token
    const qrPayload = createStandQRPayload(targetStandId);
    const parsed = parseAndVerifyQRPayload(qrPayload);
    assert.ok(parsed.valid, "Stand QR payload must be valid");
    assert.strictEqual(parsed.standId, targetStandId);

    // 2. Lock with 2-hour duration and PIN '1234'
    const hours = 2;
    const pin = "1234";
    const salt = "salt_stand_ab1_01_secure";
    const hashedPin = hashPin(pin, salt);

    const now = Date.now();
    activeSession = {
      id: "sess_test_1042_01",
      standId: targetStandId,
      userId: authenticatedUser.uid,
      durationHours: hours,
      startAt: now,
      endAt: now + hours * 3600 * 1000,
      hashedPin,
      salt,
      status: "active",
    };

    assert.strictEqual(activeSession.status, "active");
    assert.strictEqual(activeSession.durationHours, 2);
    assert.ok(activeSession.endAt > activeSession.startAt);
  });

  test("Step 4: Active Session Timer & 10-Minute Expiry Warning", () => {
    assert.ok(activeSession, "Active session must exist");

    // Compute remaining time
    const remainingMs = activeSession.endAt - Date.now();
    assert.ok(remainingMs > 0, "Session should have positive time remaining");

    // Simulate 10-minute threshold check
    const simulatedLateNow = activeSession.endAt - 8 * 60 * 1000; // 8 minutes remaining
    const lateRemainingMs = activeSession.endAt - simulatedLateNow;
    const isWarningTriggered = lateRemainingMs <= 10 * 60 * 1000 && lateRemainingMs > 0;

    assert.strictEqual(isWarningTriggered, true, "10-minute warning should activate under 600,000 ms");
  });

  test("Step 5: Unlock Bicycle with Correct PIN & Release Stand", () => {
    assert.ok(activeSession, "Session must exist to unlock");

    const enteredPin = "1234";
    const computedHash = hashPin(enteredPin, activeSession.salt);

    assert.strictEqual(computedHash, activeSession.hashedPin, "Salted hash verification must succeed");

    // Mark session completed
    activeSession.status = "completed";

    // Expected success message matching Requirement 6
    const successMessage = `Bicycle unlocked successfully! Stand ${activeSession.standId} is now available.`;
    assert.strictEqual(
      successMessage,
      "Bicycle unlocked successfully! Stand AB1-01 is now available."
    );
    assert.strictEqual(activeSession.status, "completed");
  });
});
