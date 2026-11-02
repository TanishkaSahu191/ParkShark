import { create } from "zustand";
import { useBikesStore } from "./useBikesStore";

export type SessionStatus = "active" | "completed" | "expired";

export type ActivityType = "locked" | "unlocked" | "completed" | "expired";

export interface ActivityItem {
  id: string;
  type: ActivityType;
  standId: string;
  building: "AB1" | "AB2" | "AB3";
  slot: number;
  timestamp: number;
  durationHours?: number;
  details?: string;
}

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

const STORAGE_KEY_SESSION = "parkshark_active_session";
const STORAGE_KEY_FAILED = "parkshark_unlock_failed_attempts";
const STORAGE_KEY_LOCKOUT = "parkshark_unlock_lockout_until";
const STORAGE_KEY_FCM = "parkshark_fcm_token";
const STORAGE_KEY_ACTIVITIES = "parkshark_activity_feed";

const loadSavedSession = (): ParkingSession | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SESSION);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.endAt === "number" && parsed.status === "active") {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
};

const loadFailedAttempts = (): number => {
  if (typeof window === "undefined") return 0;
  try {
    return parseInt(localStorage.getItem(STORAGE_KEY_FAILED) || "0", 10) || 0;
  } catch {
    return 0;
  }
};

const loadLockoutUntil = (): number => {
  if (typeof window === "undefined") return 0;
  try {
    return parseInt(localStorage.getItem(STORAGE_KEY_LOCKOUT) || "0", 10) || 0;
  } catch {
    return 0;
  }
};

const loadFcmToken = (): string | null => {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(STORAGE_KEY_FCM) || null;
  } catch {
    return null;
  }
};

// Initial realistic mock activities (locked, unlocked, completed, expired)
const INITIAL_ACTIVITIES: ActivityItem[] = [
  {
    id: "act-01",
    type: "unlocked",
    standId: "AB2-05",
    building: "AB2",
    slot: 5,
    timestamp: Date.now() - 35 * 60 * 1000,
    durationHours: 1,
    details: "Unlocked early via PIN code",
  },
  {
    id: "act-02",
    type: "completed",
    standId: "AB2-05",
    building: "AB2",
    slot: 5,
    timestamp: Date.now() - 35 * 60 * 1000,
    durationHours: 1,
    details: "Session completed successfully",
  },
  {
    id: "act-03",
    type: "locked",
    standId: "AB2-05",
    building: "AB2",
    slot: 5,
    timestamp: Date.now() - 75 * 60 * 1000,
    durationHours: 1,
    details: "Locked for 1 hour allotment",
  },
  {
    id: "act-04",
    type: "completed",
    standId: "AB1-14",
    building: "AB1",
    slot: 14,
    timestamp: Date.now() - 24.1 * 3600 * 1000,
    durationHours: 2,
    details: "Bicycle returned and stand released",
  },
  {
    id: "act-05",
    type: "expired",
    standId: "AB3-02",
    building: "AB3",
    slot: 2,
    timestamp: Date.now() - 32 * 3600 * 1000,
    durationHours: 2,
    details: "Duration exceeded; auto-released after grace period",
  },
  {
    id: "act-06",
    type: "completed",
    standId: "AB2-08",
    building: "AB2",
    slot: 8,
    timestamp: Date.now() - 71.2 * 3600 * 1000,
    durationHours: 1,
    details: "Session completed on time",
  },
  {
    id: "act-07",
    type: "locked",
    standId: "AB1-30",
    building: "AB1",
    slot: 30,
    timestamp: Date.now() - 96 * 3600 * 1000,
    durationHours: 3,
    details: "Bicycle parked during lecture block",
  },
  {
    id: "act-08",
    type: "unlocked",
    standId: "AB1-30",
    building: "AB1",
    slot: 30,
    timestamp: Date.now() - 93.5 * 3600 * 1000,
    durationHours: 3,
    details: "Security code verified and lock opened",
  },
  {
    id: "act-09",
    type: "completed",
    standId: "AB3-21",
    building: "AB3",
    slot: 21,
    timestamp: Date.now() - 117.5 * 3600 * 1000,
    durationHours: 3,
    details: "Session completed smoothly",
  },
  {
    id: "act-10",
    type: "expired",
    standId: "AB2-15",
    building: "AB2",
    slot: 15,
    timestamp: Date.now() - 140 * 3600 * 1000,
    durationHours: 1,
    details: "Session marked expired by automated system",
  },
];

