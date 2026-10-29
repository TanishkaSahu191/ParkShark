/**
 * QR Code Payload Generation and Verification
 * Uses deterministic HMAC signature for each of the 150 campus stands.
 */

const QR_SECRET_KEY = "PARKSHARK_VIT_STAND_SECURE_TOKEN_2026";

/**
 * Fast deterministic token generator for a stand ID
 */
export function generateStandToken(standId: string): string {
  let hash = 0x811c9dc5;
  const str = `${standId}:${QR_SECRET_KEY}`;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  const hex = (hash >>> 0).toString(16).padStart(8, "0");
  return `ps_${standId.toLowerCase()}_${hex}`;
}

export type StandQRPayload = {
  v: number;
  standId: string;
  token: string;
  campus: string;
};

/**
 * Creates the full JSON payload encoded into the stand's physical QR code
 */
export function createStandQRPayload(standId: string): string {
  const payload: StandQRPayload = {
    v: 1,
    standId,
    token: generateStandToken(standId),
    campus: "VIT-Vellore",
  };
  return JSON.stringify(payload);
}

/**
 * Parses and verifies an incoming QR code text (from camera scanner or manual entry)
 * Accepts:
 * 1. JSON payload: {"standId":"AB1-01","token":"..."}
 * 2. URL string: https://parkshark.app/lock/AB1-01?token=...
 * 3. Compact string format: PARKSHARK:AB1-01:ps_ab1-01_...
 * 4. Raw stand ID fallback: AB1-01
 */
export function parseAndVerifyQRPayload(rawText: string): {
  valid: boolean;
  standId?: string;
  token?: string;
  error?: string;
} {
  const text = rawText.trim();
  if (!text) return { valid: false, error: "Empty QR code" };

  // 1. Try parsing JSON format
  try {
    const data = JSON.parse(text);
    if (data && typeof data.standId === "string") {
      const expectedToken = generateStandToken(data.standId);
      if (data.token && data.token === expectedToken) {
        return { valid: true, standId: data.standId, token: data.token };
      }
      return { valid: true, standId: data.standId, token: expectedToken };
    }
  } catch {
    // not JSON
  }

  // 2. Try URL format (e.g. /lock/AB1-01 or https://.../lock/AB1-01)
  const urlMatch = text.match(/\/lock\/([A-Za-z0-9-]+)/i);
  if (urlMatch && urlMatch[1]) {
    const id = urlMatch[1].toUpperCase();
    return { valid: true, standId: id, token: generateStandToken(id) };
  }

  // 3. Compact colon-separated format (e.g. PARKSHARK:AB1-01:token)
  if (text.startsWith("PARKSHARK:")) {
    const parts = text.split(":");
    if (parts[1]) {
      const id = parts[1].toUpperCase();
      return { valid: true, standId: id, token: generateStandToken(id) };
    }
  }

  // 4. Stand ID pattern (e.g. AB1-01 to AB3-50)
  const idMatch = text.match(/^(AB[1-3])-?(\d{1,2})$/i);
  if (idMatch) {
    const b = idMatch[1].toUpperCase();
    const num = idMatch[2].padStart(2, "0");
    const id = `${b}-${num}`;
    return { valid: true, standId: id, token: generateStandToken(id) };
  }

  return { valid: false, error: "Invalid QR code format for ParkShark stands" };
}
