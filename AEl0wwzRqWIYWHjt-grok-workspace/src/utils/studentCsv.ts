export interface PreRegisteredStudent {
  collegeId: string;
  name: string;
  phone: string;
  role: "student" | "admin";
}

/**
 * Global fallback and in-memory pre-registered students directory
 */
export const PRE_REGISTERED_STUDENTS: Record<string, PreRegisteredStudent> = {
  "+919876543210": {
    collegeId: "21BCE1042",
    name: "Arjun Sharma",
    phone: "+919876543210",
    role: "student",
  },
  "21BCE1042": {
    collegeId: "21BCE1042",
    name: "Arjun Sharma",
    phone: "+919876543210",
    role: "student",
  },
  "+919876543211": {
    collegeId: "21BCE1088",
    name: "Priya Patel",
    phone: "+919876543211",
    role: "student",
  },
  "21BCE1088": {
    collegeId: "21BCE1088",
    name: "Priya Patel",
    phone: "+919876543211",
    role: "student",
  },
  "+919876543212": {
    collegeId: "22BCE1984",
    name: "Rohan Verma",
    phone: "+919876543212",
    role: "student",
  },
  "22BCE1984": {
    collegeId: "22BCE1984",
    name: "Rohan Verma",
    phone: "+919876543212",
    role: "student",
  },
  "+919876543299": {
    collegeId: "ADMIN01",
    name: "Campus Security Admin",
    phone: "+919876543299",
    role: "admin",
  },
  "ADMIN01": {
    collegeId: "ADMIN01",
    name: "Campus Security Admin",
    phone: "+919876543299",
    role: "admin",
  },
};

// Auto-hydrate saved bulk students on startup
if (typeof window !== "undefined") {
  try {
    const raw = localStorage.getItem("parkshark_bulk_students");
    if (raw) {
      const list: PreRegisteredStudent[] = JSON.parse(raw);
      for (const s of list) {
        PRE_REGISTERED_STUDENTS[s.collegeId.toUpperCase()] = s;
        PRE_REGISTERED_STUDENTS[s.phone] = s;
      }
    }
  } catch {
    // ignore
  }
}

/**
 * Format any entered 10-digit phone or +91 phone into E.164 (+91XXXXXXXXXX)
 */
export function formatPhoneNumber(input: string): string {
  const cleaned = input.trim().replace(/[\s-]/g, "");
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.length === 10) return `+91${cleaned}`;
  if (cleaned.startsWith("91") && cleaned.length === 12) return `+${cleaned}`;
  return cleaned;
}

/**
 * Phase 7 Requirement 2: Bulk Student Registration via CSV
 */
export function parseStudentCsv(csvText: string): {
  valid: PreRegisteredStudent[];
  errors: { row: number; reason: string; raw: string }[];
} {
  const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  const valid: PreRegisteredStudent[] = [];
  const errors: { row: number; reason: string; raw: string }[] = [];

  if (lines.length === 0) {
    return { valid, errors };
  }

  // Detect and skip header row if present
  let startIndex = 0;
  const firstLine = lines[0].toLowerCase();
  if (
    firstLine.includes("name") ||
    firstLine.includes("college") ||
    firstLine.includes("phone") ||
    firstLine.includes("id")
  ) {
    startIndex = 1;
  }

  for (let i = startIndex; i < lines.length; i++) {
    const rawLine = lines[i];
    const parts = rawLine.split(/[,;]/).map((p) => p.trim().replace(/^["']|["']$/g, ""));

    if (parts.length < 3) {
      errors.push({
        row: i + 1,
        reason: "Must have at least 3 columns (name, collegeId, phone)",
        raw: rawLine,
      });
      continue;
    }

    const [name, collegeId, phone, roleRaw] = parts;

    if (!name || name.length < 2) {
      errors.push({ row: i + 1, reason: "Invalid name", raw: rawLine });
      continue;
    }

    if (!collegeId || collegeId.length < 3) {
      errors.push({ row: i + 1, reason: "Invalid College Registration ID", raw: rawLine });
      continue;
    }

    const cleanedPhone = phone.replace(/[^\d+]/g, "");
    if (cleanedPhone.length < 10) {
      errors.push({ row: i + 1, reason: "Invalid phone number (must be at least 10 digits)", raw: rawLine });
      continue;
    }

    const formattedPhone = formatPhoneNumber(cleanedPhone);
    const role: "student" | "admin" =
      roleRaw?.toLowerCase() === "admin" ? "admin" : "student";

    valid.push({
      name,
      collegeId: collegeId.toUpperCase(),
      phone: formattedPhone,
      role,
    });
  }

  return { valid, errors };
}

export function bulkRegisterStudents(students: PreRegisteredStudent[]): {
  count: number;
  students: PreRegisteredStudent[];
} {
  const existingBulk: PreRegisteredStudent[] = [];
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("parkshark_bulk_students");
      if (raw) existingBulk.push(...JSON.parse(raw));
    } catch {
      // ignore
    }
  }

  for (const s of students) {
    const upperId = s.collegeId.toUpperCase();
    const formatted = formatPhoneNumber(s.phone);
    const entry: PreRegisteredStudent = { ...s, collegeId: upperId, phone: formatted };

    PRE_REGISTERED_STUDENTS[upperId] = entry;
    PRE_REGISTERED_STUDENTS[formatted] = entry;

    const idx = existingBulk.findIndex((b) => b.collegeId === upperId || b.phone === formatted);
    if (idx >= 0) {
      existingBulk[idx] = entry;
    } else {
      existingBulk.push(entry);
    }
  }

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("parkshark_bulk_students", JSON.stringify(existingBulk));
    } catch {
      // ignore
    }
  }

  return {
    count: students.length,
    students,
  };
}

export function getRegisteredStudents(): PreRegisteredStudent[] {
  const map = new Map<string, PreRegisteredStudent>();

  for (const item of Object.values(PRE_REGISTERED_STUDENTS)) {
    map.set(item.collegeId, item);
  }

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("parkshark_bulk_students");
      if (raw) {
        const list: PreRegisteredStudent[] = JSON.parse(raw);
        for (const s of list) {
          map.set(s.collegeId, s);
        }
      }
    } catch {
      // ignore
    }
  }

  return Array.from(map.values());
}

