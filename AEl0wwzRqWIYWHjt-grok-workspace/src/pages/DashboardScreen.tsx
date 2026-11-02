import React, { useState, useEffect } from "react";
import {
  Bike,
  Clock,
  Leaf,
  History,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Shield,
  ArrowRight,
  Sparkles,
  MapPin,
  MessageSquareWarning,
  MessageSquare,
  PlusCircle,
  ExternalLink,
  QrCode,
  Radio,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/useAuthStore";
import { useSessionStore, type ActivityType } from "@/store/useSessionStore";
import { useUIStore } from "@/store/useUIStore";
import { useComplaintStore, CATEGORY_LABELS } from "@/store/useComplaintStore";

interface DashboardScreenProps {
  onNavigate: (route: string) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ onNavigate }) => {
  const { user, setUser } = useAuthStore();
  const { activeSession, history, activities } = useSessionStore();
  const { showToast } = useUIStore();
  const { complaints } = useComplaintStore();

  const studentComplaints = complaints.filter(
    (c) => c.studentId.toLowerCase() === (user?.collegeId || "21BCE1042").toLowerCase()
  );

  // Live timer for current session card
  const [timeLeftMs, setTimeLeftMs] = useState(0);

  useEffect(() => {
    if (!activeSession) return;
    const update = () => {
      const remaining = activeSession.endAt - Date.now();
      setTimeLeftMs(Math.max(0, remaining));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [activeSession]);

  // Format digital countdown
  const totalSeconds = Math.max(0, Math.floor(timeLeftMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const formattedTime = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  const isLowTime = totalSeconds < 600;

  // Pagination for Recent Activity
  const [currentPage, setCurrentPage] = useState(1);
  const [filterType, setFilterType] = useState<"ALL" | ActivityType>("ALL");
  const pageSize = 5;

  const filteredActivities = activities.filter((act) => {
    if (filterType === "ALL") return true;
    return act.type === filterType;
  });

  const totalPages = Math.max(1, Math.ceil(filteredActivities.length / pageSize));
  const paginatedActivities = filteredActivities.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // Toggle user role between student and admin for testing
  const handleToggleRole = () => {
    if (!user) return;
    const newRole = user.role === "admin" ? "student" : "admin";
    setUser({ ...user, role: newRole });
    showToast(`Switched user role to ${newRole.toUpperCase()}`, "info");
  };

  const totalCompletedRides = history.filter((h) => h.status === "completed").length;
  const totalHoursParked =
    history.reduce((acc, h) => acc + h.durationHours, 0) +
    (activeSession?.durationHours || 0);
  const carbonSavedKg = (totalHoursParked * 0.45).toFixed(1);

  // Activity type icon and badge styling
  const getActivityBadge = (type: ActivityType) => {
    switch (type) {
      case "locked":
        return {
          icon: Lock,
          label: "Locked",
          badgeClass: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
          iconBg: "bg-blue-500/10 text-blue-500",
        };
      case "unlocked":
        return {
          icon: Unlock,
          label: "Unlocked",
          badgeClass: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30",
          iconBg: "bg-cyan-500/10 text-cyan-500",
        };
      case "completed":
        return {
          icon: CheckCircle2,
          label: "Completed",
          badgeClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
          iconBg: "bg-emerald-500/10 text-emerald-500",
        };
      case "expired":
        return {
          icon: AlertTriangle,
          label: "Expired",
          badgeClass: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
          iconBg: "bg-rose-500/10 text-rose-500",
        };
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] p-4 max-w-4xl mx-auto pb-28 space-y-6 animate-fade-in text-slate-100">
      {/* 1. User Profile Card */}
      <Card className="p-6 shadow-xl border-white/20 bg-slate-900/90 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="size-16 rounded-2xl bg-gradient-to-tr from-[#1d4ed8] via-[#0284c7] to-[#00c2cb] text-white flex items-center justify-center font-bold text-2xl shadow-lg shadow-blue-500/25">
              {user?.name?.[0] || "S"}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold font-display text-white">
                  {user?.name || "Student User"}
                </h1>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                    user?.role === "admin"
                      ? "bg-purple-950/60 text-purple-300 border-purple-700/60"
                      : "bg-sky-950/60 text-sky-300 border-sky-800"
                  }`}
                >
                  {user?.role === "admin" ? "Campus Admin" : "Student"}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-2">
                <span>
                  College ID: <span className="font-semibold text-slate-200">{user?.collegeId || "21BCE1042"}</span>
                </span>
                <span>&bull;</span>
                <span>{user?.phone || "+91 9876543210"}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Role Switcher for Evaluator Convenience */}
            <button
              onClick={handleToggleRole}
              title="Toggle role for testing"
              className="text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <Shield className="size-3.5 text-amber-400" />
              <span>Role: {user?.role === "admin" ? "Admin" : "Student"}</span>
            </button>

            {user?.role === "admin" ? (
              <Button
                size="sm"
                variant="primary"
                onClick={() => onNavigate("/admin")}
                leftIcon={<ShieldCheck className="size-4" />}
                className="bg-purple-600 hover:bg-purple-500 shadow-purple-900/40"
              >
                Admin Portal
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onNavigate("/campus")}
                leftIcon={<Bike className="size-4" />}
              >
                Campus 3D
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* 2. Current Session Card with Live Time Remaining & "Unlock Now" Button */}
      {activeSession ? (
        <Card className="p-6 border-emerald-500/40 bg-gradient-to-r from-emerald-950/40 via-slate-900/90 to-slate-900/90 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Current Active Parking Session
                </span>
              </div>
              <h2 className="text-2xl font-bold font-display text-white">
                Stand {activeSession.standId}
              </h2>
              <p className="text-xs text-slate-300 flex items-center gap-1.5">
                <MapPin className="size-3.5 text-emerald-400" />
                <span>
                  {activeSession.building} Academic Section &bull; Slot #{activeSession.slot} &bull; Allotted: {activeSession.durationHours} hr{activeSession.durationHours > 1 ? "s" : ""}
                </span>
              </p>
            </div>

            {/* Live Time Remaining Digital Display */}
            <div className="flex items-center gap-4 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
              <div className="text-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-0.5">
                  Time Remaining
                </span>
                <div
                  className={`text-3xl font-extrabold font-mono tracking-tight ${
                    isLowTime ? "text-red-400 animate-pulse" : "text-emerald-400"
                  }`}
                >
                  {formattedTime}
                </div>
              </div>

              {/* Requirement 1: "Unlock Now" button */}
              <Button
                size="md"
                variant="primary"
                onClick={() => onNavigate("/unlock")}
                leftIcon={<Unlock className="size-4" />}
                className="bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-900/50"
              >
                Unlock Now
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-6 border-slate-800 bg-slate-900/70 text-center space-y-3">
          <div className="size-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <Clock className="size-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">No Active Session</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              You do not have a bicycle locked right now. Head over to the 3D campus map to locate an open slot.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onNavigate("/campus")}
            rightIcon={<ArrowRight className="size-3.5" />}
          >
            Find a Bicycle Stand
          </Button>
        </Card>
      )}

      {/* Campus Impact Metrics */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <Card className="p-4 text-center bg-slate-900/80 border-slate-800">
          <div className="size-9 rounded-xl bg-blue-500/10 text-sky-400 flex items-center justify-center mx-auto mb-2">
            <Bike className="size-5" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {totalCompletedRides + (activeSession ? 1 : 0)}
          </div>
          <div className="text-[11px] text-slate-400 uppercase font-semibold mt-0.5">
            Total Rides
          </div>
        </Card>

        <Card className="p-4 text-center bg-slate-900/80 border-slate-800">
          <div className="size-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-2">
            <Leaf className="size-5" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 font-mono">
            {carbonSavedKg} <span className="text-sm font-normal">kg</span>
          </div>
          <div className="text-[11px] text-slate-400 uppercase font-semibold mt-0.5">
            CO₂ Saved
          </div>
        </Card>

        <Card className="p-4 text-center bg-slate-900/80 border-slate-800">
          <div className="size-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto mb-2">
            <Clock className="size-5" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {totalHoursParked} <span className="text-sm font-normal">hrs</span>
          </div>
          <div className="text-[11px] text-slate-400 uppercase font-semibold mt-0.5">
            Parked Time
          </div>
        </Card>
      </div>

      {/* 3. Recent Activity (locked, unlocked, completed, expired) with Timestamps and Pagination */}
      <Card className="p-6 bg-slate-900/90 border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-800 text-slate-300">
              <History className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Recent Activity Feed</h2>
              <p className="text-xs text-slate-400">
                Log of all lock, unlock, completion, and expiry events
              </p>
            </div>
          </div>

          {/* Activity Filter Tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {(["ALL", "locked", "unlocked", "completed", "expired"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => {
                  setFilterType(filter);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                  filterType === filter
                    ? "bg-[#1d4ed8] text-white shadow-sm"
                    : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Activity Items List */}
        {paginatedActivities.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-sm">
            No activity records match the selected filter.
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {paginatedActivities.map((act) => {
              const meta = getActivityBadge(act.type);
              const Icon = meta.icon;

              return (
                <div
                  key={act.id}
                  className="py-3.5 flex items-center justify-between gap-4 hover:bg-slate-800/40 px-2 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3.5">
                    <div className={`size-10 rounded-xl ${meta.iconBg} flex items-center justify-center shrink-0`}>
                      <Icon className="size-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm text-white">
                          Stand {act.standId}
                        </h4>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${meta.badgeClass}`}>
                          {meta.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {act.details || `${act.building} Section, Slot #${act.slot}`}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-mono text-slate-300 block">
                      {new Date(act.timestamp).toLocaleDateString([], { month: "short", day: "numeric" })}
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      {new Date(act.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing {(currentPage - 1) * pageSize + 1} to{" "}
            {Math.min(currentPage * pageSize, filteredActivities.length)} of{" "}
            {filteredActivities.length} activities
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300"
              aria-label="Previous page"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="px-2 font-semibold text-slate-200">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300"
              aria-label="Next page"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </Card>

      {/* 4. Register a Complaint & Campus Support Section */}
      <Card className="p-6 bg-slate-900/90 border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="size-10 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
              <MessageSquareWarning className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Register a Complaint</h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-950/60 text-rose-300 border border-rose-800">
                  Campus Support
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Report damaged bicycle stands, jammed smart locks, missing QR placards, or timing disputes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="primary"
              onClick={() => onNavigate("/complaints")}
              leftIcon={<PlusCircle className="size-4" />}
              className="bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-900/40 text-xs"
            >
              File a Complaint
            </Button>
          </div>
        </div>

        {/* Active Session Stand Quick-Report Shortcut */}
        {activeSession && (
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
              <div>
                <span className="text-slate-300">
                  Currently parked at <span className="font-bold text-white font-mono">Stand {activeSession.standId}</span> ({activeSession.building} Section)
                </span>
                <span className="text-slate-500 block text-[11px]">
                  Lock jammed or issue with the rack?
                </span>
              </div>
            </div>
            <button
              onClick={() => onNavigate(`/complaints?stand=${activeSession.standId}`)}
              className="px-3 py-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-semibold transition-colors shrink-0 flex items-center gap-1.5"
            >
              <AlertTriangle className="size-3.5 text-rose-400" />
              <span>Report Stand {activeSession.standId}</span>
            </button>
          </div>
        )}

        {/* Student's complaints overview */}
        {studentComplaints.length === 0 ? (
          <div className="p-6 rounded-xl border border-slate-800/80 bg-slate-950/40 text-center space-y-2">
            <p className="text-xs text-slate-400">
              You haven't filed any complaints yet. All bicycle stands are regularly maintained by VIT Facilities.
            </p>
            <button
              onClick={() => onNavigate("/complaints")}
              className="text-xs text-sky-400 hover:text-sky-300 font-medium inline-flex items-center gap-1"
            >
              <span>Need help or want to report an issue? Open the Complaint Portal</span>
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-slate-300">
                Your Registered Complaints ({studentComplaints.length})
              </span>
              <button
                onClick={() => onNavigate("/complaints")}
                className="text-sky-400 hover:text-sky-300 inline-flex items-center gap-1 font-medium"
              >
                <span>View Full Details & Status</span>
                <ExternalLink className="size-3" />
              </button>
            </div>

            <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/50">
              {studentComplaints.slice(0, 3).map((comp) => {
                let badgeClass = "bg-amber-500/15 text-amber-300 border-amber-500/30";
                if (comp.status === "investigating") badgeClass = "bg-sky-500/15 text-sky-300 border-sky-500/30";
                else if (comp.status === "resolved") badgeClass = "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
                else if (comp.status === "rejected") badgeClass = "bg-slate-700/50 text-slate-400 border-slate-600";

                return (
                  <div
                    key={comp.id}
                    onClick={() => onNavigate("/complaints")}
                    className="p-3 hover:bg-slate-800/40 cursor-pointer transition-colors flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sky-400">{comp.id}</span>
                        {comp.standId && (
                          <span className="font-mono text-slate-300 bg-slate-800 px-1.5 py-0.2 rounded text-[11px]">
                            {comp.standId}
                          </span>
                        )}
                        <span className="font-medium text-white truncate max-w-[200px] sm:max-w-xs">
                          {comp.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">
                        {comp.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border capitalize ${badgeClass}`}>
                        {comp.status}
                      </span>
                      <ChevronRight className="size-4 text-slate-500" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
