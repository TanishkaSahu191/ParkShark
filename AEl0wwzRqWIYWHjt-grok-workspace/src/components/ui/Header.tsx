import React from "react";
import { Moon, Sun, Bike, User, LogOut, QrCode, ShieldCheck, AlertTriangle } from "lucide-react";
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
    <header className="sticky top-0 z-40 w-full bg-white dark:bg-[#0b2a4a] text-slate-800 dark:text-slate-100 shadow-sm dark:shadow-md border-b border-slate-200 dark:border-[#163c63] transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Brand / Logo */}
        <button
          onClick={() => onNavigateRoute?.("/campus")}
          className="flex items-center gap-2.5 font-bold text-lg tracking-tight hover:opacity-90 transition-opacity"
        >
          <img
            src="/parkshark-icon.png"
            alt="ParkShark Logo"
            className="size-9 object-contain drop-shadow"
          />
          <span className="font-display tracking-tight text-xl font-extrabold flex items-center">
            <span className="text-slate-900 dark:text-white">Park</span>
            <span className="text-[#00c2cb]">Shark</span>
          </span>
          <span className="hidden sm:inline-block text-[11px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-950/60 border border-sky-300 dark:border-sky-700/50 text-sky-800 dark:text-sky-300">
            VIT
          </span>
        </button>

        {/* User Greeting & Status (Requirement 5) */}
        <div className="flex items-center gap-3">
          {isAuthenticated && user && (
            <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200">
              <span id="user-greeting" className="font-semibold text-sky-600 dark:text-sky-200 max-w-[160px] truncate">
                Hi, {user.name}
              </span>
            </div>
          )}

          {/* Active Session Pill indicator */}
          {activeSession && (
            <button
              onClick={() => onNavigateRoute?.("/session")}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 dark:bg-emerald-500/20 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold animate-pulse hover:bg-emerald-500/25 transition-colors"
            >
              <span className="size-2 rounded-full bg-emerald-500 dark:bg-emerald-400" />
              <span>Stand {activeSession.standId}</span>
            </button>
          )}

          {/* Admin Portal Link */}
          <button
            onClick={() => onNavigateRoute?.("/admin")}
            title={user?.role === "admin" ? "Admin Control Center" : "Admin Portal"}
            aria-label="Admin Control Center"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition-colors ${
              user?.role === "admin"
                ? "bg-purple-100 dark:bg-purple-950/60 border border-purple-300 dark:border-purple-500/50 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/60"
                : "bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            <ShieldCheck className="size-4 text-purple-600 dark:text-purple-400" />
            <span className="hidden sm:inline">Admin</span>
          </button>

          {/* Admin QR Codes Link */}
          <button
            onClick={() => onNavigateRoute?.("/admin/qrcodes")}
            title="Print Stand QR Codes"
            aria-label="Print Stand QR Codes"
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          >
            <QrCode className="size-4.5" />
          </button>

          {/* Complaints / Report Issue Link */}
          {isAuthenticated && (
            <button
              onClick={() => onNavigateRoute?.("/complaints")}
              title="Register a Complaint"
              aria-label="Register a Complaint"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-300 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 transition-colors"
            >
              <AlertTriangle className="size-3.5 text-rose-600 dark:text-rose-400" />
              <span className="hidden sm:inline">Complaints</span>
            </button>
          )}

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          >
            {theme === "dark" ? (
              <Sun className="size-4.5 text-amber-400" />
            ) : (
              <Moon className="size-4.5 text-slate-700" />
            )}
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
              className="p-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
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
