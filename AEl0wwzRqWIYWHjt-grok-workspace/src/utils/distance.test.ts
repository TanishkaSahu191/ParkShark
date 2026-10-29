import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateDistance2D,
  findNearestAvailableStand,
  groupStandsByBuilding,
  sortStandsByDistance,
} from "./distance.ts";
import type { Stand } from "@/data/stands";

describe("Distance and Nearest-Stand Utilities", () => {
  const mockStands: Stand[] = [
    {
      id: "AB1-01",
      building: "AB1",
      slot: 1,
      position: { x: 0, z: 10 },
      face: 1,
      status: "occupied", // Closer (10m), but occupied!
    },
    {
      id: "AB1-02",
      building: "AB1",
      slot: 2,
      position: { x: 0, z: 20 },
      face: 1,
      status: "available", // 20m away, available
    },
    {
      id: "AB2-01",
      building: "AB2",
      slot: 1,
      position: { x: 30, z: 0 },
      face: 1,
      status: "available", // 30m away, available
    },
    {
      id: "AB2-02",
      building: "AB2",
      slot: 2,
      position: { x: 5, z: 5 },
      face: 1,
      status: "maintenance", // Very close, but under maintenance!
    },
    {
      id: "AB3-01",
      building: "AB3",
      slot: 1,
      position: { x: 50, z: 50 },
      face: 1,
      status: "available", // 70.7m away
    },
  ];

  it("calculates 2D Euclidean distance accurately (Pythagorean 3-4-5 theorem)", () => {
    const dist = calculateDistance2D(0, 0, 3, 4);
    assert.equal(dist, 5);

    const distZero = calculateDistance2D(10.5, -20.2, 10.5, -20.2);
    assert.equal(distZero, 0);

    const distArbitrary = calculateDistance2D(10, 20, 15, 25);
    assert.equal(Math.round(distArbitrary * 100) / 100, 7.07);
  });

  it("finds the nearest stand that is AVAILABLE and skips occupied/maintenance", () => {
    const playerPos = { x: 0, z: 0 };
    const nearest = findNearestAvailableStand(playerPos, mockStands);

    assert.ok(nearest !== null, "Expected a nearest stand result");
    assert.equal(nearest.stand.id, "AB1-02", "Should pick AB1-02 (20m) even though AB1-01 (10m) is closer because AB1-01 is occupied");
    assert.equal(nearest.distance, 20);
  });

  it("returns null when no available stands exist", () => {
    const playerPos = { x: 0, z: 0 };
    const allOccupied = mockStands.map((s) => ({ ...s, status: "occupied" as const }));
    const result = findNearestAvailableStand(playerPos, allOccupied);

    assert.equal(result, null);
  });

  it("returns null when stands list is empty", () => {
    const playerPos = { x: 0, z: 0 };
    const result = findNearestAvailableStand(playerPos, []);

    assert.equal(result, null);
  });

  it("groups stands by building (AB1, AB2, AB3) and counts occupancy", () => {
    const grouped = groupStandsByBuilding(mockStands);

    assert.equal(grouped.AB1.total, 2);
    assert.equal(grouped.AB1.available, 1);
    assert.equal(grouped.AB1.occupied, 1);
    assert.equal(grouped.AB1.freeCountText, "AB1: 1/2 free");

    assert.equal(grouped.AB2.total, 2);
    assert.equal(grouped.AB2.available, 1);
    assert.equal(grouped.AB2.maintenance, 1);
    assert.equal(grouped.AB2.freeCountText, "AB2: 1/2 free");

    assert.equal(grouped.AB3.total, 1);
    assert.equal(grouped.AB3.available, 1);
    assert.equal(grouped.AB3.freeCountText, "AB3: 1/1 free");
  });

  it("sorts stands by distance ascending", () => {
    const playerPos = { x: 0, z: 0 };
    const sorted = sortStandsByDistance(playerPos, mockStands);

    assert.equal(sorted[0].id, "AB2-02"); // dist ~7.1
    assert.equal(sorted[1].id, "AB1-01"); // dist 10
    assert.equal(sorted[2].id, "AB1-02"); // dist 20
    assert.equal(sorted[3].id, "AB2-01"); // dist 30
    assert.equal(sorted[4].id, "AB3-01"); // dist ~70.7

    for (let i = 0; i < sorted.length - 1; i++) {
      assert.ok(sorted[i].distance <= sorted[i + 1].distance, "Stands must be sorted ascending");
    }
  });
});
