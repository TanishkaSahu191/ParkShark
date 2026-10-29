import { create } from "zustand";

interface UIState {
  theme: "dark" | "light";
  activeTab: "campus" | "session" | "dashboard";
  navigatingStandId: string | null;
  toast: { message: string; type: "info" | "success" | "error" | "warning" } | null;
  toggleTheme: () => void;
  setActiveTab: (tab: "campus" | "session" | "dashboard") => void;
  setNavigatingStandId: (id: string | null) => void;
  showToast: (message: string, type?: "info" | "success" | "error" | "warning") => void;
  clearToast: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  theme: "dark",
  activeTab: "campus",
  navigatingStandId: null,
  toast: null,

  toggleTheme: () =>
    set((state) => {
      const next = state.theme === "dark" ? "light" : "dark";
      if (typeof document !== "undefined") {
        if (next === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      }
      return { theme: next };
    }),

  setActiveTab: (tab) => set({ activeTab: tab }),

  setNavigatingStandId: (id) => set({ navigatingStandId: id }),

  showToast: (message, type = "info") => {
    set({ toast: { message, type } });
    setTimeout(() => {
      set((s) => (s.toast?.message === message ? { toast: null } : s));
    }, 4000);
  },

  clearToast: () => set({ toast: null }),
}));
