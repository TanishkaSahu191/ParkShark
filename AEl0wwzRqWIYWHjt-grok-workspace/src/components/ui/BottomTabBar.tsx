import React from "react";
import { Bike, Compass, MapPin, Clock, LayoutDashboard, ShieldCheck } from "lucide-react";
import { useSessionStore } from "@/store/useSessionStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useBikesStore } from "@/store/useBikesStore";
import { useUIStore } from "@/store/useUIStore";

interface BottomTabBarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({ currentPath, onNavigate }) => {
  const { activeSession } = useSessionStore();
  const { user } = useAuthStore();
  const { setShowLocationTracer } = useBikesStore();
  const { showPlaces, setShowPlaces } = useUIStore();

  const isAdmin = user?.role === "admin";

  const handleFindNearestSlot = () => {
    if (currentPath !== "/campus" && !currentPath.startsWith("/navigate")) {
      onNavigate("/campus");
    }
    setShowLocationTracer(true);
  };

  const handlePlaces = () => {
    if (currentPath !== "/campus" && !currentPath.startsWith("/navigate")) {
      onNavigate("/campus");
    }
    setShowPlaces((prev) => !prev);
  };

  const tabs = [
    {
      id: "campus",
      label: "Campus 3D",
      icon: Bike,
      onClick: () => onNavigate("/campus"),
      isActive:
        currentPath === "/campus" ||
        currentPath === "/" ||
        currentPath.startsWith("/navigate") ||
        currentPath.startsWith("/lock"),
      colorScheme: "default",
    },
    {
      id: "nearest",
      label: "Nearest Slot",
      icon: Compass,
      onClick: handleFindNearestSlot,
      isActive: false,
      colorScheme: "nearest",
    },
    {
      id: "places",
      label: "Places",
      icon: MapPin,
      onClick: handlePlaces,
      isActive: showPlaces,
      colorScheme: "places",
    },
    {
      id: "session",
      label: "Session",
      icon: Clock,
      badge: activeSession ? "Active" : undefined,
      onClick: () => onNavigate("/session"),
      isActive: currentPath === "/session",
      colorScheme: "default",
    },
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      onClick: () => onNavigate("/dashboard"),
      isActive: currentPath === "/dashboard",
      colorScheme: "default",
    },
    ...(isAdmin
      ? [
          {
            id: "admin",
            label: "Admin",
            icon: ShieldCheck,
            onClick: () => onNavigate("/admin"),
            isActive: currentPath === "/admin" || currentPath.startsWith("/admin/"),
            colorScheme: "admin",
          },
        ]
      : []),
  ];

  return (
    <nav
      aria-label="Bottom Navigation"
      className="fixed bottom-0 inset-x-0 z-40 bg-slate-950/95 dark:bg-[#07192f]/95 backdrop-blur-xl border-t border-slate-800/80 dark:border-[#163c63] shadow-2xl px-2 sm:px-4 py-1.5 pb-safe"
    >
      <div
        className={`max-w-xl mx-auto grid gap-1 sm:gap-2 ${
          isAdmin ? "grid-cols-6" : "grid-cols-5"
        }`}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;

          // Distinct styling per action
          let buttonClasses = "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50";
          let iconClasses = "size-5 text-slate-400";
          let labelClasses = "text-slate-400 font-medium";

          if (tab.colorScheme === "nearest") {
            buttonClasses =
              "bg-sky-600 hover:bg-sky-500 text-white font-semibold shadow-md shadow-sky-900/30 active:scale-95 ring-1 ring-sky-400/40";
            iconClasses = "size-5 text-white animate-spin-slow";
            labelClasses = "text-white font-bold";
          } else if (tab.colorScheme === "places") {
            if (tab.isActive) {
              buttonClasses =
                "bg-amber-400 text-slate-950 font-bold shadow-lg shadow-amber-900/40 ring-2 ring-amber-300 scale-[1.02] active:scale-95";
              iconClasses = "size-5 text-slate-950";
              labelClasses = "text-slate-950 font-extrabold";
            } else {
              buttonClasses =
                "bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold shadow-md shadow-amber-900/30 active:scale-95 ring-1 ring-amber-300/40";
              iconClasses = "size-5 text-slate-950";
              labelClasses = "text-slate-950 font-bold";
            }
          } else if (tab.colorScheme === "admin") {
            if (tab.isActive) {
              buttonClasses =
                "text-purple-300 font-bold bg-purple-950/70 border border-purple-500/50 shadow-sm";
              iconClasses = "size-5 text-purple-300 scale-110";
              labelClasses = "text-purple-200 font-bold";
            } else {
              buttonClasses =
                "text-purple-400/80 hover:text-purple-200 hover:bg-purple-950/40";
              iconClasses = "size-5 text-purple-400";
              labelClasses = "text-purple-400 font-medium";
            }
          } else if (tab.isActive) {
            buttonClasses =
              "text-sky-300 font-bold bg-sky-950/60 border border-sky-500/40 shadow-sm";
            iconClasses = "size-5 text-sky-300 scale-110";
            labelClasses = "text-sky-200 font-bold";
          }

          return (
            <button
              key={tab.id}
              onClick={tab.onClick}
              className={`relative flex flex-col items-center justify-center py-1.5 px-1 sm:px-2 rounded-xl transition-all duration-150 select-none cursor-pointer ${buttonClasses}`}
              title={tab.label}
            >
              <div className="relative">
                <Icon className={`transition-transform ${iconClasses}`} />
                {tab.badge && (
                  <span className="absolute -top-1 -right-2 size-2 rounded-full bg-emerald-400 animate-ping" />
                )}
              </div>
              <span className={`text-[10px] sm:text-[11px] mt-1 tracking-tight truncate max-w-full ${labelClasses}`}>
                {tab.id === "nearest" ? (
                  <>
                    <span className="hidden sm:inline">Find </span>Nearest Slot
                  </>
                ) : (
                  tab.label
                )}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
