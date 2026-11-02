import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  createComplaintRecord,
  updateComplaintRecordStatus,
  calculateComplaintMetrics,
  validateComplaintInput,
  type RegisterComplaintInput,
  type Complaint,
} from "../utils/complaints.ts";

describe("Complaint Registration and Management System", () => {
  test("validates complaint inputs correctly", () => {
    const invalidInput: RegisterComplaintInput = {
      studentId: "",
      studentName: "",
      studentPhone: "",
      category: "lock_jammed",
      priority: "high",
      title: "Bad",
      description: "Short",
    };

    const result = validateComplaintInput(invalidInput);
    assert.equal(result.valid, false);
    assert.ok(result.errors.length >= 3);

    const validInput: RegisterComplaintInput = {
      studentId: "21BCE1042",
      studentName: "Arjun Sharma",
      studentPhone: "+919876543210",
      standId: "AB1-05",
      category: "lock_jammed",
      priority: "high",
      title: "Smart lock cable jammed",
      description: "Unable to lock bicycle into rack slot AB1-05.",
    };

    const validResult = validateComplaintInput(validInput);
    assert.equal(validResult.valid, true);
    assert.equal(validResult.errors.length, 0);
  });

  test("creates a complaint record with generated ticket ID and pending status", () => {
    const input: RegisterComplaintInput = {
      studentId: "21BCE1042",
      studentName: "Arjun Sharma",
      studentPhone: "+919876543210",
      standId: "AB1-05",
      category: "lock_jammed",
      priority: "high",
      title: "Smart lock cable jammed",
      description: "Unable to lock bicycle into rack slot AB1-05.",
    };

    const record = createComplaintRecord(input, () => "CMP-2026-TEST");
    assert.equal(record.id, "CMP-2026-TEST");
    assert.equal(record.status, "pending");
    assert.equal(record.building, "AB1");
    assert.equal(record.studentId, "21BCE1042");
    assert.equal(record.category, "lock_jammed");
    assert.equal(record.priority, "high");
    assert.ok(typeof record.createdAt === "number");
  });

  test("updates status from pending to investigating and then resolved with admin notes", () => {
    let complaint: Complaint = createComplaintRecord(
      {
        studentId: "21BCE1042",
        studentName: "Arjun Sharma",
        studentPhone: "+919876543210",
        standId: "AB2-12",
        category: "stand_damaged",
        priority: "urgent",
        title: "Stand rack misaligned",
        description: "Bolt is loose and rack wobbles dangerously.",
      },
      () => "CMP-2026-0001"
    );

    assert.equal(complaint.status, "pending");
    assert.equal(complaint.building, "AB2");

    // Admin marks investigating
    complaint = updateComplaintRecordStatus(
      complaint,
      "investigating",
      "Technician assigned to inspect AB2 rack 12"
    );
    assert.equal(complaint.status, "investigating");
    assert.equal(complaint.adminNotes, "Technician assigned to inspect AB2 rack 12");
    assert.equal(complaint.resolvedAt, undefined);

    // Admin resolves issue
    complaint = updateComplaintRecordStatus(
      complaint,
      "resolved",
      "Anchor bolts tightened and rack stability verified."
    );
    assert.equal(complaint.status, "resolved");
    assert.equal(complaint.adminNotes, "Anchor bolts tightened and rack stability verified.");
    assert.ok(typeof complaint.resolvedAt === "number");
  });

  test("calculates complaint summary metrics accurately", () => {
    const list: Complaint[] = [
      createComplaintRecord(
        {
          studentId: "21BCE1042",
          studentName: "A",
          studentPhone: "1",
          category: "qr_damaged",
          priority: "low",
          title: "Title 1",
          description: "Description 1",
        },
        () => "CMP-1"
      ),
      createComplaintRecord(
        {
          studentId: "21BCE1088",
          studentName: "B",
          studentPhone: "2",
          category: "lock_jammed",
          priority: "medium",
          title: "Title 2",
          description: "Description 2",
        },
        () => "CMP-2"
      ),
    ];

    list[0] = updateComplaintRecordStatus(list[0], "investigating");
    list[1] = updateComplaintRecordStatus(list[1], "resolved");

    const metrics = calculateComplaintMetrics(list);
    assert.equal(metrics.total, 2);
    assert.equal(metrics.pending, 0);
    assert.equal(metrics.investigating, 1);
    assert.equal(metrics.resolved, 1);
    assert.equal(metrics.rejected, 0);
  });
});
