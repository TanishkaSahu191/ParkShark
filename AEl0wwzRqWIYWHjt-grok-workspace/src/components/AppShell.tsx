import React, { useState, useEffect, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { CampusScene } from "@/campus/CampusScene";
import { Hud } from "@/campus/Hud";
import { Header } from "@/components/ui/Header";
import { BottomTabBar } from "@/components/ui/BottomTabBar";
import { Toast } from "@/components/ui/Toast";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { useAuthStore } from "@/store/useAuthStore";
import { LoginScreen } from "@/pages/LoginScreen";
import { CampusScreen } from "@/pages/CampusScreen";
import { NavigationScreen } from "@/pages/NavigationScreen";
import { LockScreen } from "@/pages/LockScreen";
import { SessionScreen } from "@/pages/SessionScreen";
import { UnlockScreen } from "@/pages/UnlockScreen";
import { DashboardScreen } from "@/pages/DashboardScreen";

export const AppShellContent: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  const { isAuthenticated } = useAuthStore();

  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const p = window.location.pathname;
      const cached = localStorage.getItem("parkshark_auth_user");
      if (!cached) return "/login";
      return p === "/" || p === "" ? "/campus" : p;
    }
    return "/login";
  });

  const navigate = useCallback((path: string) => {
    if (typeof window !== "undefined") {
      if (window.location.pathname !== path) {
        window.history.pushState(null, "", path);
      }
    }
    setCurrentPath(path);
  }, []);

  // Synchronize with window.location on mount and on popstate
  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const p = window.location.pathname;

      if (!isAuthenticated) {
        if (currentPath !== "/login") setCurrentPath("/login");
        if (p !== "/login") {
          window.history.replaceState(null, "", "/login");
        }
      } else {
        const next = p === "/" || p === "" || p === "/login" ? "/campus" : p;
        if (currentPath !== next) setCurrentPath(next);
        if (p === "/" || p === "/login") {
          window.history.replaceState(null, "", next);
        }
      }

      const onPopState = () => {
        const path = window.location.pathname;
        if (!useAuthStore.getState().isAuthenticated) {
          setCurrentPath("/login");
        } else {
          setCurrentPath(path === "/" || path === "" ? "/campus" : path);
        }
      };

      window.addEventListener("popstate", onPopState);
      return () => window.removeEventListener("popstate", onPopState);
    }
  }, [isAuthenticated, currentPath]);

  // Parse path and params
  const isNavigateRoute = currentPath.startsWith("/navigate/");
  const navigateStandId = isNavigateRoute ? currentPath.replace("/navigate/", "") : null;

  const isLockRoute = currentPath.startsWith("/lock/");
  const lockStandId = isLockRoute ? currentPath.replace("/lock/", "") : null;

  const isLoginRoute = currentPath === "/login";
  const isCampusRoute = currentPath === "/campus" || currentPath === "/";
  const isSessionRoute = currentPath === "/session";
  const isUnlockRoute = currentPath === "/unlock";
  const isDashboardRoute = currentPath === "/dashboard";

  // When viewing overlay screens over campus, apply subtle backdrop blur
  const hasOverlayBackdrop = isDashboardRoute || isSessionRoute || isUnlockRoute || isLockRoute;

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[#08162b] text-slate-100 select-none flex flex-col font-sans">
      {/* 
        Requirement 6: "The 3D canvas loads only after login."
        The Three.js / R3F Canvas is ONLY mounted when the student is authenticated.
        When unauthenticated, a lightweight starry campus atmosphere background is shown.
      */}
      {isAuthenticated && mounted ? (
        <div className="absolute inset-0 z-0 pointer-events-auto">
          <Canvas
            className="size-full"
            shadows
            dpr={[1, 1.6]}
            camera={{ position: [0, 8, 96], fov: 52, near: 0.1, far: 280 }}
            gl={{ antialias: true, powerPreference: "high-performance" }}
            onCreated={({ gl }) => {
              gl.toneMapping = THREE.ACESFilmicToneMapping;
              gl.toneMappingExposure = 1.05;
            }}
          >
            <CampusScene />
          </Canvas>
        </div>
      ) : (
        <div className="absolute inset-0 z-0 pointer-events-none bg-gradient-to-b from-[#08162b] via-[#0b2444] to-[#061224] flex items-center justify-center overflow-hidden">
          {/* Subtle decorative glowing mesh rings for login background */}
          <div className="absolute -top-32 -left-32 size-96 rounded-full bg-blue-600/10 blur-3xl" />
          <div className="absolute -bottom-32 -right-32 size-96 rounded-full bg-sky-500/10 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(#1d4ed8_1px,transparent_1px)] [background-size:24px_24px] opacity-15" />
        </div>
      )}

      {/* 2. Campus 2D Minimap & Compass HUD (rendered only on 3D view routes when authenticated) */}
      {isAuthenticated && (isCampusRoute || isNavigateRoute) && (
        <div className="pointer-events-none absolute inset-0 z-10">
          <Hud />
        </div>
      )}

      {/* 3. Frosted Glass Backdrop for Modal / Card Screens */}
      {hasOverlayBackdrop && (
        <div className="absolute inset-0 z-15 bg-slate-950/50 backdrop-blur-md pointer-events-none transition-all duration-300" />
      )}

      {/* 4. App Top Header (sticky) */}
      <Header onNavigateRoute={navigate} />

      {/* 5. Global Floating Toast Messages */}
      <Toast />

      {/* 6. Dynamic Route Overlays */}
      <main className="relative z-20 flex-1 overflow-y-auto pointer-events-auto">
        {!isAuthenticated || isLoginRoute ? (
          <LoginScreen onNavigate={navigate} />
        ) : (
          <>
            {isCampusRoute && <CampusScreen onNavigate={navigate} />}
            {isNavigateRoute && navigateStandId && (
              <NavigationScreen standId={navigateStandId} onNavigate={navigate} />
            )}
            {isLockRoute && lockStandId && (
              <LockScreen standId={lockStandId} onNavigate={navigate} />
            )}
            {isSessionRoute && <SessionScreen onNavigate={navigate} />}
            {isUnlockRoute && <UnlockScreen onNavigate={navigate} />}
            {isDashboardRoute && <DashboardScreen onNavigate={navigate} />}
          </>
        )}
      </main>

      {/* 7. Bottom Navigation Tab Bar (rendered only for authenticated users on non-login routes) */}
      {isAuthenticated && !isLoginRoute && (
        <BottomTabBar currentPath={currentPath} onNavigate={navigate} />
      )}
    </div>
  );
};

export const AppShell: React.FC = () => {
  return (
    <AuthProvider>
      <AppShellContent />
    </AuthProvider>
  );
};
