import React, { useState, useEffect } from "react";
import { ArrowLeft, Navigation as NavIcon, QrCode, MapPin } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { useBikesStore } from "@/store/useBikesStore";
import { sim } from "@/campus/sim";

interface NavigationScreenProps {
  standId: string;
  onNavigate: (route: string) => void;
}

export const NavigationScreen: React.FC<NavigationScreenProps> = ({ standId, onNavigate }) => {
  const { getStandById } = useBikesStore();
  const stand = getStandById(standId);

  const [distance, setDistance] = useState(0);
  const [bearingAngle, setBearingAngle] = useState(0);

  useEffect(() => {
    if (!stand) return;

    const updateNav = () => {
      const dx = stand.position.x - sim.x;
      const dz = stand.position.z - sim.z;
      const d = Math.hypot(dx, dz);
      setDistance(Math.round(d));

      // Calculate relative angle to target from player's current view yaw
      // In 3D campus: Forward is -Z, Right is +X.
      const targetAngle = Math.atan2(dx, -dz);
      const relativeAngle = targetAngle - sim.yaw;
      setBearingAngle(relativeAngle * (180 / Math.PI));
    };

    updateNav();
    const interval = setInterval(updateNav, 150);
    return () => clearInterval(interval);
  }, [stand]);

  if (!stand) {
    return (
      <div className="absolute inset-0 z-20 flex items-center justify-center p-4">
        <Card className="max-w-sm p-6 text-center">
          <h2 className="text-lg font-bold mb-2">Stand Not Found</h2>
          <p className="text-sm text-slate-400 mb-4">No stand matching ID "{standId}" exists.</p>
          <Button fullWidth onClick={() => onNavigate("/campus")}>
            Return to Campus
          </Button>
        </Card>
      </div>
    );
  }

  const isNearby = distance <= 5;

  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-4 pb-24 overflow-hidden">
      {/* Top Banner: Waypoint Info */}
      <div className="pointer-events-auto max-w-md w-full mx-auto">
        <Card className="p-4 shadow-xl border-white/20">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => onNavigate("/campus")}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              <ArrowLeft className="size-4" />
              <span>Back</span>
            </button>
            <StatusPill status={stand.status} size="sm" />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] uppercase tracking-wider font-bold text-sky-600 dark:text-sky-400">
                Guiding to Stand
              </span>
              <h2 className="text-2xl font-bold font-display text-slate-900 dark:text-white">
                {stand.id}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                <MapPin className="size-3 text-red-500" />
                <span>{stand.building} Section &bull; Slot #{stand.slot}</span>
              </p>
            </div>

            {/* Live Distance Pill */}
            <div className="text-right">
              <div className="text-2xl font-extrabold text-[#1d4ed8] dark:text-sky-300 font-mono">
                {distance}m
              </div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">
                {isNearby ? "You're Here!" : "Remaining"}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Center Dynamic Compass Pointer */}
      <div className="pointer-events-none flex flex-col items-center justify-center my-auto">
        <div className="size-28 rounded-full bg-slate-900/40 backdrop-blur-md border border-white/30 flex items-center justify-center relative shadow-2xl">
          <div
            style={{ transform: `rotate(${bearingAngle}deg)` }}
            className="transition-transform duration-100 ease-out flex flex-col items-center"
          >
            <NavIcon className="size-12 text-[#1d4ed8] dark:text-sky-300 fill-current drop-shadow-md" />
          </div>
          <span className="absolute bottom-2 text-[10px] font-bold text-white/70 uppercase tracking-widest">
            {distance}m
          </span>
        </div>
        <p className="mt-2 text-xs font-semibold text-white/90 drop-shadow-md bg-black/40 px-3 py-1 rounded-full">
          Follow the arrow in 3D
        </p>
      </div>

      {/* Bottom Action Card */}
      <div className="pointer-events-auto max-w-md w-full mx-auto">
        <Card className="p-4 shadow-xl border-white/20">
          <Button
            fullWidth
            size="lg"
            variant="primary"
            onClick={() => onNavigate(`/lock/${stand.id}`)}
            leftIcon={<QrCode className="size-5" />}
          >
            {isNearby ? "Scan QR & Lock Here" : "Arrived? Scan Stand QR"}
          </Button>
        </Card>
      </div>
    </div>
  );
};
