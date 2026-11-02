import { create } from "zustand";
import {
  type Complaint,
  type ComplaintCategory,
  type ComplaintPriority,
  type ComplaintStatus,
  type RegisterComplaintInput,
  CATEGORY_LABELS,
  INITIAL_COMPLAINTS,
  createComplaintRecord,
  updateComplaintRecordStatus,
  calculateComplaintMetrics,
  validateComplaintInput,
} from "@/utils/complaints";

export type {
  Complaint,
  ComplaintCategory,
  ComplaintPriority,
  ComplaintStatus,
  RegisterComplaintInput,
};
export { CATEGORY_LABELS, validateComplaintInput };

const STORAGE_KEY = "parkshark_complaints_store";

const loadComplaints = (): Complaint[] => {
  if (typeof window === "undefined") return INITIAL_COMPLAINTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_COMPLAINTS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch {
    return INITIAL_COMPLAINTS;
  }
  return INITIAL_COMPLAINTS;
};

const saveComplaints = (complaints: Complaint[]) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(complaints));
  } catch {
    // Ignore storage quota errors
  }
};

interface ComplaintStoreState {
  complaints: Complaint[];
  registerComplaint: (input: RegisterComplaintInput) => Complaint;
  updateComplaintStatus: (
    id: string,
    status: ComplaintStatus,
    adminNotes?: string
  ) => void;
  deleteComplaint: (id: string) => void;
  getComplaintsForStudent: (studentId: string) => Complaint[];
  getComplaintById: (id: string) => Complaint | undefined;
  getComplaintStats: () => {
    total: number;
    pending: number;
    investigating: number;
    resolved: number;
    rejected: number;
  };
}

export const useComplaintStore = create<ComplaintStoreState>((set, get) => ({
  complaints: loadComplaints(),

  registerComplaint: (input) => {
    const newComplaint = createComplaintRecord(input);

    set((state) => {
      const updated = [newComplaint, ...state.complaints];
      saveComplaints(updated);
      return { complaints: updated };
    });

    return newComplaint;
  },

  updateComplaintStatus: (id, status, adminNotes) => {
    set((state) => {
      const updated = state.complaints.map((item) => {
        if (item.id === id) {
          return updateComplaintRecordStatus(item, status, adminNotes);
        }
        return item;
      });
      saveComplaints(updated);
      return { complaints: updated };
    });
  },

  deleteComplaint: (id) => {
    set((state) => {
      const updated = state.complaints.filter((item) => item.id !== id);
      saveComplaints(updated);
      return { complaints: updated };
    });
  },

  getComplaintsForStudent: (studentId) => {
    return get().complaints.filter(
      (c) => c.studentId.toLowerCase() === studentId.toLowerCase()
    );
  },

  getComplaintById: (id) => {
    return get().complaints.find((c) => c.id === id);
  },

  getComplaintStats: () => {
    return calculateComplaintMetrics(get().complaints);
  },
}));
