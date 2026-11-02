import { create } from "zustand";

const THEME_STORAGE_KEY = "parkshark_theme";

const getInitialTheme = (): "dark" | "light" => {
  if (typeof window === "undefined") return "dark";
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === "light" || saved === "dark") {
      return saved;
    }
  } catch {
    // ignore
  }
  return "dark";
};

export const applyThemeToDom = (theme: "dark" | "light") => {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
  root.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // ignore
  }
};

// Immediate DOM sync on client load
if (typeof window !== "undefined") {
  applyThemeToDom(getInitialTheme());
}

interface UIState {
  theme: "dark" | "light";
  activeTab: "campus" | "session" | "dashboard";
  navigatingStandId: string | null;
  toast: { message: string; type: "info" | "success" | "error" | "warning" } | null;
  showPlaces: boolean;
  toggleTheme: () => void;
  setTheme: (theme: "dark" | "light") => void;
  setActiveTab: (tab: "campus" | "session" | "dashboard") => void;
  setNavigatingStandId: (id: string | null) => void;
  setShowPlaces: (val: boolean | ((prev: boolean) => boolean)) => void;
  showToast: (message: string, type?: "info" | "success" | "error" | "warning") => void;
  clearToast: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  theme: getInitialTheme(),
  activeTab: "campus",
  navigatingStandId: null,
  toast: null,
  showPlaces: false,

  setShowPlaces: (val) =>
    set((state) => ({
      showPlaces: typeof val === "function" ? val(state.showPlaces) : val,
    })),

  toggleTheme: () =>
    set((state) => {
      const next = state.theme === "dark" ? "light" : "dark";
      applyThemeToDom(next);
      return { theme: next };
    }),

  setTheme: (theme) => {
    applyThemeToDom(theme);
    set({ theme });
  },

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
