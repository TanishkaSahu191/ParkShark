import React, { useState, useEffect } from "react";
import {
  Compass,
  Navigation,
  MapPin,
  Bike,
  Sparkles,
  X,
  CheckCircle2,
  Clock,
  Radio,
  Footprints,
  ShieldCheck,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { useBikesStore } from "@/store/useBikesStore";
import { sim } from "@/campus/sim";
import { computeRoute } from "@/campus/NavigationPath";
import { startAutoNav } from "@/campus/sim";

interface LocationTracerModalProps {
  onNavigate: (route: string) => void;
  onClose: () => void;
}

export const LocationTracerModal: React.FC<LocationTracerModalProps> = ({
  onNavigate,
  onClose,
}) => {
  const {
    stands,
    getNearestAvailableStand,
    setNavigatingStandId,
    setUserTracedLocation,
  } = useBikesStore();

  const [stage, setStage] = useState<"tracing" | "located">("tracing");
  const [gpsData, setGpsData] = useState<{
    lat: number;
    lng: number;
    accuracy: number;
    placeName: string;
  }>({
    lat: 23.0775,
    lng: 76.8513,
    accuracy: 8,
    placeName: sim.place || "Main Gate Entrance",
  });

  const [nearestStandResult, setNearestStandResult] = useState<ReturnType<
    typeof getNearestAvailableStand
  > | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const completeLocationLock = (lat: number, lng: number, accuracy: number) => {
      if (isCancelled) return;
      const placeName = sim.place || "Main Gate Entrance";
      setGpsData({ lat, lng, accuracy, placeName });

      // Save into store
      setUserTracedLocation({
        latitude: lat,
        longitude: lng,
        accuracy,
        placeName,
        campusCoords: { x: sim.x, z: sim.z },
      });

      // Find nearest available parking slot from current position
      const nearest = getNearestAvailableStand(sim.x, sim.z);
      setNearestStandResult(nearest);

      // Smooth, responsive transition to located view
      setTimeout(() => {
        if (!isCancelled) {
          setStage("located");
        }
      }, 250);
    };

    // Query browser geolocation API
    if (typeof navigator !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          completeLocationLock(
            pos.coords.latitude,
            pos.coords.longitude,
            Math.round(pos.coords.accuracy) || 6
          );
        },
        () => {
          // Graceful fallback to VIT Bhopal campus center coordinates
          completeLocationLock(23.0775, 76.8513, 10);
        },
        { enableHighAccuracy: false, timeout: 600, maximumAge: 30000 }
      );
    } else {
      completeLocationLock(23.0775, 76.8513, 10);
    }

    return () => {
      isCancelled = true;
    };
  }, [getNearestAvailableStand, setUserTracedLocation]);

  const handleViewRoute = () => {
    if (!nearestStandResult) return;
    setNavigatingStandId(nearestStandResult.stand.id);
    onClose();
    onNavigate(`/navigate/${nearestStandResult.stand.id}`);
  };

  const handleTakeMeThere = () => {
    if (!nearestStandResult) return;
    const stand = nearestStandResult.stand;
    setNavigatingStandId(stand.id);
    const waypoints = computeRoute(
      sim.x,
      sim.z,
      stand.position.x,
      stand.position.z
    );
    startAutoNav(waypoints);
    onClose();
    onNavigate(`/navigate/${stand.id}?autowalk=true`);
  };

  const walkingSeconds = nearestStandResult
    ? Math.round(nearestStandResult.distance / 1.3)
    : 0;

  return (
    <div className="fixed inset-0 z-50 pointer-events-auto flex items-center justify-center p-4 bg-black/60 dark:bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <Card className="w-full max-w-lg p-5 sm:p-6 bg-white dark:bg-slate-900/95 border-slate-200 dark:border-sky-500/30 shadow-2xl rounded-2xl relative overflow-hidden text-slate-900 dark:text-slate-100">
        {/* Glow ambient background accents */}
        <div className="absolute -top-24 -right-24 size-48 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 size-48 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Compass className="size-5 animate-spin-slow" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white font-display">
                Smart Parking Assistant
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Live location tracing & nearest slot matching
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Dismiss"
          >
            <X className="size-5" />
          </button>
        </div>

        {stage === "tracing" ? (
          /* Tracing Phase */
          <div className="py-8 flex flex-col items-center text-center space-y-4">
            <div className="relative size-24 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-sky-400/40 animate-ping" />
              <div className="absolute inset-2 rounded-full border border-sky-400/60 animate-pulse" />
              <div className="size-16 rounded-full bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center shadow-lg shadow-sky-500/30">
                <Radio className="size-8 animate-spin" />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Tracing Your Location...
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                Connecting to campus GPS beacons and mapping your coordinates to VIT Bhopal University 3D ground.
              </p>
            </div>

            <div className="flex items-center gap-2 text-[11px] font-mono text-sky-700 dark:text-sky-400 bg-sky-100 dark:bg-sky-950/60 px-3 py-1.5 rounded-full border border-sky-300 dark:border-sky-500/30">
              <span className="size-2 rounded-full bg-sky-500 animate-ping" />
              <span>Scanning campus nodes &amp; parking sensors...</span>
            </div>
          </div>
        ) : (
          /* Location Traced & Nearest Slot Found */
          <div className="space-y-4 animate-fade-in">
            {/* User Location Detected Banner */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="size-4" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>Location Traced:</span>
                    <span className="text-emerald-600 dark:text-emerald-400">{gpsData.placeName}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                    GPS: {gpsData.lat.toFixed(4)}° N, {gpsData.lng.toFixed(4)}° E &bull; Grid ({sim.x.toFixed(1)}, {sim.z.toFixed(1)})
                  </div>
                </div>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 shrink-0">
                Live
              </span>
            </div>

            {/* Nearest Available Parking Slot Card */}
            {nearestStandResult ? (
              <div className="p-4 rounded-xl bg-gradient-to-br from-sky-50 dark:from-sky-950/90 via-white dark:via-slate-900 to-white dark:to-slate-900 border-2 border-sky-400/60 shadow-xl space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#d4a017]/20 border border-[#d4a017]/40 text-amber-700 dark:text-[#d4a017] text-[10px] font-bold uppercase tracking-wider mb-1.5">
                      <Sparkles className="size-3" />
                      Nearest Available Slot
                    </div>
                    <h3 className="text-2xl font-black font-display text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                      <span>Stand {nearestStandResult.stand.id}</span>
                      <StatusPill status={nearestStandResult.stand.status} size="sm" />
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1 mt-0.5">
                      <MapPin className="size-3.5 text-rose-500 shrink-0" />
                      <span>
                        {nearestStandResult.stand.building} Section &bull; Slot #{nearestStandResult.stand.slot}
                      </span>
                    </p>
                  </div>

                  <div className="text-right bg-slate-100 dark:bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700/80 shrink-0">
                    <div className="text-xl font-black font-mono text-sky-600 dark:text-sky-400">
                      {nearestStandResult.distance}m
                    </div>
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center justify-end gap-1 mt-0.5">
                      <Clock className="size-3" />
                      <span>~{walkingSeconds}s walk</span>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-200 dark:border-white/5 flex items-center gap-2">
                  <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>
                    Secured smart rack with QR-code locking and real-time electronic occupancy detection.
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
                No stands are currently marked available.
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2 pt-1">
              {/* Primary: View Route */}
              <Button
                variant="primary"
                size="md"
                fullWidth
                onClick={handleViewRoute}
                leftIcon={<Navigation className="size-4" />}
                className="bg-sky-600 hover:bg-sky-500 font-bold py-2.5 text-sm shadow-lg shadow-sky-600/30"
              >
                View Route to Stand {nearestStandResult?.stand.id}
              </Button>

              {/* Take Me to Slot (Auto-Walk) */}
              <Button
                variant="outline"
                size="md"
                fullWidth
                onClick={handleTakeMeThere}
                leftIcon={<Footprints className="size-4 text-sky-500 dark:text-sky-400" />}
                className="border-slate-300 dark:border-sky-500/40 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-xs font-semibold"
              >
                Take Me to Slot (Auto-Walk Along Route)
              </Button>

              {/* Dismiss / Explore Campus */}
              <button
                type="button"
                onClick={onClose}
                className="w-full text-center py-1 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-300 transition-colors"
              >
                Explore campus freely on your own
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

