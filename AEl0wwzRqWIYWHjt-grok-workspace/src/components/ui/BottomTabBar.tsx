import React from "react";
import { Compass, Clock, LayoutDashboard } from "lucide-react";
import { useSessionStore } from "@/store/useSessionStore";

interface BottomTabBarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({ currentPath, onNavigate }) => {
  const { activeSession } = useSessionStore();

  const tabs = [
    {
      id: "campus",
      label: "Campus 3D",
      path: "/campus",
      icon: Compass,
    },
    {
      id: "session",
      label: "Session",
      path: "/session",
      icon: Clock,
      badge: activeSession ? "Active" : undefined,
    },
    {
      id: "dashboard",
      label: "Dashboard",
      path: "/dashboard",
      icon: LayoutDashboard,
    },
  ];

  return (
    <nav
      aria-label="Bottom Navigation"
      className="fixed bottom-0 inset-x-0 z-40 bg-white/92 dark:bg-[#0b2a4a]/95 backdrop-blur-md border-t border-slate-200 dark:border-[#1e4a7a] shadow-lg shadow-black/10 px-4 py-2 pb-safe"
    >
      <div className="max-w-md mx-auto grid grid-cols-3 gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            currentPath === tab.path ||
            (tab.path === "/campus" && (currentPath === "/" || currentPath.startsWith("/navigate") || currentPath.startsWith("/lock")));

          return (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.path)}
              className={`relative flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all duration-150 select-none ${
                isActive
                  ? "text-[#1d4ed8] dark:text-sky-300 font-semibold bg-sky-50 dark:bg-sky-950/50"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <div className="relative">
                <Icon className={`size-5 transition-transform ${isActive ? "scale-110" : ""}`} />
                {tab.badge && (
                  <span className="absolute -top-1 -right-2 size-2 rounded-full bg-emerald-500 animate-ping" />
                )}
              </div>
              <span className="text-[11px] mt-1 tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
