import { collection, onSnapshot, doc, updateDoc, writeBatch, getDocs, limit, query } from "firebase/firestore";
import { db } from "./firebase";
import { INITIAL_STANDS, type Stand, type StandStatus } from "@/data/stands";
import { useBikesStore } from "@/store/useBikesStore";

/**
 * Real-time subscription to bicycle stands in Firestore via onSnapshot.
 * Seamlessly stores updates in Zustand (useBikesStore).
 * Includes graceful offline / demo-mode fallback to INITIAL_STANDS.
 */
export function subscribeToStands(
  onUpdate?: (stands: Stand[]) => void
): () => void {
  const standsCol = collection(db, "stands");

  let unsubscribe: () => void = () => {};

  try {
    unsubscribe = onSnapshot(
      standsCol,
      (snapshot) => {
        if (!snapshot.empty) {
          const loadedStands: Stand[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            loadedStands.push({
              id: docSnap.id,
              building: data.building,
              slot: data.slot,
              position: data.position,
              face: data.face ?? 1,
              status: data.status as StandStatus,
              currentSessionId: data.currentSessionId ?? null,
              qrSecret: data.qrSecret,
            });
          });

          // Sort naturally by building and slot
          loadedStands.sort((a, b) => {
            if (a.building !== b.building) return a.building.localeCompare(b.building);
            return a.slot - b.slot;
          });

          useBikesStore.getState().setStands(loadedStands);
          onUpdate?.(loadedStands);
        } else {
          // If Firestore collection is empty, populate with INITIAL_STANDS
          useBikesStore.getState().setStands(INITIAL_STANDS);
          onUpdate?.(INITIAL_STANDS);
        }
      },
      (error) => {
        console.warn("[StandsService] Firestore onSnapshot notice (offline/demo):", error.message);
        // Fallback to local deterministic stands in Zustand
        useBikesStore.getState().setStands(INITIAL_STANDS);
        onUpdate?.(INITIAL_STANDS);
      }
    );
  } catch (err) {
    console.warn("[StandsService] Failed to establish onSnapshot listener:", err);
    useBikesStore.getState().setStands(INITIAL_STANDS);
    onUpdate?.(INITIAL_STANDS);
  }

  return () => {
    try {
      unsubscribe();
    } catch {
      // ignore
    }
  };
}

/**
 * Update a stand's status or currentSessionId in Firestore and Zustand
 */
export async function updateStandStatusRemote(
  standId: string,
  status: StandStatus,
  currentSessionId: string | null = null
): Promise<void> {
  // 1. Optimistic update in Zustand
  useBikesStore.getState().updateStandStatus(standId, status);

  // 2. Persist to Firestore
  try {
    const standRef = doc(db, "stands", standId);
    await updateDoc(standRef, {
      status,
      currentSessionId,
      updatedAt: Date.now(),
    });
  } catch (err) {
    console.warn("[StandsService] Remote stand status update skipped (offline/demo):", err);
  }
}

/**
 * Helper to auto-seed stands if collection is empty
 */
export async function seedStandsIfEmpty(): Promise<boolean> {
  try {
    const standsCol = collection(db, "stands");
    const q = query(standsCol, limit(1));
    const snap = await getDocs(q);

    if (snap.empty) {
      console.log("[StandsService] Stands collection empty, seeding 150 stands...");
      const batch = writeBatch(db);
      for (const stand of INITIAL_STANDS) {
        const standRef = doc(db, "stands", stand.id);
        batch.set(standRef, {
          ...stand,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
      await batch.commit();
      console.log("[StandsService] Successfully auto-seeded 150 stands in Firestore.");
      return true;
    }
    return false;
  } catch (err) {
    console.warn("[StandsService] Auto-seed check skipped:", err);
    return false;
  }
}
