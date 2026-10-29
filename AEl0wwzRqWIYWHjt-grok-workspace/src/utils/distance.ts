import type { Stand } from "@/data/stands";

export interface Position2D {
  x: number;
  z: number;
}

export interface NearestStandResult {
  stand: Stand;
  distance: number;
}

export interface BuildingGroupSummary {
  building: "AB1" | "AB2" | "AB3";
  total: number;
  available: number;
  occupied: number;
  maintenance: number;
  freeCountText: string; // e.g. "AB1: 44/50 free"
  stands: Stand[];
}

/**
 * Calculate Euclidean horizontal distance between two points in 3D campus (x, z)
 */
export function calculateDistance2D(x1: number, z1: number, x2: number, z2: number): number {
  const dx = x2 - x1;
  const dz = z2 - z1;
  return Math.hypot(dx, dz);
}

/**
 * Find the nearest stand that has status === "available"
 * Returns null if no stands are available.
 */
export function findNearestAvailableStand(
  playerPos: Position2D,
  stands: Stand[]
): NearestStandResult | null {
  const availableStands = stands.filter((s) => s.status === "available");
  if (availableStands.length === 0) return null;

  let nearest = availableStands[0];
  let minDistance = calculateDistance2D(playerPos.x, playerPos.z, nearest.position.x, nearest.position.z);

  for (let i = 1; i < availableStands.length; i++) {
    const stand = availableStands[i];
    const dist = calculateDistance2D(playerPos.x, playerPos.z, stand.position.x, stand.position.z);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = stand;
    }
  }

  return {
    stand: nearest,
    distance: Math.round(minDistance * 10) / 10,
  };
}

/**
 * Group stands by building (AB1, AB2, AB3) and compute occupancy statistics
 */
export function groupStandsByBuilding(
  stands: Stand[]
): Record<"AB1" | "AB2" | "AB3", BuildingGroupSummary> {
  const groups: Record<"AB1" | "AB2" | "AB3", BuildingGroupSummary> = {
    AB1: { building: "AB1", total: 0, available: 0, occupied: 0, maintenance: 0, freeCountText: "", stands: [] },
    AB2: { building: "AB2", total: 0, available: 0, occupied: 0, maintenance: 0, freeCountText: "", stands: [] },
    AB3: { building: "AB3", total: 0, available: 0, occupied: 0, maintenance: 0, freeCountText: "", stands: [] },
  };

  for (const stand of stands) {
    const g = groups[stand.building];
    if (g) {
      g.total += 1;
      g.stands.push(stand);
      if (stand.status === "available") g.available += 1;
      else if (stand.status === "occupied") g.occupied += 1;
      else if (stand.status === "maintenance") g.maintenance += 1;
    }
  }

  for (const key of ["AB1", "AB2", "AB3"] as const) {
    groups[key].freeCountText = `${key}: ${groups[key].available}/${groups[key].total} free`;
  }

  return groups;
}

/**
 * Sort stands by distance from the player
 */
export function sortStandsByDistance(
  playerPos: Position2D,
  stands: Stand[]
): Array<Stand & { distance: number }> {
  return stands
    .map((stand) => ({
      ...stand,
      distance: Math.round(calculateDistance2D(playerPos.x, playerPos.z, stand.position.x, stand.position.z) * 10) / 10,
    }))
    .sort((a, b) => a.distance - b.distance);
}
