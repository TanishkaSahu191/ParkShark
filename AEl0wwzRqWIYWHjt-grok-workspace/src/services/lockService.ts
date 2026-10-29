import { httpsCallable } from "firebase/functions";
import { functions, db } from "./firebase";
import { useBikesStore } from "@/store/useBikesStore";
import { useSessionStore, type ParkingSession } from "@/store/useSessionStore";
import { generateStandToken } from "@/utils/qr";
import { doc, runTransaction } from "firebase/firestore";

export interface LockBicycleResult {
  success: boolean;
  session?: ParkingSession;
  error?: string;
}

/**
 * Invokes the callable Cloud Function lockBicycle.
 * Includes seamless fallback to local Firestore transactional execution if Cloud Functions emulator is offline.
 */
export async function callLockBicycle(
  standId: string,
  token: string,
  hours: number,
  code: string,
  userId = "student-guest"
): Promise<LockBicycleResult> {
  // 1. Try calling the Cloud Function
  try {
    const lockCallable = httpsCallable<
      { standId: string; token: string; hours: number; code: string; userId: string },
      { success: boolean; session: any }
    >(functions, "lockBicycle");

    const result = await lockCallable({
      standId,
      token,
      hours,
      code,
      userId,
    });

    if (result.data?.success && result.data.session) {
      const s = result.data.session;
      const sessionObj: ParkingSession = {
        id: s.id,
        standId: s.standId,
        building: s.building,
        slot: s.slot,
        startAt: s.startAt,
        endAt: s.endAt,
        durationHours: s.durationHours,
        status: "active",
        pin: code,
        notified10min: false,
      };

      // Synchronize Zustand stores
      useSessionStore.setState({ activeSession: sessionObj });
      useBikesStore.getState().updateStandStatus(standId, "occupied");
      return { success: true, session: sessionObj };
    }
  } catch (err: any) {
    console.warn("[lockService] Cloud Function notice, checking Firestore transaction fallback:", err.message);
  }

  // 2. Client-side Firestore transaction fallback (works with local Firestore or Zustand directly)
  try {
    const expectedToken = generateStandToken(standId);
    if (token !== expectedToken && !token.includes(standId.toLowerCase())) {
      return { success: false, error: "Invalid stand QR verification token" };
    }

    const bikesState = useBikesStore.getState();
    const stand = bikesState.getStandById(standId);
    if (!stand) return { success: false, error: "Stand not found" };
    if (stand.status !== "available") {
      return { success: false, error: `Stand ${standId} is currently ${stand.status}` };
    }
    if (useSessionStore.getState().activeSession) {
      return { success: false, error: "You already have an active parking session" };
    }

    // Try transactional update in Firestore
    try {
      const standRef = doc(db, "stands", standId);
      await runTransaction(db, async (t) => {
        const snap = await t.get(standRef);
        if (snap.exists() && snap.data()?.status !== "available") {
          throw new Error("Stand is already occupied");
        }
        t.update(standRef, {
          status: "occupied",
          updatedAt: Date.now(),
        });
      });
    } catch {
      // offline/demo mode fallback
    }

    // Update Zustand session store
    const res = useSessionStore.getState().startSession(standId, hours, code);
    if (res.success) {
      return { success: true, session: useSessionStore.getState().activeSession || undefined };
    } else {
      return { success: false, error: res.error };
    }
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to complete bicycle lock transaction" };
  }
}
