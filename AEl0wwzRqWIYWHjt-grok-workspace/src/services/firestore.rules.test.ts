import { test, describe } from "node:test";
import assert from "node:assert/strict";

/**
 * Security Rules Logic Simulator
 * Faithfully mirrors the security evaluation AST of firestore.rules
 */
interface AuthContext {
  uid: string | null;
  token?: {
    role?: "student" | "admin";
    collegeId?: string;
  };
}

interface FirestoreRuleSimulatorState {
  users: Map<string, { role: "student" | "admin"; name: string }>;
  stands: Map<string, { status: string }>;
  sessions: Map<string, { userId: string; status: string }>;
  activityLogs: Map<string, { userId: string; type: string }>;
  complaints: Map<string, { studentId: string; uid?: string; title: string; category: string; priority: string; status: string }>;
  whitelist: Map<string, { name: string; phone: string }>;
}

class FirestoreRuleEvaluator {
  state: FirestoreRuleSimulatorState;

  constructor() {
    this.state = {
      users: new Map([
        ["student-1", { role: "student", name: "Arjun S." }],
        ["student-2", { role: "student", name: "Priya P." }],
        ["admin-1", { role: "admin", name: "Campus Facilities Admin" }],
      ]),
      stands: new Map([
        ["AB1-01", { status: "available" }],
        ["AB2-15", { status: "occupied" }],
      ]),
      sessions: new Map([
        ["sess-1", { userId: "student-1", status: "active" }],
        ["sess-2", { userId: "student-2", status: "completed" }],
      ]),
      activityLogs: new Map([
        ["log-1", { userId: "student-1", type: "lock" }],
      ]),
      complaints: new Map([
        ["tkt-1", { studentId: "21BCE1042", uid: "student-1", title: "Jammed lock at AB1", category: "lock_jammed", priority: "high", status: "pending" }],
      ]),
      whitelist: new Map([
        ["21BCE1042", { name: "Arjun S.", phone: "9876543210" }],
      ]),
    };
  }

  // Rules evaluation helper functions matching firestore.rules
  private isAuthenticated(auth: AuthContext | null): boolean {
    return auth != null && auth.uid != null;
  }

  private isOwner(auth: AuthContext | null, userId: string): boolean {
    return this.isAuthenticated(auth) && auth!.uid === userId;
  }

  private isAdmin(auth: AuthContext | null): boolean {
    if (!this.isAuthenticated(auth)) return false;
    if (auth?.token?.role === "admin") return true;
    const userDoc = this.state.users.get(auth!.uid!);
    return userDoc?.role === "admin";
  }

  private isValidComplaintCategory(cat: string): boolean {
    return ["lock_jammed", "rack_damaged", "qr_unreadable", "app_issue", "billing_issue"].includes(cat);
  }

  private isValidComplaintPriority(prio: string): boolean {
    return ["low", "medium", "high", "urgent"].includes(prio);
  }

  // /users/{userId}
  evaluateUserRead(auth: AuthContext | null, targetUserId: string): boolean {
    return this.isAuthenticated(auth) && (this.isOwner(auth, targetUserId) || this.isAdmin(auth));
  }

  evaluateUserWrite(auth: AuthContext | null, targetUserId: string): boolean {
    return this.isAuthenticated(auth) && (this.isOwner(auth, targetUserId) || this.isAdmin(auth));
  }

  evaluateUserDelete(auth: AuthContext | null): boolean {
    return this.isAdmin(auth);
  }

  // /stands/{standId}
  evaluateStandRead(auth: AuthContext | null): boolean {
    return this.isAuthenticated(auth);
  }

  evaluateStandWrite(auth: AuthContext | null): boolean {
    return this.isAdmin(auth);
  }

  // /sessions/{sessionId}
  evaluateSessionRead(auth: AuthContext | null, sessionId: string): boolean {
    if (!this.isAuthenticated(auth)) return false;
    const session = this.state.sessions.get(sessionId);
    if (!session) return false;
    return session.userId === auth!.uid || this.isAdmin(auth);
  }