const loadSavedActivities = (): ActivityItem[] => {
  if (typeof window === "undefined") return INITIAL_ACTIVITIES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ACTIVITIES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  return INITIAL_ACTIVITIES;
};

interface SessionState {
  activeSession: ParkingSession | null;
  history: SessionHistoryItem[];
  activities: ActivityItem[];
  failedAttempts: number;
  lockoutUntil: number;
  fcmToken: string | null;
  setFcmToken: (token: string | null) => void;
  startSession: (standId: string, durationHours: number, pin: string) => { success: boolean; error?: string };
  unlockSession: (pin: string) => { success: boolean; error?: string; message?: string; lockedOut?: boolean };
  expireSession: () => void;
  reportIssue: (standId: string, issue: string) => void;
  markNotified10Min: () => void;
  recordFailedAttempt: () => { lockedOut: boolean; remainingAttempts: number; lockoutUntil: number };
  resetLockout: () => void;
  addActivity: (activity: Omit<ActivityItem, "id">) => void;
  forceReleaseSession: (standId: string) => void;
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
  activeSession: loadSavedSession(),
  history: INITIAL_HISTORY,
  activities: loadSavedActivities(),
  failedAttempts: loadFailedAttempts(),
  lockoutUntil: loadLockoutUntil(),
  fcmToken: loadFcmToken(),

  setFcmToken: (token) => {
    try {
      if (token) {
        localStorage.setItem(STORAGE_KEY_FCM, token);
      } else {
        localStorage.removeItem(STORAGE_KEY_FCM);
      }
    } catch {
      // ignore storage error
    }
    set({ fcmToken: token });
  },

