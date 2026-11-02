export type ComplaintCategory =
  | "lock_jammed"
  | "qr_damaged"
  | "stand_damaged"
  | "unauthorized_bike"
  | "sensor_mismatch"
  | "penalty_dispute"
  | "other";

export type ComplaintPriority = "low" | "medium" | "high" | "urgent";

export type ComplaintStatus = "pending" | "investigating" | "resolved" | "rejected";

export interface Complaint {
  id: string; // e.g. "CMP-2026-1042"
  studentId: string;
  studentName: string;
  studentPhone: string;
  standId?: string;
  building?: "AB1" | "AB2" | "AB3";
  category: ComplaintCategory;
  priority: ComplaintPriority;
  title: string;
  description: string;
  photoUrl?: string;
  status: ComplaintStatus;
  createdAt: number;
  updatedAt: number;
  adminNotes?: string;
  resolvedAt?: number;
}

export interface RegisterComplaintInput {
  studentId: string;
  studentName: string;
  studentPhone: string;
  standId?: string;
  building?: "AB1" | "AB2" | "AB3";
  category: ComplaintCategory;
  priority: ComplaintPriority;
  title: string;
  description: string;
  photoUrl?: string;
}

export const CATEGORY_LABELS: Record<
  ComplaintCategory,
  { label: string; description: string; iconName: string }
> = {
  lock_jammed: {
    label: "Smart Lock Jammed",
    description: "Lock mechanism won't unlock, clamp stuck, or motor unresponsive",
    iconName: "Lock",
  },
  qr_damaged: {
    label: "Damaged / Missing QR",
    description: "Placard scratched, faded, or matrix code won't scan",
    iconName: "QrCode",
  },
  stand_damaged: {
    label: "Physical Stand Damage",
    description: "Rack bent, broken railing, loose anchor bolts, or vandalism",
    iconName: "AlertTriangle",
  },
  unauthorized_bike: {
    label: "Abandoned / Blocking Bicycle",
    description: "Unregistered or broken bicycle blocking slot access",
    iconName: "Bike",
  },
  sensor_mismatch: {
    label: "Sensor Status Error",
    description: "App reports rack is available but it is physically full",
    iconName: "Radio",
  },
  penalty_dispute: {
    label: "Timing / Fine Dispute",
    description: "Discrepancy in parking duration or overtime notification",
    iconName: "Clock",
  },
  other: {
    label: "General Campus Feedback",
    description: "Campus bicycle facility suggestions or other inquiries",
    iconName: "HelpCircle",
  },
};

export const INITIAL_COMPLAINTS: Complaint[] = [
  {
    id: "CMP-2026-1042",
    studentId: "21BCE1042",
    studentName: "Arjun Sharma",
    studentPhone: "+91 9876543210",
    standId: "AB1-12",
    building: "AB1",
    category: "qr_damaged",
    priority: "medium",
    title: "QR placard scratched and unreadable on AB1-12",
    description:
      "The QR sticker on stand AB1-12 is partially peeled off and the camera couldn't read the matrix code. Had to enter code manually.",
    status: "resolved",
    createdAt: Date.now() - 36 * 3600 * 1000,
    updatedAt: Date.now() - 12 * 3600 * 1000,
    adminNotes:
      "Facilities Team inspected stand AB1-12 and installed a brand-new UV-coated QR placard. Verified working.",
    resolvedAt: Date.now() - 12 * 3600 * 1000,
  },
  {
    id: "CMP-2026-1088",
    studentId: "21BCE1088",
    studentName: "Priya Patel",
    studentPhone: "+91 9876543211",
    standId: "AB2-08",
    building: "AB2",
    category: "lock_jammed",
    priority: "high",
    title: "Smart lock mechanism stiff on stand AB2-08",
    description:
      "When trying to lock my bicycle, the solenoid latch required multiple pushes before confirming lock.",
    status: "investigating",
    createdAt: Date.now() - 8 * 3600 * 1000,
    updatedAt: Date.now() - 2 * 3600 * 1000,
    adminNotes:
      "Assigned to campus technician Ramesh (VIT Facilities). Stand placed under monitoring.",
  },
];

export function validateComplaintInput(input: RegisterComplaintInput): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (!input.studentId || input.studentId.trim().length < 4) {
    errors.push("Valid Student College ID is required.");
  }
  if (!input.studentName || input.studentName.trim().length < 2) {
    errors.push("Student name is required.");
  }
  if (!input.title || input.title.trim().length < 5) {
    errors.push("Complaint title must be at least 5 characters long.");
  }
  if (!input.description || input.description.trim().length < 10) {
    errors.push("Detailed description must be at least 10 characters long.");
  }
  return {
    valid: errors.length === 0,
    errors,
  };
}

export function createComplaintRecord(
  input: RegisterComplaintInput,
  idGenerator?: () => string
): Complaint {
  const id = idGenerator
    ? idGenerator()
    : `CMP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = Date.now();

  // Extract building from standId if not explicitly provided
  let building = input.building;
  if (!building && input.standId) {
    if (input.standId.startsWith("AB1")) building = "AB1";
    else if (input.standId.startsWith("AB2")) building = "AB2";
    else if (input.standId.startsWith("AB3")) building = "AB3";
  }

  return {
    ...input,
    id,
    building,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };
}

export function updateComplaintRecordStatus(
  complaint: Complaint,
  status: ComplaintStatus,
  adminNotes?: string
): Complaint {
  const now = Date.now();
  return {
    ...complaint,
    status,
    adminNotes: adminNotes !== undefined ? adminNotes : complaint.adminNotes,
    updatedAt: now,
    resolvedAt: status === "resolved" ? now : complaint.resolvedAt,
  };
}

export function calculateComplaintMetrics(complaints: Complaint[]) {
  return {
    total: complaints.length,
    pending: complaints.filter((c) => c.status === "pending").length,
    investigating: complaints.filter((c) => c.status === "investigating").length,
    resolved: complaints.filter((c) => c.status === "resolved").length,
    rejected: complaints.filter((c) => c.status === "rejected").length,
  };
}

