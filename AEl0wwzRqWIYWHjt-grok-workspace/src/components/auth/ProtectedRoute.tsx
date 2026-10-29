import React, { useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { ShieldAlert, Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  onRedirect?: (route: string) => void;
}

/**
 * ProtectedRoute guards screens that require active student authentication.
 * If unauthenticated, it automatically redirects the user to /login.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, onRedirect }) => {
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      if (onRedirect) {
        onRedirect("/login");
      } else if (typeof window !== "undefined") {
        window.history.pushState(null, "", "/login");
        window.dispatchEvent(new PopStateEvent("popstate"));
      }
    }
  }, [isAuthenticated, isLoading, onRedirect]);

  if (isLoading) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center animate-fade-in">
        <div className="relative mb-4 flex items-center justify-center">
          <div className="size-14 rounded-2xl bg-sky-500/10 border border-sky-400/20 flex items-center justify-center text-sky-400">
            <Loader2 className="size-7 animate-spin" />
          </div>
        </div>
        <h3 className="text-base font-semibold text-slate-200">Verifying VIT Credentials…</h3>
        <p className="text-xs text-slate-400 mt-1">Connecting to ParkShark Security</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center animate-fade-in">
        <div className="mb-4 size-12 rounded-2xl bg-amber-500/10 border border-amber-400/20 text-amber-400 flex items-center justify-center">
          <ShieldAlert className="size-6" />
        </div>
        <h3 className="text-sm font-semibold text-slate-200">Authentication Required</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-xs">
          Please log in with your College ID or registered mobile number to access campus facilities.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};
