import React from "react";
import { Moon, Sun, Bike, User, LogOut, QrCode } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useUIStore } from "@/store/useUIStore";
import { useSessionStore } from "@/store/useSessionStore";

interface HeaderProps {
  onNavigateRoute?: (route: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onNavigateRoute }) => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { theme, toggleTheme } = useUIStore();
  const { activeSession } = useSessionStore();

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0b2a4a] text-slate-100 shadow-md border-b border-[#163c63]">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Brand / Logo */}
        <button
          onClick={() => onNavigateRoute?.("/campus")}
          className="flex items-center gap-2.5 font-bold text-lg tracking-tight hover:opacity-90 transition-opacity"
        >
          <div className="size-8 rounded-lg bg-gradient-to-tr from-[#1d4ed8] to-[#38bdf8] flex items-center justify-center text-white shadow-sm">
            <Bike className="size-5" />
          </div>
          <span className="font-display tracking-normal text-xl font-bold bg-gradient-to-r from-white via-slate-100 to-sky-200 bg-clip-text text-transparent">
            ParkShark
          </span>
          <span className="hidden sm:inline-block text-[11px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded bg-sky-950/60 border border-sky-700/50 text-sky-300">
            VIT
          </span>
        </button>

        {/* User Greeting & Status (Requirement 5) */}
        <div className="flex items-center gap-3">
          {isAuthenticated && user && (
            <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-200">
              <span id="user-greeting" className="font-semibold text-sky-200 max-w-[160px] truncate">
                Hi, {user.name}
              </span>
            </div>
          )}

          {/* Active Session Pill indicator */}
          {activeSession && (
            <button
              onClick={() => onNavigateRoute?.("/session")}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-semibold animate-pulse hover:bg-emerald-500/30 transition-colors"
            >
              <span className="size-2 rounded-full bg-emerald-400" />
              <span>Stand {activeSession.standId}</span>
            </button>
          )}

          {/* Admin QR Codes Link */}
          <button
            onClick={() => onNavigateRoute?.("/admin/qrcodes")}
            title="Print Stand QR Codes"
            aria-label="Print Stand QR Codes"
            className="p-2 rounded-xl text-slate-300 hover:text-sky-300 hover:bg-white/10 transition-colors"
          >
            <QrCode className="size-4.5" />
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            {theme === "dark" ? <Sun className="size-4.5" /> : <Moon className="size-4.5" />}
          </button>

          {/* Auth Button */}
          {isAuthenticated ? (
            <button
              onClick={() => {
                logout();
                onNavigateRoute?.("/login");
              }}
              title="Logout"
              aria-label="Logout"
              className="p-2 rounded-xl text-slate-300 hover:text-rose-300 hover:bg-rose-950/30 transition-colors"
            >
              <LogOut className="size-4.5" />
            </button>
          ) : (
            <button
              onClick={() => onNavigateRoute?.("/login")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-semibold shadow transition-colors"
            >
              <User className="size-3.5" />
              <span>Login</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
