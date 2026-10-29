import { create } from "zustand";
import { signOutUser } from "@/services/authService";

export interface UserProfile {
  uid: string;
  name: string;
  collegeId: string;
  phone: string;
  role: "student" | "admin";
  createdAt: number;
}

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => Promise<void>;
}

// Safely retrieve cached user if present
const getCachedUser = (): UserProfile | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("parkshark_auth_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const initialUser = getCachedUser();

export const useAuthStore = create<AuthState>((set) => ({
  user: initialUser,
  isAuthenticated: !!initialUser,
  isLoading: false, // Default to false so UI never hangs

  setUser: (user) => {
    if (typeof window !== "undefined") {
      try {
        if (user) {
          localStorage.setItem("parkshark_auth_user", JSON.stringify(user));
        } else {
          localStorage.removeItem("parkshark_auth_user");
        }
      } catch {
        // ignore
      }
    }
    set({ user, isAuthenticated: !!user, isLoading: false });
  },

  setLoading: (isLoading) => set({ isLoading }),

  logout: async () => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("parkshark_auth_user");
      } catch {
        // ignore
      }
    }
    try {
      await signOutUser();
    } catch (err) {
      console.warn("[Auth] Firebase signout error:", err);
    }
    set({ user: null, isAuthenticated: false, isLoading: false });
  },
}));
