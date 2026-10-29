import { create } from "zustand";
import { INITIAL_STANDS, type Stand, type StandStatus } from "@/data/stands";
import {
  findNearestAvailableStand,
  groupStandsByBuilding,
  type BuildingGroupSummary,
  type NearestStandResult,
} from "@/utils/distance";

type OccupancyStats = {
  total: number;
  available: number;
  occupied: number;
  maintenance: number;
  byBuilding: Record<"AB1" | "AB2" | "AB3", { total: number; available: number; occupied: number; maintenance: number }>;
};

interface BikesState {
  stands: Stand[];
  selectedStandId: string | null;
  hoveredStandId: string | null;
  navigatingStandId: string | null;
  playerPosition: { x: number; z: number };

  setStands: (stands: Stand[]) => void;
  selectStand: (id: string | null) => void;
  setHoveredStand: (id: string | null) => void;
  setNavigatingStandId: (id: string | null) => void;
  setPlayerPosition: (x: number, z: number) => void;
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
  playerPosition: { x: 0, z: 80 }, // Initial spawn area near campus center

  setStands: (stands) => set({ stands }),

  selectStand: (id) => set({ selectedStandId: id }),

  setHoveredStand: (id) => set({ hoveredStandId: id }),

  setNavigatingStandId: (id) => set({ navigatingStandId: id }),

  setPlayerPosition: (x, z) =>
    set((state) => {
      // Avoid micro-updates if delta is tiny (< 0.2m)
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
        AB1: { total: 0, available: 0, occupied: 0, maintenance: 0 },
        AB2: { total: 0, available: 0, occupied: 0, maintenance: 0 },
        AB3: { total: 0, available: 0, occupied: 0, maintenance: 0 },
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

    return stats;
  },
}));
