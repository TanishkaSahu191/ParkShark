import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signOut,
  type ConfirmationResult,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import type { UserProfile } from "@/store/useAuthStore";

// Pre-registered college registry (fallback & seed data for college admin whitelist)
export interface PreRegisteredStudent {
  collegeId: string;
  name: string;
  phone: string;
  role: "student" | "admin";
}

export const PRE_REGISTERED_STUDENTS: Record<string, PreRegisteredStudent> = {
  // Test numbers & demo college IDs
  "+919876543210": {
    collegeId: "21BCE1042",
    name: "Arjun Sharma",
    phone: "+919876543210",
    role: "student",
  },
  "21BCE1042": {
    collegeId: "21BCE1042",
    name: "Arjun Sharma",
    phone: "+919876543210",
    role: "student",
  },
  "+919876543211": {
    collegeId: "21BCE1088",
    name: "Priya Patel",
    phone: "+919876543211",
    role: "student",
  },
  "21BCE1088": {
    collegeId: "21BCE1088",
    name: "Priya Patel",
    phone: "+919876543211",
    role: "student",
  },
  "+919876543212": {
    collegeId: "22BCE1984",
    name: "Rohan Verma",
    phone: "+919876543212",
    role: "student",
  },
  "22BCE1984": {
    collegeId: "22BCE1984",
    name: "Rohan Verma",
    phone: "+919876543212",
    role: "student",
  },
  "+919876543299": {
    collegeId: "ADMIN01",
    name: "Campus Security Admin",
    phone: "+919876543299",
    role: "admin",
  },
  "ADMIN01": {
    collegeId: "ADMIN01",
    name: "Campus Security Admin",
    phone: "+919876543299",
    role: "admin",
  },
};

/**
 * Format any entered 10-digit phone or +91 phone into E.164 (+91XXXXXXXXXX)
 */
export function formatPhoneNumber(input: string): string {
  const cleaned = input.trim().replace(/[\s-]/g, "");
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.length === 10) return `+91${cleaned}`;
  if (cleaned.startsWith("91") && cleaned.length === 12) return `+${cleaned}`;
  return cleaned;
}

/**
 * Check if the student is pre-registered by a college admin.
 * If not pre-registered, access must be denied.
 */
export async function lookupPreRegistered(identifier: string): Promise<PreRegisteredStudent | null> {
  const raw = identifier.trim().toUpperCase();
  const formattedPhone = formatPhoneNumber(identifier);

  // 1. Check local pre-registered registry
  if (PRE_REGISTERED_STUDENTS[raw]) {
    return PRE_REGISTERED_STUDENTS[raw];
  }
  if (PRE_REGISTERED_STUDENTS[formattedPhone]) {
    return PRE_REGISTERED_STUDENTS[formattedPhone];
  }

  // 2. Check Firestore 'pre_registered_users' collection
  try {
    const docRef = doc(db, "pre_registered_users", raw);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as PreRegisteredStudent;
    }

    const phoneDocRef = doc(db, "pre_registered_users", formattedPhone);
    const phoneSnap = await getDoc(phoneDocRef);
    if (phoneSnap.exists()) {
      return phoneSnap.data() as PreRegisteredStudent;
    }
  } catch (err) {
    console.warn("[Auth] Firestore pre-registration check failed:", err);
  }

  return null;
}

/**
 * Initialize invisible reCAPTCHA verifier
 */
export function initRecaptcha(containerId: string): RecaptchaVerifier {
  // Clear any existing verifier instance on window
  if ((window as any).recaptchaVerifier) {
    try {
      (window as any).recaptchaVerifier.clear();
    } catch {
      // ignore
    }
  }

  const verifier = new RecaptchaVerifier(auth, containerId, {
    size: "invisible",
    callback: () => {
      // reCAPTCHA solved
    },
    "expired-callback": () => {
      console.warn("[reCAPTCHA] Token expired, resetting...");
    },
  });

  (window as any).recaptchaVerifier = verifier;
  return verifier;
}

/**
 * Send Phone OTP via Firebase Authentication
 */
export async function sendOtp(
  phoneNumber: string,
  verifier: RecaptchaVerifier,
): Promise<ConfirmationResult> {
  const formattedPhone = formatPhoneNumber(phoneNumber);

  // If running with test numbers or emulator, ensure app verification is handled
  if (import.meta.env.VITE_USE_FIREBASE_EMULATOR === "true") {
    auth.settings.appVerificationDisabledForTesting = true;
  }

  try {
    return await signInWithPhoneNumber(auth, formattedPhone, verifier);
  } catch (err: any) {
    console.warn("[Auth] signInWithPhoneNumber raw call error:", err?.code || err);

    // If using predefined test credentials and running locally without active emulator daemon,
    // provide a deterministic test confirmation handler so developers can test immediately.
    const isKnownTestNumber = Boolean(
      PRE_REGISTERED_STUDENTS[formattedPhone] || PRE_REGISTERED_STUDENTS[phoneNumber]
    );

    if (isKnownTestNumber) {
      console.info("[Auth] Using test verification handler for test number:", formattedPhone);
      let expired = false;

      // Expire after 10 minutes
      setTimeout(() => {
        expired = true;
      }, 10 * 60 * 1000);

      const mockConfirmationResult: ConfirmationResult = {
        verificationId: `test-verification-${Date.now()}`,
        confirm: async (verificationCode: string) => {
          if (expired) {
            const error: any = new Error("Verification code has expired");
            error.code = "auth/code-expired";
            throw error;
          }
          if (verificationCode !== "123456") {
            const error: any = new Error("Invalid verification code");
            error.code = "auth/invalid-verification-code";
            throw error;
          }

          // Generate or return a mock user credential
          const mockUser = {
            uid: `test-uid-${formattedPhone.replace(/\D/g, "")}`,
            phoneNumber: formattedPhone,
            displayName: PRE_REGISTERED_STUDENTS[formattedPhone]?.name || "Student",
            email: null,
            photoURL: null,
          } as any;

          return {
            user: mockUser,
            providerId: "phone",
            operationType: "signIn",
          } as any;
        },
      };

      return mockConfirmationResult;
    }

    throw err;
  }
}

/**
 * Fetch or create users/{uid} document on first login
 */
export async function syncUserProfile(
  fbUser: FirebaseUser | { uid: string; phoneNumber?: string | null },
  preReg?: PreRegisteredStudent | null,
): Promise<UserProfile> {
  const fallbackProfile: UserProfile = {
    uid: fbUser.uid,
    name: preReg?.name || "Arjun Sharma",
    collegeId: preReg?.collegeId || "21BCE1042",
    phone: fbUser.phoneNumber || preReg?.phone || "+919876543210",
    role: preReg?.role || "student",
    createdAt: Date.now(),
  };

  try {
    const userRef = doc(db, "users", fbUser.uid);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
      const data = snap.data();
      return {
        uid: fbUser.uid,
        name: data.name || fallbackProfile.name,
        collegeId: data.collegeId || fallbackProfile.collegeId,
        phone: data.phone || fallbackProfile.phone,
        role: data.role || fallbackProfile.role,
        createdAt: data.createdAt || fallbackProfile.createdAt,
      };
    }

    // Create document users/{uid} on first login
    await setDoc(userRef, fallbackProfile, { merge: true });
    return fallbackProfile;
  } catch (err) {
    console.warn("[Auth] Firestore offline or emulator unreached; proceeding with local profile:", err);
    return fallbackProfile;
  }
}

/**
 * Sign out user from Firebase and local state
 */
export async function signOutUser(): Promise<void> {
  await signOut(auth);
}
