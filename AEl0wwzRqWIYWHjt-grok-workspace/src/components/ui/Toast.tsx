import React from "react";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";
import { useUIStore } from "@/store/useUIStore";

export const Toast: React.FC = () => {
  const { toast, clearToast } = useUIStore();

  if (!toast) return null;

  const icons = {
    info: <Info className="size-5 text-sky-400 shrink-0" />,
    success: <CheckCircle2 className="size-5 text-emerald-400 shrink-0" />,
    error: <AlertCircle className="size-5 text-rose-400 shrink-0" />,
    warning: <AlertTriangle className="size-5 text-amber-400 shrink-0" />,
  };

  const borders = {
    info: "border-sky-500/50 bg-sky-950/90 text-sky-100",
    success: "border-emerald-500/50 bg-emerald-950/90 text-emerald-100",
    error: "border-rose-500/50 bg-rose-950/90 text-rose-100",
    warning: "border-amber-500/50 bg-amber-950/90 text-amber-100",
  };

  return (
    <div className="fixed top-16 inset-x-4 sm:inset-x-auto sm:right-6 z-50 flex justify-center pointer-events-none">
      <div
        className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border backdrop-blur-md max-w-md w-full transition-all animate-bounce-subtle ${
          borders[toast.type]
        }`}
      >
        {icons[toast.type]}
        <p className="text-sm font-medium flex-1">{toast.message}</p>
        <button
          onClick={clearToast}
          aria-label="Dismiss toast"
          className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
};
