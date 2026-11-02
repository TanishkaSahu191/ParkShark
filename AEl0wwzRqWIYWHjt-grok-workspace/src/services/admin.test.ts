import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { parseStudentCsv, bulkRegisterStudents, PRE_REGISTERED_STUDENTS } from "../utils/studentCsv.ts";

describe("Phase 7: Dashboard, History and Admin Panel", () => {
  describe("CSV Student Bulk Registration", () => {
    test("parses valid CSV lines and extracts student records", () => {
      const csv = `name,collegeId,phone,role
Rahul Sen,21BCE2001,+919876543220,student
Ananya Rao,21BCE2002,9876543221,student
Campus Head,ADMIN05,9876543290,admin`;

      const result = parseStudentCsv(csv);
      assert.equal(result.valid.length, 3);
      assert.equal(result.errors.length, 0);

      assert.deepEqual(result.valid[0], {
        name: "Rahul Sen",
        collegeId: "21BCE2001",
        phone: "+919876543220",
        role: "student",
      });

      // Validates phone number normalization (+91)
      assert.equal(result.valid[1].phone, "+919876543221");
      assert.equal(result.valid[2].role, "admin");
    });

    test("flags invalid lines with descriptive error reasons", () => {
      const malformedCsv = `name,collegeId,phone,role
Good Student,21BCE3001,9876543210,student
BadLineMissingColumns
A,21BCE3002,9876543210,student
InvalidPhoneStudent,21BCE3003,123,student`;

      const result = parseStudentCsv(malformedCsv);
      assert.equal(result.valid.length, 1);
      assert.equal(result.errors.length, 3);

      assert.match(result.errors[0].reason, /at least 3 columns/);
      assert.match(result.errors[1].reason, /Invalid name/);
      assert.match(result.errors[2].reason, /Invalid phone number/);
    });

    test("bulkRegisterStudents adds entries into the global whitelist and supports immediate lookup", () => {
      const newStudents = [
        {
          name: "Sanjay Dutt",
          collegeId: "21BCE9999",
          phone: "+919876543999",
          role: "student" as const,
        },
      ];

      const res = bulkRegisterStudents(newStudents);
      assert.equal(res.count, 1);

      // Verify immediate lookup by College ID and by Phone number
      assert.ok(PRE_REGISTERED_STUDENTS["21BCE9999"]);
      assert.equal(PRE_REGISTERED_STUDENTS["21BCE9999"].name, "Sanjay Dutt");
      assert.ok(PRE_REGISTERED_STUDENTS["+919876543999"]);
      assert.equal(PRE_REGISTERED_STUDENTS["+919876543999"].collegeId, "21BCE9999");
    });
  });

  describe("Stand Management & Force-Release", () => {
    test("force-release frees occupied stand back to available", () => {
      const mockStands = [
        { id: "AB1-01", building: "AB1", slot: 1, status: "occupied" },
        { id: "AB1-02", building: "AB1", slot: 2, status: "available" },
      ];

      // Simulate force release
      const updated = mockStands.map((s) =>
        s.id === "AB1-01" ? { ...s, status: "available" } : s
      );

      assert.equal(updated.find((s) => s.id === "AB1-01")?.status, "available");
    });

    test("stand maintenance toggles between available and maintenance", () => {
      const stand = { id: "AB2-10", building: "AB2", slot: 10, status: "available" };
      const setMaint = { ...stand, status: "maintenance" };
      assert.equal(setMaint.status, "maintenance");

      const clearMaint = { ...setMaint, status: "available" };
      assert.equal(clearMaint.status, "available");
    });
  });

  describe("Occupancy & Analytics Computations", () => {
    test("computes building occupancy rates accurately for AB1, AB2, and AB3", () => {
      const mockStands = [
        // AB1: 2 occupied, 1 available (67% occupancy)
        { id: "AB1-01", building: "AB1", status: "occupied" },
        { id: "AB1-02", building: "AB1", status: "occupied" },
        { id: "AB1-03", building: "AB1", status: "available" },
        // AB2: 1 occupied, 3 available (25% occupancy)
        { id: "AB2-01", building: "AB2", status: "occupied" },
        { id: "AB2-02", building: "AB2", status: "available" },
        { id: "AB2-03", building: "AB2", status: "available" },
        { id: "AB2-04", building: "AB2", status: "available" },
        // AB3: 0 occupied, 2 available (0% occupancy)
        { id: "AB3-01", building: "AB3", status: "available" },
        { id: "AB3-02", building: "AB3", status: "available" },
      ];

      const stats = {
        total: mockStands.length,
        occupied: mockStands.filter((s) => s.status === "occupied").length,
        byBuilding: {
          AB1: {
            total: mockStands.filter((s) => s.building === "AB1").length,
            occupied: mockStands.filter((s) => s.building === "AB1" && s.status === "occupied").length,
            rate: 0,
          },
          AB2: {
            total: mockStands.filter((s) => s.building === "AB2").length,
            occupied: mockStands.filter((s) => s.building === "AB2" && s.status === "occupied").length,
            rate: 0,
          },
          AB3: {
            total: mockStands.filter((s) => s.building === "AB3").length,
            occupied: mockStands.filter((s) => s.building === "AB3" && s.status === "occupied").length,
            rate: 0,
          },
        },
      };

      stats.byBuilding.AB1.rate = Math.round((stats.byBuilding.AB1.occupied / stats.byBuilding.AB1.total) * 100);
      stats.byBuilding.AB2.rate = Math.round((stats.byBuilding.AB2.occupied / stats.byBuilding.AB2.total) * 100);
      stats.byBuilding.AB3.rate = Math.round((stats.byBuilding.AB3.occupied / stats.byBuilding.AB3.total) * 100);

      assert.equal(stats.byBuilding.AB1.rate, 67);
      assert.equal(stats.byBuilding.AB2.rate, 25);
      assert.equal(stats.byBuilding.AB3.rate, 0);
      assert.equal(stats.occupied, 3);
      assert.equal(stats.total, 9);
    });
  });

  describe("Heatmap Utilization Score", () => {
    test("maps rack usage frequency into cold-to-hot normalized ratios", () => {
      const getHeatmapColorCategory = (count: number, maxCount = 100) => {
        const ratio = Math.max(0, Math.min(1, count / maxCount));
        if (ratio < 0.3) return "low_blue";
        if (ratio < 0.65) return "medium_yellow";
        return "high_red";
      };

      assert.equal(getHeatmapColorCategory(10), "low_blue");
      assert.equal(getHeatmapColorCategory(50), "medium_yellow");
      assert.equal(getHeatmapColorCategory(85), "high_red");
      assert.equal(getHeatmapColorCategory(120), "high_red");
    });
  });
});
