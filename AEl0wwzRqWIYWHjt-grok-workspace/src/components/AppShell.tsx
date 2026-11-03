import React, { useState, useEffect, useCallback, Suspense, lazy } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { Hud } from "@/campus/Hud";
import { Header } from "@/components/ui/Header";
import { BottomTabBar } from "@/components/ui/BottomTabBar";
import { Toast } from "@/components/ui/Toast";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { useAuthStore } from "@/store/useAuthStore";
import { useBikesStore } from "@/store/useBikesStore";
import { useUIStore } from "@/store/useUIStore";
import { LoginScreen } from "@/pages/LoginScreen";

// Lazy-load the 3D scene bundle to optimize initial FCP and Lighthouse performance
const CampusScene = lazy(() =>
  import("@/campus/CampusScene").then((m) => ({ default: m.CampusScene }))
);
import { CampusScreen } from "@/pages/CampusScreen";
import { NavigationScreen } from "@/pages/NavigationScreen";
import { LockScreen } from "@/pages/LockScreen";
import { SessionScreen } from "@/pages/SessionScreen";
import { UnlockScreen } from "@/pages/UnlockScreen";
import { DashboardScreen } from "@/pages/DashboardScreen";
import { ComplaintsScreen } from "@/pages/ComplaintsScreen";
import { AdminQrCodesScreen } from "@/pages/AdminQrCodesScreen";
import { AdminScreen } from "@/pages/AdminScreen";

export const AppShellContent: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  const { isAuthenticated } = useAuthStore();
  const { lowGraphics } = useUIStore();

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
  const isComplaintsRoute =
    currentPath === "/complaints" ||
    currentPath === "/complaint" ||
    currentPath.startsWith("/complaints/") ||
    currentPath.startsWith("/complaints?");
  const complaintStandId =
    isComplaintsRoute && currentPath.includes("stand=")
      ? currentPath.split("stand=")[1]?.split("&")[0]
      : currentPath.startsWith("/complaints/")
      ? currentPath.replace("/complaints/", "")
      : null;
  const isAdminQrRoute = currentPath === "/admin/qrcodes" || currentPath === "/admin/qr";
  const isAdminRoute = currentPath === "/admin";

  // Sync navigating stand ID to bikes store for 3D path rendering
  useEffect(() => {
    if (isNavigateRoute && navigateStandId) {
      useBikesStore.getState().setNavigatingStandId(navigateStandId);
    } else {
      useBikesStore.getState().setNavigatingStandId(null);
    }
  }, [isNavigateRoute, navigateStandId]);

  // When viewing overlay screens over campus, apply subtle backdrop blur
  const hasOverlayBackdrop =
    isDashboardRoute ||
    isSessionRoute ||
    isUnlockRoute ||
    isLockRoute ||
    isComplaintsRoute ||
    isAdminQrRoute ||
    isAdminRoute;

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-slate-100 dark:bg-[#08162b] text-slate-900 dark:text-slate-100 select-none flex flex-col font-sans transition-colors duration-200">
      {/* 
        Requirement 6: "The 3D canvas loads only after login."
        The Three.js / R3F Canvas is ONLY mounted when the student is authenticated.
        When unauthenticated, a lightweight starry campus atmosphere background is shown.
      */}
      {isAuthenticated && mounted ? (
        <div className="absolute inset-0 z-0 pointer-events-auto">
          <Canvas
            className="size-full"
            shadows={!lowGraphics}
            dpr={lowGraphics ? 1 : [1, 1.6]}
            camera={{ position: [0, 8, 96], fov: 52, near: 0.1, far: 280 }}
            gl={{ antialias: !lowGraphics, powerPreference: "high-performance" }}
            onCreated={({ gl }) => {
              gl.toneMapping = THREE.ACESFilmicToneMapping;
              gl.toneMappingExposure = 1.05;
            }}
          >
            <Suspense fallback={null}>
              <CampusScene />
            </Suspense>
          </Canvas>
        </div>
      ) : (
        <div className="absolute inset-0 z-0 pointer-events-none bg-[#08162b] flex items-center justify-center overflow-hidden">
          <video
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            className="size-full object-cover scale-105"
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20261029_084141_6ac02cf2-9847-4e03-9a9c-81a4ec81dd93.mp4"
          />
          {/* Subtle cinematic gradient overlay to ensure card & text pop */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#08162b]/80 via-[#08162b]/60 to-[#061224]/85 backdrop-blur-[1px]" />
        </div>
      )}

      {/* 2. Campus 2D Minimap & Compass HUD (rendered only on 3D view routes when authenticated, offset below top header and above bottom bar) */}
      {isAuthenticated && (isCampusRoute || isNavigateRoute) && (
        <div className="pointer-events-none absolute inset-x-0 top-14 bottom-16 z-10">
          <Hud />
        </div>
      )}

      {/* 3. Frosted Glass Backdrop for Modal / Card Screens */}
      {hasOverlayBackdrop && (
        <div className="absolute inset-0 z-15 bg-slate-900/20 dark:bg-slate-950/50 backdrop-blur-md pointer-events-none transition-all duration-300" />
      )}

      {/* 4. App Top Header (sticky) */}
      <Header onNavigateRoute={navigate} />

      {/* 5. Global Floating Toast Messages */}
      <Toast />

      {/* 6. Dynamic Route Overlays */}
      <main
        className={`relative z-20 flex-1 overflow-y-auto ${
          isCampusRoute || isNavigateRoute ? "pointer-events-none" : "pointer-events-auto"
        }`}
      >
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
            {isComplaintsRoute && (
              <ComplaintsScreen onNavigate={navigate} initialStandId={complaintStandId} />
            )}
            {isAdminQrRoute && <AdminQrCodesScreen onNavigate={navigate} />}
            {isAdminRoute && <AdminScreen onNavigate={navigate} />}
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
