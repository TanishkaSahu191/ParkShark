import * as admin from "firebase-admin";
import { onCall } from "firebase-functions/v2/https";
import * as crypto from "crypto";

admin.initializeApp();
export const db = admin.firestore();

// Helper to hash 4-digit code with salt
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
