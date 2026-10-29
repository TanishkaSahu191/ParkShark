import React from "react";
import { Bike, Clock, Leaf, History, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { useAuthStore } from "@/store/useAuthStore";
import { useSessionStore } from "@/store/useSessionStore";

interface DashboardScreenProps {
  onNavigate: (route: string) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ onNavigate }) => {
  const { user } = useAuthStore();
  const { activeSession, history } = useSessionStore();

  const totalCompletedRides = history.filter((h) => h.status === "completed").length;
  const totalHoursParked = history.reduce((acc, h) => acc + h.durationHours, 0) + (activeSession?.durationHours || 0);
  const carbonSavedKg = (totalHoursParked * 0.45).toFixed(1);

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] p-4 max-w-4xl mx-auto pb-24 space-y-6 animate-fade-in">
      {/* User Profile Card */}
      <Card className="p-6 shadow-xl border-white/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="size-14 rounded-2xl bg-gradient-to-tr from-[#1d4ed8] to-sky-400 text-white flex items-center justify-center font-bold text-xl shadow-md">
              {user?.name?.[0] || "U"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold font-display text-slate-900 dark:text-white">
                  {user?.name || "Student"}
                </h1>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950/60 text-[#1d4ed8] dark:text-sky-400 border border-sky-300 dark:border-sky-800">
                  {user?.role || "Student"}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Reg No: <span className="font-semibold text-slate-700 dark:text-slate-300">{user?.collegeId || "21BCE1042"}</span> &bull; {user?.phone || "+91 9876543210"}
              </p>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => onNavigate("/campus")}
            leftIcon={<Bike className="size-4" />}
          >
            Explore 3D Campus
          </Button>
        </div>
      </Card>

      {/* Campus Impact Metrics */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <Card className="p-4 text-center">
          <div className="size-9 rounded-xl bg-blue-500/10 text-[#1d4ed8] dark:text-sky-400 flex items-center justify-center mx-auto mb-2">
            <Bike className="size-5" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
            {totalCompletedRides + (activeSession ? 1 : 0)}
          </div>
          <div className="text-[11px] text-slate-400 uppercase font-semibold mt-0.5">
            Total Rides
          </div>
        </Card>

        <Card className="p-4 text-center">
          <div className="size-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-2">
            <Leaf className="size-5" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
            {carbonSavedKg} <span className="text-sm font-normal">kg</span>
          </div>
          <div className="text-[11px] text-slate-400 uppercase font-semibold mt-0.5">
            CO₂ Saved
          </div>
        </Card>

        <Card className="p-4 text-center">
          <div className="size-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-2">
            <Clock className="size-5" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
            {totalHoursParked} <span className="text-sm font-normal">hrs</span>
          </div>
          <div className="text-[11px] text-slate-400 uppercase font-semibold mt-0.5">
            Parked Time
          </div>
        </Card>
      </div>

      {/* Active Session Callout if any */}
      {activeSession && (
        <Card className="p-5 border-emerald-500/40 bg-emerald-50/20 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="size-3 rounded-full bg-emerald-500 animate-ping" />
              <div>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  Live Session in Progress
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Parked at Stand {activeSession.standId}
                </h3>
              </div>
            </div>
            <Button
              size="sm"
              variant="primary"
              onClick={() => onNavigate("/session")}
              rightIcon={<ChevronRight className="size-4" />}
            >
              Open Timer
            </Button>
          </div>
        </Card>
      )}

      {/* Parking History Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History className="size-5 text-slate-400" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Parking & Ride History
            </h2>
          </div>
          <span className="text-xs text-slate-400">{history.length} records</span>
        </div>

        {history.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">No parking sessions yet.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {history.map((item) => (
              <div key={item.id} className="py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-xs">
                    {item.building}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-slate-900 dark:text-white">
                      Stand {item.standId}
                    </h4>
                    <p className="text-xs text-slate-400">
                      {new Date(item.startAt).toLocaleDateString()} &bull; {item.durationHours} hr allotted
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <StatusPill status={item.status === "completed" ? "available" : "maintenance"} size="sm" />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
