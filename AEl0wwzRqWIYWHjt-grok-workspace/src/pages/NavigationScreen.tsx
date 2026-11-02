import React, { useState, useEffect, useMemo } from "react";
import {
  QrCode,
  MapPin,
  X,
  AlertTriangle,
  RotateCw,
  CheckCircle2,
  Clock,
  Footprints,
  Info,
  Pause,
  Play,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { useBikesStore } from "@/store/useBikesStore";
import { sim, startAutoNav, stopAutoNav } from "@/campus/sim";
import { computeRoute } from "@/campus/NavigationPath";

/**
 * World Units to Metric Scale Documentation:
 * In ParkShark 3D campus, 1 world unit = 1.0 metre.
 * Average campus walking velocity = 1.3 m/s (~4.7 km/h).
 */
const METRES_PER_WORLD_UNIT = 1.0;
const WALKING_SPEED_MPS = 1.3;

function formatWalkingTime(seconds: number): string {
  if (seconds <= 4) return "Immediate (<5s)";
  if (seconds < 60) return `~${seconds}s walk`;
  const mins = Math.floor(seconds / 60);
  const remainingSecs = seconds % 60;
  return `${mins}m ${remainingSecs}s walk`;
}

interface NavigationScreenProps {
  standId: string;
  onNavigate: (route: string) => void;
}

export const NavigationScreen: React.FC<NavigationScreenProps> = ({ standId, onNavigate }) => {
  const { stands, getStandById, setNavigatingStandId, updateStandStatus } = useBikesStore();
  const stand = getStandById(standId);

  // Live navigation telemetry
  const [distance, setDistance] = useState(0);
  const [isAutoNavigating, setIsAutoNavigating] = useState(false);

  // Set navigating stand ID on mount and cleanup on unmount
  useEffect(() => {
    setNavigatingStandId(standId);

    // Auto-start auto-walk if URL param indicates or auto-nav was requested
    if (typeof window !== "undefined" && window.location.search.includes("autowalk=true") && stand) {
      const waypoints = computeRoute(sim.x, sim.z, stand.position.x, stand.position.z);
      startAutoNav(waypoints);
      setIsAutoNavigating(true);
    }

    return () => {
      setNavigatingStandId(null);
      stopAutoNav();
    };
  }, [standId, setNavigatingStandId, stand]);

  // Live telemetry loop (distance updated directly from sim state)
  useEffect(() => {
    if (!stand) return;

    const updateNav = () => {
      const dx = stand.position.x - sim.x;
      const dz = stand.position.z - sim.z;
      const d = Math.hypot(dx, dz) * METRES_PER_WORLD_UNIT;
      setDistance(Math.round(d * 10) / 10);
      setIsAutoNavigating(sim.autoNavActive);

      // If arrived while auto-navigating, stop auto-nav
      if (d <= 2.0 && sim.autoNavActive) {
        stopAutoNav();
        setIsAutoNavigating(false);
      }
    };

    updateNav();
    const interval = setInterval(updateNav, 80);
    return () => clearInterval(interval);
  }, [stand]);

  // Estimated walking duration in seconds based on 1.3 m/s pace
  const walkingTimeSeconds = Math.round(distance / WALKING_SPEED_MPS);

  // Requirement 3: "I've arrived" action appears when player is within 2 world units
  const hasArrived = distance <= 2.0;

  // Requirement 4: Next nearest available stand if the current stand becomes occupied
  const isOccupied = stand && stand.status !== "available";
  const alternativeStand = useMemo(() => {
    if (!stand || !isOccupied) return null;

    const availableStands = stands.filter(
      (s) => s.status === "available" && s.id !== stand.id
    );
    if (!availableStands.length) return null;

    let closest = availableStands[0];
    let minDistance = Infinity;

    for (const alt of availableStands) {
      const d = Math.hypot(alt.position.x - sim.x, alt.position.z - sim.z);
      if (d < minDistance) {
        minDistance = d;
        closest = alt;
      }
    }

    return {
      stand: closest,
      distance: Math.round(minDistance * 10) / 10,
    };
  }, [stands, stand, isOccupied]);

  // Cancel navigation handler
  const handleCancel = () => {
    stopAutoNav();
    setNavigatingStandId(null);
    onNavigate("/campus");
  };

  // Arrival handler
  const handleArrived = () => {
    onNavigate(`/lock/${stand?.id}`);
  };

  // Test simulation: toggle occupancy for testing Requirement 4
  const handleToggleSimulateOccupied = () => {
    if (!stand) return;
    const nextStatus = stand.status === "available" ? "occupied" : "available";
    updateStandStatus(stand.id, nextStatus);
  };

  if (!stand) {
    return (
      <div className="absolute inset-0 z-20 flex items-center justify-center p-4">
        <Card className="max-w-sm p-6 text-center bg-slate-900 border-slate-700">
          <h2 className="text-lg font-bold mb-2 text-white">Stand Not Found</h2>
          <p className="text-sm text-slate-400 mb-4">No stand matching ID "{standId}" exists.</p>
          <Button fullWidth onClick={() => onNavigate("/campus")}>
            Return to Campus
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-4 pb-20 overflow-hidden">
      {/* 1. Top Navigation Card (Telemetry, Stand Info, Cancel Button) */}
      <div className="pointer-events-auto max-w-lg w-full mx-auto animate-slide-down">
        <Card className="p-4 shadow-2xl border-slate-200 dark:border-white/20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl text-slate-900 dark:text-slate-100">
          {/* Header row: Waypoint tag, status, Cancel button */}
          <div className="flex items-center justify-between mb-3 border-b border-slate-200 dark:border-slate-800/80 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="flex size-2 rounded-full bg-sky-500 animate-ping" />
              <span className="text-[11px] uppercase tracking-wider font-bold text-sky-600 dark:text-sky-400 font-mono">
                Active 3D Waypoint
              </span>
            </div>

            <div className="flex items-center gap-2">
              <StatusPill status={stand.status} size="sm" />
              {/* Requirement 3: Cancel Button */}
              <button
                type="button"
                onClick={handleCancel}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-rose-50 dark:hover:bg-rose-900/60 transition-all border border-slate-200 dark:border-slate-700/80 active:scale-95"
                title="Cancel navigation"
              >
                <X className="size-3.5 text-rose-500" />
                <span>Cancel</span>
              </button>
            </div>
          </div>

          {/* Stand identification and live distance metrics */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black font-display text-slate-900 dark:text-white tracking-tight">
                Stand {stand.id}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                <MapPin className="size-3.5 text-rose-500 shrink-0" />
                <span>{stand.building} Section &bull; Slot #{stand.slot}</span>
              </p>
              {/* World unit scale documentation badge */}
              <div className="flex items-center gap-1 mt-2 text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                <Info className="size-3 text-sky-500/80" />
                <span>Scale: 1 unit = 1.0m &bull; Pace: 1.3 m/s</span>
              </div>
            </div>

            {/* Requirement 2: Live distance and walking time */}
            <div className="text-right bg-slate-100 dark:bg-slate-800/70 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60 min-w-28">
              <div className="text-2xl font-extrabold text-sky-600 dark:text-sky-400 font-mono tracking-tight">
                {distance.toFixed(1)}m
              </div>
              <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-1 mt-0.5">
                <Clock className="size-3" />
                <span>{formatWalkingTime(walkingTimeSeconds)}</span>
              </div>
              <span className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold block mt-0.5">
                {hasArrived ? "Arrived" : "Remaining"}
              </span>
            </div>
          </div>
        </Card>

        {/* Requirement 4: Occupancy Alert & Alternative Stand Suggestion */}
        {isOccupied && (
          <div className="mt-2 animate-bounce-short">
            <Card className="p-3.5 bg-rose-950/90 border-rose-500/60 shadow-2xl backdrop-blur-xl text-white">
              <div className="flex items-start gap-2.5">
                <div className="size-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle className="size-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-rose-300">
                      Stand {stand.id} is now occupied!
                    </h3>
                    <span className="text-[10px] bg-rose-500/30 text-rose-200 px-1.5 py-0.5 rounded font-mono">
                      Taken
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    Another student just parked at this rack. We recommend routing to the nearest
                    available slot:
                  </p>

                  {alternativeStand ? (
                    <div className="mt-2.5 p-2 rounded-lg bg-slate-900/80 border border-slate-700/80 flex items-center justify-between gap-2">
                      <div>
                        <div className="font-bold text-xs text-white">
                          Stand {alternativeStand.stand.id}
                        </div>
                        <div className="text-[11px] text-emerald-400">
                          {alternativeStand.stand.building} Section &bull; {alternativeStand.distance}m away
                        </div>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => onNavigate(`/navigate/${alternativeStand.stand.id}`)}
                        leftIcon={<RotateCw className="size-3.5" />}
                        className="h-7 text-xs px-2.5 bg-sky-600 hover:bg-sky-500"
                      >
                        Reroute
                      </Button>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 mt-1">No other stands are currently available.</p>
                  )}
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>


      {/* 3. Bottom Action Card & Arrival Confirmation */}
      <div className="pointer-events-auto max-w-lg w-full mx-auto space-y-2 mb-16 sm:mb-2">
        <Card className="p-3.5 shadow-2xl border-slate-200 dark:border-white/20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl text-slate-900 dark:text-slate-100">
          {/* Requirement 3: "I've arrived" action appears when player is within 2 world units */}
          {hasArrived ? (
            <div className="space-y-2 animate-fade-in">
              <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-800 dark:text-emerald-300 text-xs">
                <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span className="font-semibold">
                  You are within 2m of Rack {stand.id}! Ready to check in.
                </span>
              </div>
              <Button
                fullWidth
                size="lg"
                variant="primary"
                onClick={handleArrived}
                leftIcon={<QrCode className="size-5" />}
                className="bg-emerald-600 hover:bg-emerald-500 font-bold shadow-lg shadow-emerald-900/50"
              >
                I've Arrived — Lock Here
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Footprints className="size-3.5 text-sky-500 dark:text-sky-400" />
                  <span>Walk within 2.0m to unlock check-in</span>
                </span>
                <span className="font-mono text-slate-900 dark:text-white font-semibold">
                  {(distance - 2.0).toFixed(1)}m to arrival zone
                </span>
              </div>

              {/* Progress bar to 2m arrival threshold */}
              <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-sky-500 h-full transition-all duration-150"
                  style={{
                    width: `${Math.min(100, Math.max(5, (1 - (distance - 2) / Math.max(30, distance)) * 100))}%`,
                  }}
                />
              </div>

              {/* Auto-walk along route control */}
              {isAutoNavigating ? (
                <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/80 border border-sky-300 dark:border-sky-500/40 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-sky-800 dark:text-sky-200">
                    <span className="size-2 rounded-full bg-sky-500 animate-ping" />
                    <Footprints className="size-4 text-sky-600 dark:text-sky-400" />
                    <span className="font-semibold">Auto-navigating to Stand {stand.id}...</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      stopAutoNav();
                      setIsAutoNavigating(false);
                    }}
                    leftIcon={<Pause className="size-3.5 text-amber-500" />}
                    className="h-7 text-xs px-2.5 border-amber-500/40 text-amber-600 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/60"
                  >
                    Pause
                  </Button>
                </div>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  fullWidth
                  onClick={() => {
                    const waypoints = computeRoute(sim.x, sim.z, stand.position.x, stand.position.z);
                    startAutoNav(waypoints);
                    setIsAutoNavigating(true);
                  }}
                  leftIcon={<Footprints className="size-4 text-white" />}
                  className="bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 font-semibold shadow-md shadow-blue-500/20 text-xs py-2"
                >
                  Auto-Walk to Stand {stand.id} (Take Me There)
                </Button>
              )}

              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  className="text-xs"
                >
                  Cancel Navigation
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onNavigate(`/lock/${stand.id}`)}
                  leftIcon={<QrCode className="size-3.5" />}
                  className="text-xs"
                >
                  Scan QR Directly
                </Button>
              </div>
            </div>
          )}

          {/* Test tool: Simulate occupancy toggle for evaluation */}
          <div className="pt-2 mt-2 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>Test Scenario:</span>
            <button
              type="button"
              onClick={handleToggleSimulateOccupied}
              className="text-sky-600 dark:text-sky-400 hover:underline font-semibold text-[11px]"
            >
              {stand.status === "available"
                ? "Simulate: Mark Stand Occupied"
                : "Reset: Mark Stand Available"}
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};
