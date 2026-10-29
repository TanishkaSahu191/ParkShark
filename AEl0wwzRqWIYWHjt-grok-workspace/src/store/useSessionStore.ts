import { create } from "zustand";
import { useBikesStore } from "./useBikesStore";

export type SessionStatus = "active" | "completed" | "expired";

export interface ParkingSession {
  id: string;
  standId: string;
  building: "AB1" | "AB2" | "AB3";
  slot: number;
  startAt: number; // timestamp ms
  endAt: number;   // timestamp ms
  durationHours: number;
  status: SessionStatus;
  pin: string; // 4-digit secret (mock store)
  notified10min?: boolean;
  unlockedAt?: number;
}

export interface SessionHistoryItem {
  id: string;
  standId: string;
  building: "AB1" | "AB2" | "AB3";
  slot: number;
  startAt: number;
  endAt: number;
  durationHours: number;
  status: "completed" | "expired";
  unlockedAt: number;
}

interface SessionState {
  activeSession: ParkingSession | null;
  history: SessionHistoryItem[];
  startSession: (standId: string, durationHours: number, pin: string) => { success: boolean; error?: string };
  unlockSession: (pin: string) => { success: boolean; error?: string };
  expireSession: () => void;
  reportIssue: (standId: string, issue: string) => void;
}

// Initial mock history for Dashboard
const INITIAL_HISTORY: SessionHistoryItem[] = [
  {
    id: "hist-01",
    standId: "AB1-14",
    building: "AB1",
    slot: 14,
    startAt: Date.now() - 26 * 3600 * 1000,
    endAt: Date.now() - 24 * 3600 * 1000,
    durationHours: 2,
    status: "completed",
    unlockedAt: Date.now() - 24.1 * 3600 * 1000,
  },
  {
    id: "hist-02",
    standId: "AB2-08",
    building: "AB2",
    slot: 8,
    startAt: Date.now() - 72 * 3600 * 1000,
    endAt: Date.now() - 71 * 3600 * 1000,
    durationHours: 1,
    status: "completed",
    unlockedAt: Date.now() - 71.2 * 3600 * 1000,
  },
  {
    id: "hist-03",
    standId: "AB3-21",
    building: "AB3",
    slot: 21,
    startAt: Date.now() - 120 * 3600 * 1000,
    endAt: Date.now() - 117 * 3600 * 1000,
    durationHours: 3,
    status: "completed",
    unlockedAt: Date.now() - 117.5 * 3600 * 1000,
  },
];

export const useSessionStore = create<SessionState>((set, get) => ({
  activeSession: null,
  history: INITIAL_HISTORY,

  startSession: (standId, durationHours, pin) => {
    const bikesState = useBikesStore.getState();
    const stand = bikesState.getStandById(standId);

    if (!stand) return { success: false, error: "Stand not found" };
    if (stand.status !== "available") return { success: false, error: "Stand is not available" };
    if (get().activeSession) return { success: false, error: "You already have an active parking session" };
    if (!/^\d{4}$/.test(pin)) return { success: false, error: "PIN must be exactly 4 digits" };

    const now = Date.now();
    const endAt = now + durationHours * 3600 * 1000;

    const newSession: ParkingSession = {
      id: `session-${Date.now()}`,
      standId,
      building: stand.building,
      slot: stand.slot,
      startAt: now,
      endAt,
      durationHours,
      status: "active",
      pin,
      notified10min: false,
    };

    // Mark stand occupied in 3D & store
    bikesState.updateStandStatus(standId, "occupied");

    set({ activeSession: newSession });
    return { success: true };
  },

  unlockSession: (pin) => {
    const session = get().activeSession;
    if (!session) return { success: false, error: "No active session to unlock" };

    if (session.pin !== pin) {
      return { success: false, error: "Incorrect 4-digit code. Please check your PIN." };
    }

    const now = Date.now();
    const completedItem: SessionHistoryItem = {
      id: session.id,
      standId: session.standId,
      building: session.building,
      slot: session.slot,
      startAt: session.startAt,
      endAt: session.endAt,
      durationHours: session.durationHours,
      status: "completed",
      unlockedAt: now,
    };

    // Release stand back to available in 3D & store
    useBikesStore.getState().updateStandStatus(session.standId, "available");

    set((state) => ({
      activeSession: null,
      history: [completedItem, ...state.history],
    }));

    return { success: true };
  },

  expireSession: () => {
    const session = get().activeSession;
    if (!session) return;

    const expiredItem: SessionHistoryItem = {
      id: session.id,
      standId: session.standId,
      building: session.building,
      slot: session.slot,
      startAt: session.startAt,
      endAt: session.endAt,
      durationHours: session.durationHours,
      status: "expired",
      unlockedAt: Date.now(),
    };

    useBikesStore.getState().updateStandStatus(session.standId, "available");

    set((state) => ({
      activeSession: null,
      history: [expiredItem, ...state.history],
    }));
  },

  reportIssue: (standId, issue) => {
    console.warn(`[Report] Issue reported for ${standId}:`, issue);
    useBikesStore.getState().updateStandStatus(standId, "maintenance");
  },
}));