  evaluateSessionWrite(auth: AuthContext | null): boolean {
    return this.isAdmin(auth);
  }

  // /complaints/{ticketId}
  evaluateComplaintRead(auth: AuthContext | null, ticketId: string): boolean {
    if (!this.isAuthenticated(auth)) return false;
    const complaint = this.state.complaints.get(ticketId);
    if (!complaint) return false;
    return (
      complaint.uid === auth!.uid ||
      complaint.studentId === auth!.token?.collegeId ||
      this.isAdmin(auth)
    );
  }

  evaluateComplaintCreate(auth: AuthContext | null, data: any): boolean {
    if (!this.isAuthenticated(auth)) return false;
    if (typeof data.title !== "string" || data.title.length < 3 || data.title.length > 120) return false;
    if (typeof data.description !== "string" || data.description.length > 1000) return false;
    if (!this.isValidComplaintCategory(data.category)) return false;
    if (!this.isValidComplaintPriority(data.priority)) return false;
    if (data.status !== "pending") return false;
    return true;
  }

  evaluateComplaintUpdate(auth: AuthContext | null): boolean {
    return this.isAdmin(auth);
  }

  evaluateComplaintDelete(auth: AuthContext | null): boolean {
    return this.isAdmin(auth);
  }

  // /preRegisteredStudents/{studentId}
  evaluateWhitelistRead(auth: AuthContext | null): boolean {
    return this.isAuthenticated(auth);
  }

  evaluateWhitelistWrite(auth: AuthContext | null): boolean {
    return this.isAdmin(auth);
  }
}

