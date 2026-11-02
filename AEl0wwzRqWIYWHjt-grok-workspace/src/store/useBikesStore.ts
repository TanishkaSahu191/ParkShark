import { create } from "zustand";
import { INITIAL_STANDS, type Stand, type StandStatus } from "@/data/stands";
import {
  findNearestAvailableStand,
  groupStandsByBuilding,
  type BuildingGroupSummary,
  type NearestStandResult,
} from "@/utils/distance";

export type OccupancyStats = {
  total: number;
  available: number;
  occupied: number;
  maintenance: number;
  byBuilding: Record<"AB1" | "AB2" | "AB3", { total: number; available: number; occupied: number; maintenance: number; rate: number }>;
};

// Seed realistic usage statistics across stands for the 3D heatmap
const generateInitialUsage = (): Record<string, number> => {
  const usage: Record<string, number> = {};
  for (const stand of INITIAL_STANDS) {
    const slot = stand.slot;
    // AB1 is closest to academic blocks -> highest traffic
    // AB2 has moderate traffic, AB3 has steady baseline traffic
    const base = stand.building === "AB1" ? 65 : stand.building === "AB2" ? 42 : 28;
    // Low slot numbers are right beside building walkway doors -> even higher
    const slotBonus = Math.max(0, 30 - Math.floor(slot * 0.6));
    const noise = ((slot * 17) % 15) - 7;
    usage[stand.id] = Math.max(5, Math.min(100, base + slotBonus + noise));
  }
  return usage;
};

interface BikesState {
  stands: Stand[];
  selectedStandId: string | null;
  hoveredStandId: string | null;
  navigatingStandId: string | null;
  playerPosition: { x: number; z: number };
  showLocationTracer: boolean;
  userTracedLocation: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    placeName: string;
    campusCoords: { x: number; z: number };
  } | null;

  // Phase 7 Requirement 3: 3D Scene Heatmap State
  heatmapMode: boolean;
  standUsageCounts: Record<string, number>;
  toggleHeatmapMode: () => void;
  setHeatmapMode: (active: boolean) => void;
  recordStandUsage: (standId: string) => void;

  // Phase 7 Requirement 2: Admin stand management
  forceReleaseStand: (standId: string) => { success: boolean; standId: string };
  editStand: (id: string, updates: Partial<Stand>) => void;

  setStands: (stands: Stand[]) => void;
  selectStand: (id: string | null) => void;
  setHoveredStand: (id: string | null) => void;
  setNavigatingStandId: (id: string | null) => void;
  setPlayerPosition: (x: number, z: number) => void;
  setShowLocationTracer: (show: boolean) => void;
  setUserTracedLocation: (loc: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    placeName: string;
    campusCoords: { x: number; z: number };
  } | null) => void;
  updateStandStatus: (id: string, status: StandStatus) => void;

  getStandById: (id: string) => Stand | undefined;
  getNearestAvailableStand: (px?: number, pz?: number) => NearestStandResult | null;
  getOccupancyStats: () => OccupancyStats;
  getBuildingSummaries: () => Record<"AB1" | "AB2" | "AB3", BuildingGroupSummary>;
}

export const useBikesStore = create<BikesState>((set, get) => ({
  stands: INITIAL_STANDS,
  selectedStandId: null,
  hoveredStandId: null,
  navigatingStandId: null,
  playerPosition: { x: 0, z: 80 },
  showLocationTracer: false,
  userTracedLocation: null,

  // Heatmap defaults
  heatmapMode: false,
  standUsageCounts: generateInitialUsage(),

  toggleHeatmapMode: () => set((state) => ({ heatmapMode: !state.heatmapMode })),
  setHeatmapMode: (heatmapMode) => set({ heatmapMode }),

  recordStandUsage: (standId) =>
    set((state) => ({
      standUsageCounts: {
        ...state.standUsageCounts,
        [standId]: (state.standUsageCounts[standId] || 0) + 1,
      },
    })),

  forceReleaseStand: (standId) => {
    set((state) => ({
      stands: state.stands.map((s) =>
        s.id === standId ? { ...s, status: "available" } : s
      ),
    }));
    return { success: true, standId };
  },

  editStand: (id, updates) =>
    set((state) => ({
      stands: state.stands.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    })),

  setStands: (stands) => set({ stands }),

  selectStand: (id) => set({ selectedStandId: id }),

  setHoveredStand: (id) => set({ hoveredStandId: id }),

  setNavigatingStandId: (id) => set({ navigatingStandId: id }),

  setShowLocationTracer: (showLocationTracer) => set({ showLocationTracer }),

  setUserTracedLocation: (userTracedLocation) => set({ userTracedLocation }),

  setPlayerPosition: (x, z) =>
    set((state) => {
      const dx = Math.abs(state.playerPosition.x - x);
      const dz = Math.abs(state.playerPosition.z - z);
      if (dx < 0.2 && dz < 0.2) return state;
      return { playerPosition: { x, z } };
    }),

  updateStandStatus: (id, status) =>
    set((state) => ({
      stands: state.stands.map((s) => (s.id === id ? { ...s, status } : s)),
    })),

  getStandById: (id) => get().stands.find((s) => s.id === id),

  getNearestAvailableStand: (px, pz) => {
    const stands = get().stands;
    const x = px !== undefined ? px : get().playerPosition.x;
    const z = pz !== undefined ? pz : get().playerPosition.z;
    return findNearestAvailableStand({ x, z }, stands);
  },

  getBuildingSummaries: () => {
    return groupStandsByBuilding(get().stands);
  },

  getOccupancyStats: () => {
    const stands = get().stands;
    const stats: OccupancyStats = {
      total: stands.length,
      available: 0,
      occupied: 0,
      maintenance: 0,
      byBuilding: {
        AB1: { total: 0, available: 0, occupied: 0, maintenance: 0, rate: 0 },
        AB2: { total: 0, available: 0, occupied: 0, maintenance: 0, rate: 0 },
        AB3: { total: 0, available: 0, occupied: 0, maintenance: 0, rate: 0 },
      },
    };

    for (const s of stands) {
      if (s.status === "available") stats.available++;
      else if (s.status === "occupied") stats.occupied++;
      else if (s.status === "maintenance") stats.maintenance++;

      const b = stats.byBuilding[s.building];
      if (b) {
        b.total++;
        if (s.status === "available") b.available++;
        else if (s.status === "occupied") b.occupied++;
        else if (s.status === "maintenance") b.maintenance++;
      }
    }

    // Compute occupancy rates (%)
    for (const key of ["AB1", "AB2", "AB3"] as const) {
      const b = stats.byBuilding[key];
      b.rate = b.total > 0 ? Math.round((b.occupied / b.total) * 100) : 0;
    }

    return stats;
  },
}));