  addActivity: (act) => {
    const item: ActivityItem = {
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      ...act,
    };
    const updated = [item, ...get().activities];
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVITIES, JSON.stringify(updated.slice(0, 50)));
    } catch {
      // ignore
    }
    set({ activities: updated });
  },

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

    // Save to localStorage so it survives page reload
    try {
      localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(newSession));
    } catch {
      // ignore
    }

    // Mark stand occupied in 3D & store
    bikesState.updateStandStatus(standId, "occupied");
    bikesState.recordStandUsage(standId);

    // Record locked activity
    get().addActivity({
      type: "locked",
      standId,
      building: stand.building,
      slot: stand.slot,
      timestamp: now,
      durationHours,
      details: `Bicycle locked at Stand ${standId} for ${durationHours} hr${durationHours > 1 ? "s" : ""}`,
    });

    set({ activeSession: newSession });
    return { success: true };
  },

  markNotified10Min: () => {
    const session = get().activeSession;
    if (!session || session.notified10min) return;

    const updated = { ...session, notified10min: true };
    try {
      localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(updated));
    } catch {
      // ignore
    }
    set({ activeSession: updated });
  },

  recordFailedAttempt: () => {
    const state = get();
    const newCount = state.failedAttempts + 1;
    let lockoutUntil = state.lockoutUntil;

    if (newCount >= 5) {
      lockoutUntil = Date.now() + 5 * 60 * 1000; // 5-minute lockout
    }

    try {
      localStorage.setItem(STORAGE_KEY_FAILED, String(newCount));
      localStorage.setItem(STORAGE_KEY_LOCKOUT, String(lockoutUntil));
    } catch {
      // ignore
    }

    set({ failedAttempts: newCount, lockoutUntil });
    return {
      lockedOut: newCount >= 5,
      remainingAttempts: Math.max(0, 5 - newCount),
      lockoutUntil,
    };
  },

  resetLockout: () => {
    try {
      localStorage.removeItem(STORAGE_KEY_FAILED);
      localStorage.removeItem(STORAGE_KEY_LOCKOUT);
    } catch {
      // ignore
    }
    set({ failedAttempts: 0, lockoutUntil: 0 });
  },

  unlockSession: (pin) => {
    const state = get();
    const session = state.activeSession;
    if (!session) return { success: false, error: "No active session to unlock" };

    // Check 5-minute lockout
    if (state.lockoutUntil && Date.now() < state.lockoutUntil) {
      const remainingSeconds = Math.ceil((state.lockoutUntil - Date.now()) / 1000);
      const remainingMinutes = Math.ceil(remainingSeconds / 60);
      return {
        success: false,
        lockedOut: true,
        error: `Too many failed attempts. Locked out for ${remainingMinutes} more minute${remainingMinutes > 1 ? "s" : ""}.`,
      };
    }

    // If lockout expired, reset attempts
    if (state.lockoutUntil && Date.now() >= state.lockoutUntil) {
      state.resetLockout();
    }

    // Validate PIN
    if (session.pin !== pin) {
      const { lockedOut, remainingAttempts } = state.recordFailedAttempt();
      if (lockedOut) {
        return {
          success: false,
          lockedOut: true,
          error: "Too many wrong attempts. Locked out for 5 minutes.",
        };
      }
      return {
        success: false,
        error: `Incorrect 4-digit code. ${remainingAttempts} attempt${remainingAttempts === 1 ? "" : "s"} remaining before 5-minute lockout.`,
      };
    }

    // Correct PIN: reset failed attempts
    state.resetLockout();

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

    // Record both unlocked and completed activities
    get().addActivity({
      type: "unlocked",
      standId: session.standId,
      building: session.building,
      slot: session.slot,
      timestamp: now,
      durationHours: session.durationHours,
      details: `Stand ${session.standId} unlocked with PIN`,
    });

    get().addActivity({
      type: "completed",
      standId: session.standId,
      building: session.building,
      slot: session.slot,
      timestamp: now,
      durationHours: session.durationHours,
      details: `Session completed successfully; Stand ${session.standId} is now available`,
    });

    // Clear session from localStorage
    try {
      localStorage.removeItem(STORAGE_KEY_SESSION);
    } catch {
      // ignore
    }

    set((s) => ({
      activeSession: null,
      history: [completedItem, ...s.history],
    }));

    return {
      success: true,
      message: `Bicycle unlocked successfully! Stand ${session.standId} is now available.`,
    };
  },

  expireSession: () => {
    const session = get().activeSession;
    if (!session) return;

    const now = Date.now();
    const expiredItem: SessionHistoryItem = {
      id: session.id,
      standId: session.standId,
      building: session.building,
      slot: session.slot,
      startAt: session.startAt,
      endAt: session.endAt,
      durationHours: session.durationHours,
      status: "expired",
      unlockedAt: now,
    };

    useBikesStore.getState().updateStandStatus(session.standId, "available");

    get().addActivity({
      type: "expired",
      standId: session.standId,
      building: session.building,
      slot: session.slot,
      timestamp: now,
      durationHours: session.durationHours,
      details: `Parking session for Stand ${session.standId} expired and released`,
    });

    try {
      localStorage.removeItem(STORAGE_KEY_SESSION);
    } catch {
      // ignore
    }

    set((state) => ({
      activeSession: null,
      history: [expiredItem, ...state.history],
    }));
  },

  forceReleaseSession: (standId) => {
    const session = get().activeSession;
    const now = Date.now();

    useBikesStore.getState().updateStandStatus(standId, "available");

    get().addActivity({
      type: "completed",
      standId,
      building: (standId.split("-")[0] as any) || "AB1",
      slot: Number(standId.split("-")[1]) || 1,
      timestamp: now,
      details: `Administrator force-released Stand ${standId}`,
    });

    if (session && session.standId === standId) {
      try {
        localStorage.removeItem(STORAGE_KEY_SESSION);
      } catch {
        // ignore
      }
      set({ activeSession: null });
    }
  },

  reportIssue: (standId, issue) => {
    console.warn(`[Report] Issue reported for ${standId}:`, issue);
    useBikesStore.getState().updateStandStatus(standId, "maintenance");
  },
}));
