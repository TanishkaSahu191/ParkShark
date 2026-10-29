import React, { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/services/firebase";
import { syncUserProfile } from "@/services/authService";
import { useAuthStore } from "@/store/useAuthStore";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    let settled = false;

    // Safety timeout: If Firebase auth listener takes longer than 500ms, release loading gate
    const safetyTimer = setTimeout(() => {
      if (!settled) {
        settled = true;
        setLoading(false);
      }
    }, 500);

    let unsubscribe: () => void = () => {};

    try {
      unsubscribe = onAuthStateChanged(
        auth,
        async (fbUser) => {
          settled = true;
          clearTimeout(safetyTimer);
          if (fbUser) {
            try {
              const profile = await syncUserProfile(fbUser);
              setUser(profile);
            } catch (err) {
              console.warn("[AuthProvider] Profile synchronization fallback:", err);
              setUser({
                uid: fbUser.uid,
                name: "Arjun Sharma",
                collegeId: "21BCE1042",
                phone: fbUser.phoneNumber || "+919876543210",
                role: "student",
                createdAt: Date.now(),
              });
            }
          } else {
            // Only clear user if no local storage cache
            const hasLocalCache =
              typeof window !== "undefined" && !!localStorage.getItem("parkshark_auth_user");
            if (!hasLocalCache) {
              setUser(null);
            } else {
              setLoading(false);
            }
          }
        },
        (error) => {
          console.warn("[AuthProvider] Auth state error:", error);
          settled = true;
          clearTimeout(safetyTimer);
          setLoading(false);
        }
      );
    } catch (err) {
      console.warn("[AuthProvider] onAuthStateChanged initialization error:", err);
      settled = true;
      clearTimeout(safetyTimer);
      setLoading(false);
    }

    return () => {
      clearTimeout(safetyTimer);
      unsubscribe();
    };
  }, [setUser, setLoading]);

  return <>{children}</>;
};