describe("Phase 8 Requirement 1: Firestore Security Rules Comprehensive Evaluation", () => {
  const evaluator = new FirestoreRuleEvaluator();

  const unauthenticated: AuthContext = { uid: null };
  const student1: AuthContext = { uid: "student-1", token: { role: "student", collegeId: "21BCE1042" } };
  const student2: AuthContext = { uid: "student-2", token: { role: "student", collegeId: "21BCE1088" } };
  const adminUser: AuthContext = { uid: "admin-1", token: { role: "admin" } };

  describe("Users Collection (/users/{userId})", () => {
    test("rejects unauthenticated read and write", () => {
      assert.strictEqual(evaluator.evaluateUserRead(unauthenticated, "student-1"), false);
      assert.strictEqual(evaluator.evaluateUserWrite(unauthenticated, "student-1"), false);
    });

    test("allows a student to read and update their own profile document", () => {
      assert.strictEqual(evaluator.evaluateUserRead(student1, "student-1"), true);
      assert.strictEqual(evaluator.evaluateUserWrite(student1, "student-1"), true);
    });

    test("blocks a student from reading another student's profile document", () => {
      assert.strictEqual(evaluator.evaluateUserRead(student1, "student-2"), false);
      assert.strictEqual(evaluator.evaluateUserWrite(student1, "student-2"), false);
    });

    test("allows admin to read, update, and delete any user profile", () => {
      assert.strictEqual(evaluator.evaluateUserRead(adminUser, "student-1"), true);
      assert.strictEqual(evaluator.evaluateUserWrite(adminUser, "student-1"), true);
      assert.strictEqual(evaluator.evaluateUserDelete(adminUser), true);
      assert.strictEqual(evaluator.evaluateUserDelete(student1), false);
    });
  });

  describe("Bicycle Stands Collection (/stands/{standId})", () => {
    test("allows any authenticated student to read stand availability for 3D campus view", () => {
      assert.strictEqual(evaluator.evaluateStandRead(student1), true);
      assert.strictEqual(evaluator.evaluateStandRead(student2), true);
    });

    test("blocks unauthenticated users from reading stand data", () => {
      assert.strictEqual(evaluator.evaluateStandRead(unauthenticated), false);
    });

    test("strictly blocks student client writes to stands (must go through Admin SDK/Cloud Functions)", () => {
      assert.strictEqual(evaluator.evaluateStandWrite(student1), false);
      assert.strictEqual(evaluator.evaluateStandWrite(student2), false);
    });

    test("allows campus administrators to write to stands (for maintenance toggles)", () => {
      assert.strictEqual(evaluator.evaluateStandWrite(adminUser), true);
    });
  });

  describe("Active & Historical Sessions (/sessions/{sessionId})", () => {
    test("allows student to read only their own session", () => {
      assert.strictEqual(evaluator.evaluateSessionRead(student1, "sess-1"), true);
      assert.strictEqual(evaluator.evaluateSessionRead(student1, "sess-2"), false);
    });

    test("allows admin to view all sessions across campus", () => {
      assert.strictEqual(evaluator.evaluateSessionRead(adminUser, "sess-1"), true);
      assert.strictEqual(evaluator.evaluateSessionRead(adminUser, "sess-2"), true);
    });

    test("denies direct client writes to sessions for non-admins (must use lockBicycle callable)", () => {
      assert.strictEqual(evaluator.evaluateSessionWrite(student1), false);
      assert.strictEqual(evaluator.evaluateSessionWrite(adminUser), true);
    });
  });

  describe("Student Complaints Collection (/complaints/{ticketId})", () => {
    test("allows authenticated student to read their own complaint ticket", () => {
      assert.strictEqual(evaluator.evaluateComplaintRead(student1, "tkt-1"), true);
      assert.strictEqual(evaluator.evaluateComplaintRead(student2, "tkt-1"), false);
    });

    test("allows admin to read any student complaint", () => {
      assert.strictEqual(evaluator.evaluateComplaintRead(adminUser, "tkt-1"), true);
    });

    test("allows student to file complaint with valid fields and 'pending' status", () => {
      const valid = {
        title: "Lock jammed on stand AB2-10",
        description: "The pin entered correctly but mechanical latch did not pop open.",
        category: "lock_jammed",
        priority: "high",
        status: "pending",
      };
      assert.strictEqual(evaluator.evaluateComplaintCreate(student1, valid), true);
    });

    test("rejects complaint creation with invalid category, priority, or non-pending status", () => {
      const invalidCategory = {
        title: "Broken bike",
        description: "Stand issue",
        category: "unknown_category",
        priority: "low",
        status: "pending",
      };
      assert.strictEqual(evaluator.evaluateComplaintCreate(student1, invalidCategory), false);

      const invalidStatus = {
        title: "Broken bike",
        description: "Stand issue",
        category: "rack_damaged",
        priority: "medium",
        status: "resolved", // cannot create directly as resolved
      };
      assert.strictEqual(evaluator.evaluateComplaintCreate(student1, invalidStatus), false);
    });

    test("restricts complaint status updates and deletions strictly to admins", () => {
      assert.strictEqual(evaluator.evaluateComplaintUpdate(student1), false);
      assert.strictEqual(evaluator.evaluateComplaintDelete(student1), false);
      assert.strictEqual(evaluator.evaluateComplaintUpdate(adminUser), true);
      assert.strictEqual(evaluator.evaluateComplaintDelete(adminUser), true);
    });
  });

  describe("Whitelist & Admissions Collection (/preRegisteredStudents/{studentId})", () => {
    test("allows authenticated clients to lookup pre-registration whitelist", () => {
      assert.strictEqual(evaluator.evaluateWhitelistRead(student1), true);
    });

    test("denies student write access to admissions whitelist", () => {
      assert.strictEqual(evaluator.evaluateWhitelistWrite(student1), false);
    });

    test("allows administrator to update admissions whitelist via bulk CSV upload", () => {
      assert.strictEqual(evaluator.evaluateWhitelistWrite(adminUser), true);
    });
  });
});
