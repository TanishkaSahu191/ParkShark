import React, { useState, useEffect } from "react";
import { Navigation, QrCode, Bike, MapPin, Eye, ListFilter, X, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { MobileControls } from "@/components/ui/MobileControls";
import { useBikesStore } from "@/store/useBikesStore";
import { groupStandsByBuilding, calculateDistance2D } from "@/utils/distance";
import { sim } from "@/campus/sim";

interface CampusScreenProps {
  onNavigate: (route: string) => void;
}

export const CampusScreen: React.FC<CampusScreenProps> = ({ onNavigate }) => {
  const {
    stands,
    selectedStandId,
    selectStand,
    getNearestAvailableStand,
    playerPosition,
  } = useBikesStore();

  const [nearest, setNearest] = useState<{ stand: any; distance: number } | null>(null);
  const [showAllStands, setShowAllStands] = useState(false);
  const [selectedBuildingTab, setSelectedBuildingTab] = useState<"ALL" | "AB1" | "AB2" | "AB3">("ALL");

  // Dynamically update nearest stand as player traverses campus
  useEffect(() => {
    const updateNearest = () => {
      const res = getNearestAvailableStand(sim.x, sim.z);
      setNearest(res);
    };

    updateNearest();
    const interval = setInterval(updateNearest, 350);
    return () => clearInterval(interval);
  }, [getNearestAvailableStand, playerPosition]);

  // Group stands by building with free counts (Requirement 4)
  const buildingSummaries = groupStandsByBuilding(stands);

  // Selected stand reference
  const highlightedStand = stands.find((s) => s.id === selectedStandId);
  const highlightedDistance = highlightedStand
    ? Math.round(calculateDistance2D(sim.x, sim.z, highlightedStand.position.x, highlightedStand.position.z) * 10) / 10
    : null;

  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-4 pb-20 overflow-hidden">
      {/* 1. Top HUD Overlay: Building Occupancy Chips with Free Counts (Requirement 4) */}
      <div className="pointer-events-auto flex items-center justify-between gap-2 max-w-4xl mx-auto w-full">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {(["AB1", "AB2", "AB3"] as const).map((code) => {
            const summary = buildingSummaries[code];
            const isFull = summary.available === 0;

            return (
              <button
                key={code}
                type="button"
                onClick={() => {
                  setSelectedBuildingTab(code);
                  setShowAllStands(true);
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-900/85 backdrop-blur-md border border-slate-700/80 hover:border-sky-500/80 shadow-sm text-xs font-semibold select-none transition-all active:scale-95"
                title={`Click to view ${code} stands`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-white font-mono">{code}</span>
                </div>
                <span className="text-slate-500">|</span>
                <span className={`${isFull ? "text-rose-400" : "text-emerald-400 font-medium"}`}>
                  {summary.available}/{summary.total} free
                </span>
              </button>
            );
          })}
        </div>

        {/* Toggle All Stands List */}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowAllStands(true)}
          leftIcon={<ListFilter className="size-3.5 text-sky-400" />}
          className="shadow-md bg-slate-900/90 text-xs backdrop-blur-md"
        >
          All Stands (150)
        </Button>
      </div>

      {/* 2. Middle Notification: Tapped / Highlighted Stand Banner */}
      {highlightedStand && (
        <div className="pointer-events-auto self-center max-w-md w-full animate-slide-up">
          <Card className="p-3 bg-sky-950/80 border-sky-400/40 backdrop-blur-md shadow-2xl flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <div className="size-7 rounded-lg bg-sky-500/20 text-sky-300 flex items-center justify-center shrink-0">
                <Sparkles className="size-4 animate-spin text-sky-300" />
              </div>
              <div className="truncate">
                <span className="font-semibold text-white">Highlighted: {highlightedStand.id}</span>
                <span className="text-slate-300 ml-1.5">({highlightedDistance}m away)</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Requirement 5: "View Route" goes to the navigation screen */}
              <Button
                variant="primary"
                size="sm"
                onClick={() => onNavigate(`/navigate/${highlightedStand.id}`)}
                leftIcon={<Navigation className="size-3" />}
                className="h-8 text-xs px-2.5"
              >
                View Route
              </Button>
              <button
                type="button"
                onClick={() => selectStand(null)}
                className="p-1 rounded-md text-slate-400 hover:text-white"
                title="Clear selection"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* 3. Floating Bottom Card: Nearest Available Stand (Requirement 4 & 5) */}
      <div className="pointer-events-auto max-w-sm w-full mx-auto sm:ml-4 sm:mr-auto mb-20 sm:mb-4">
        {nearest ? (
          <Card className="p-4 shadow-2xl border-white/20 bg-slate-900/90 backdrop-blur-xl">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="size-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                  <Bike className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-white">
                      Stand {nearest.stand.id}
                    </h3>
                    <StatusPill status={nearest.stand.status} size="sm" />
                  </div>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                    <MapPin className="size-3 text-sky-400" />
                    <span>{nearest.stand.building} Section &bull; {nearest.distance}m away</span>
                  </p>
                </div>
              </div>

              {/* Highlight button */}
              <button
                type="button"
                onClick={() => selectStand(nearest.stand.id)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-sky-300 hover:bg-white/10 transition-colors"
                title="Highlight in 3D campus"
              >
                <Eye className="size-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              {/* Requirement 5: "View Route" goes to the navigation screen */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate(`/navigate/${nearest.stand.id}`)}
                leftIcon={<Navigation className="size-3.5 text-sky-400" />}
              >
                View Route
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => onNavigate(`/lock/${nearest.stand.id}`)}
                leftIcon={<QrCode className="size-3.5" />}
              >
                Lock Here
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="p-3 text-center text-xs text-slate-400 bg-slate-900/80">
            <span>Finding nearest available stand on campus…</span>
          </Card>
        )}
      </div>

      {/* 4. All Stands Modal / Drawer Grouped by Building (Requirement 4) */}
      {showAllStands && (
        <div className="fixed inset-0 z-50 pointer-events-auto flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
          <Card className="w-full max-w-3xl max-h-[85vh] flex flex-col p-4 sm:p-6 bg-slate-900 border-slate-700 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-xl bg-[#1d4ed8] text-white flex items-center justify-center">
                  <Bike className="size-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white font-display">Campus Bicycle Stands</h2>
                  <p className="text-xs text-slate-400">150 numbered slots across AB1, AB2 and AB3</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAllStands(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Building Filter Tabs */}
            <div className="flex items-center gap-2 py-3 border-b border-slate-800 overflow-x-auto">
              <button
                type="button"
                onClick={() => setSelectedBuildingTab("ALL")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  selectedBuildingTab === "ALL"
                    ? "bg-[#1d4ed8] text-white shadow"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                All Buildings (150)
              </button>
              {(["AB1", "AB2", "AB3"] as const).map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setSelectedBuildingTab(b)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                    selectedBuildingTab === b
                      ? "bg-[#1d4ed8] text-white shadow"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  <span>{b}</span>
                  <span className="text-[11px] opacity-80">
                    ({buildingSummaries[b].available}/{buildingSummaries[b].total} free)
                  </span>
                </button>
              ))}
            </div>

            {/* Stands Grid grouped by building */}
            <div className="flex-1 overflow-y-auto py-4 space-y-5 pr-1">
              {(["AB1", "AB2", "AB3"] as const)
                .filter((b) => selectedBuildingTab === "ALL" || selectedBuildingTab === b)
                .map((b) => {
                  const summary = buildingSummaries[b];
                  return (
                    <div key={b} className="space-y-2">
                      <div className="flex items-center justify-between bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-700/50">
                        <span className="font-semibold text-sm text-white font-mono">{b} Grounds</span>
                        <span className="text-xs font-semibold text-emerald-400">
                          {summary.freeCountText}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                        {summary.stands.map((stand) => {
                          const dist = Math.round(
                            calculateDistance2D(sim.x, sim.z, stand.position.x, stand.position.z)
                          );
                          const isSelected = selectedStandId === stand.id;

                          return (
                            <div
                              key={stand.id}
                              onClick={() => {
                                // Requirement 4: "Tapping a stand highlights it in the scene"
                                selectStand(stand.id);
                              }}
                              className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                                isSelected
                                  ? "bg-sky-950/80 border-sky-400 ring-2 ring-sky-400/50 shadow-lg scale-[1.02]"
                                  : "bg-slate-800/70 border-slate-700/80 hover:border-slate-600 hover:bg-slate-800"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="font-mono font-bold text-xs text-white">
                                  {stand.id}
                                </span>
                                <StatusPill status={stand.status} size="sm" />
                              </div>

                              <div className="flex items-center justify-between text-[11px] text-slate-400">
                                <span>{dist}m away</span>
                                {stand.status === "available" && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowAllStands(false);
                                      onNavigate(`/navigate/${stand.id}`);
                                    }}
                                    className="text-sky-400 hover:text-sky-300 font-semibold hover:underline"
                                    title="View Route"
                                  >
                                    Route &rarr;
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
              <span>Tip: Tap any stand to highlight it with a glowing 3D beacon in the scene.</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAllStands(false)}
              >
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* On-screen touch controls for mobile devices */}
      <MobileControls />
    </div>
  );
};
