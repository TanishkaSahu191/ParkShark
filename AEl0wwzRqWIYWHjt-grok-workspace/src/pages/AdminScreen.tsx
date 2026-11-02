import React, { useState, useMemo } from "react";
import {
  ShieldCheck,
  Flame,
  QrCode,
  ArrowLeft,
  Users,
  Bike,
  Clock,
  TrendingUp,
  AlertTriangle,
  Upload,
  Download,
  CheckCircle2,
  XCircle,
  FileText,
  Search,
  Wrench,
  Unlock,
  Building2,
  BarChart3,
  Edit2,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { StatusPill } from "@/components/ui/StatusPill";
import { QrCodeSvg } from "@/components/ui/QrCodeSvg";
import { createStandQRPayload } from "@/utils/qr";
import { useAuthStore } from "@/store/useAuthStore";
import { useBikesStore } from "@/store/useBikesStore";
import { useSessionStore } from "@/store/useSessionStore";
import { useUIStore } from "@/store/useUIStore";
import {
  parseStudentCsv,
  bulkRegisterStudents,
  getRegisteredStudents,
  type PreRegisteredStudent,
} from "@/services/authService";
import {
  useComplaintStore,
  CATEGORY_LABELS,
  type ComplaintStatus,
} from "@/store/useComplaintStore";
import type { Stand, StandStatus } from "@/data/stands";

interface AdminScreenProps {
  onNavigate: (route: string) => void;
}

export const AdminScreen: React.FC<AdminScreenProps> = ({ onNavigate }) => {
  const { user, setUser } = useAuthStore();
  const {
    stands,
    updateStandStatus,
    forceReleaseStand,
    editStand,
    heatmapMode,
    toggleHeatmapMode,
    getOccupancyStats,
  } = useBikesStore();
  const { activeSession, forceReleaseSession } = useSessionStore();
  const { showToast } = useUIStore();
  const { complaints, updateComplaintStatus, getComplaintStats } = useComplaintStore();

  const [activeTab, setActiveTab] = useState<
    "analytics" | "stands" | "bulk-upload" | "complaints"
  >("analytics");

  // Complaint filters & resolution notes state
  const [complaintStatusFilter, setComplaintStatusFilter] = useState<"ALL" | ComplaintStatus>("ALL");
  const [complaintBuildingFilter, setComplaintBuildingFilter] = useState<"ALL" | "AB1" | "AB2" | "AB3">("ALL");
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({});

  // Stand filter states
  const [standSearch, setStandSearch] = useState("");
  const [selectedBuilding, setSelectedBuilding] = useState<"ALL" | "AB1" | "AB2" | "AB3">("ALL");
  const [selectedStatus, setSelectedStatus] = useState<"ALL" | StandStatus>("ALL");

  // Stand Edit Modal
  const [editingStand, setEditingStand] = useState<Stand | null>(null);
  const [editStatus, setEditStatus] = useState<StandStatus>("available");
  const [viewingQrStand, setViewingQrStand] = useState<Stand | null>(null);

  // CSV Bulk Registration State
  const [csvText, setCsvText] = useState("");
  const [parsedResult, setParsedResult] = useState<{
    valid: PreRegisteredStudent[];
    errors: { row: number; reason: string; raw: string }[];
  } | null>(null);
  const [registeredList, setRegisteredList] = useState<PreRegisteredStudent[]>(() =>
    getRegisteredStudents()
  );

  const stats = useMemo(() => getOccupancyStats(), [stands, getOccupancyStats]);

  // If user is not an admin, show Access Denied guard with convenient switch
  if (user?.role !== "admin") {
    return (
      <div className="relative min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-4 pb-24 animate-fade-in text-slate-100">
        <Card className="max-w-md w-full p-8 text-center bg-slate-900 border-rose-500/30 shadow-2xl space-y-4">
          <div className="size-16 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="size-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold font-display text-white">
              Admin Access Restricted
            </h2>
            <p className="text-sm text-slate-400 mt-2">
              This portal is restricted to college security and parking administrators. Current role: <span className="font-semibold uppercase text-sky-400">{user?.role || "guest"}</span>.
            </p>
          </div>
          <div className="pt-2 space-y-2">
            <Button
              fullWidth
              variant="primary"
              onClick={() => {
                if (user) {
                  setUser({ ...user, role: "admin" });
                  showToast("Switched to Campus Administrator role", "success");
                }
              }}
              leftIcon={<ShieldCheck className="size-4" />}
              className="bg-purple-600 hover:bg-purple-500"
            >
              Switch to Admin Role (Demo Mode)
            </Button>
            <Button fullWidth variant="ghost" onClick={() => onNavigate("/dashboard")}>
              Return to Student Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Filtered stands for management
  const filteredStands = stands.filter((s) => {
    const matchBuilding = selectedBuilding === "ALL" || s.building === selectedBuilding;
    const matchStatus = selectedStatus === "ALL" || s.status === selectedStatus;
    const matchSearch =
      !standSearch.trim() ||
      s.id.toLowerCase().includes(standSearch.toLowerCase()) ||
      s.building.toLowerCase().includes(standSearch.toLowerCase());
    return matchBuilding && matchStatus && matchSearch;
  });

  // Occupied stands (active sessions)
  const occupiedStands = stands.filter((s) => s.status === "occupied");

  // Force-release handler
  const handleForceRelease = (standId: string) => {
    forceReleaseStand(standId);
    forceReleaseSession(standId);
    showToast(`Stand ${standId} has been force-released and is now available`, "success");
  };

  // Toggle Maintenance handler
  const handleToggleMaintenance = (stand: Stand) => {
    const nextStatus: StandStatus = stand.status === "maintenance" ? "available" : "maintenance";
    updateStandStatus(stand.id, nextStatus);
    showToast(
      `Stand ${stand.id} status changed to ${nextStatus.toUpperCase()}`,
      nextStatus === "maintenance" ? "warning" : "success"
    );
  };

  // Stand edit save
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStand) return;
    updateStandStatus(editingStand.id, editStatus);
    showToast(`Updated Stand ${editingStand.id} to ${editStatus}`, "success");
    setEditingStand(null);
  };

  // CSV Parsing
  const handleParseCsv = (text: string) => {
    setCsvText(text);
    if (!text.trim()) {
      setParsedResult(null);
      return;
    }
    const res = parseStudentCsv(text);
    setParsedResult(res);
  };

  // File drop/upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      handleParseCsv(content);
    };
    reader.readAsText(file);
  };

  // Bulk register action
  const handleConfirmBulkRegister = () => {
    if (!parsedResult || parsedResult.valid.length === 0) return;
    bulkRegisterStudents(parsedResult.valid);
    showToast(`Successfully registered ${parsedResult.valid.length} students into whitelist`, "success");
    setRegisteredList(getRegisteredStudents());
    setParsedResult(null);
    setCsvText("");
  };

  // Download sample CSV
  const handleDownloadSample = () => {
    const sample = `name,collegeId,phone,role\nRahul Sen,21BCE2001,+919876543220,student\nAnanya Rao,21BCE2002,+919876543221,student\nVikram Singh,21BCE2003,+919876543222,student\nCampus Security Head,ADMIN02,+919876543298,admin`;
    const blob = new Blob([sample], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "parkshark_students_sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 pb-28 animate-fade-in text-slate-100">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate("/campus")}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700"
            title="Return to campus"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black font-display text-white tracking-tight">
                Admin Control Center
              </h1>
              <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-purple-950/70 border border-purple-500/50 text-purple-300">
                Administrator
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Manage 150 campus bicycle stands, active sessions, student whitelists, and usage analytics
            </p>
          </div>
        </div>

        {/* Global Admin Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Phase 7 Requirement 3: 3D Scene Heatmap Toggle */}
          <button
            onClick={() => {
              toggleHeatmapMode();
              showToast(`3D Heatmap mode ${!heatmapMode ? "ACTIVATED" : "DEACTIVATED"}`, "info");
              onNavigate("/campus");
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border shadow transition-all ${
              heatmapMode
                ? "bg-gradient-to-r from-amber-500 to-rose-600 text-white border-rose-400 shadow-rose-900/40"
                : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 hover:text-white"
            }`}
          >
            <Flame className="size-4 text-orange-400" />
            <span>3D Heatmap {heatmapMode ? "ON" : "OFF"}</span>
          </button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => onNavigate("/admin/qrcodes")}
            leftIcon={<QrCode className="size-4" />}
          >
            QR Badges
          </Button>
        </div>
      </div>

      {/* Admin Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("analytics")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "analytics"
              ? "bg-[#1d4ed8] text-white shadow-md"
              : "bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          <BarChart3 className="size-4" />
          <span>Overview & Analytics</span>
        </button>

        <button
          onClick={() => setActiveTab("stands")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "stands"
              ? "bg-[#1d4ed8] text-white shadow-md"
              : "bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          <Bike className="size-4" />
          <span>Manage Stands ({stands.length})</span>
          {occupiedStands.length > 0 && (
            <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
          )}
        </button>

        <button
          onClick={() => setActiveTab("bulk-upload")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "bulk-upload"
              ? "bg-[#1d4ed8] text-white shadow-md"
              : "bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          <Upload className="size-4" />
          <span>Bulk Student Register (CSV)</span>
        </button>

        <button
          onClick={() => setActiveTab("complaints")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "complaints"
              ? "bg-[#1d4ed8] text-white shadow-md"
              : "bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          <AlertTriangle className="size-4 text-rose-400" />
          <span>Complaints & Reports ({complaints.length})</span>
          {complaints.filter((c) => c.status === "pending").length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px]">
              {complaints.filter((c) => c.status === "pending").length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: OVERVIEW & ANALYTICS */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          {/* Phase 7 Requirement 2: Basic Usage Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <Card className="p-4 bg-slate-900/90 border-slate-800">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs uppercase font-semibold">Sessions / Day</span>
                <TrendingUp className="size-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-extrabold text-white font-mono">142</div>
              <p className="text-[11px] text-emerald-400 mt-1">+12% vs last week</p>
            </Card>

            <Card className="p-4 bg-slate-900/90 border-slate-800">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs uppercase font-semibold">Average Duration</span>
                <Clock className="size-4 text-sky-400" />
              </div>
              <div className="text-2xl font-extrabold text-white font-mono">1.75 hrs</div>
              <p className="text-[11px] text-slate-400 mt-1">105 mins average session</p>
            </Card>

            <Card className="p-4 bg-slate-900/90 border-slate-800">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs uppercase font-semibold">Peak Hours</span>
                <Flame className="size-4 text-amber-400" />
              </div>
              <div className="text-lg font-bold text-amber-400 font-mono">08:30 - 10:30</div>
              <p className="text-[11px] text-slate-400 mt-1">Evening peak: 15:00 - 17:00</p>
            </Card>

            <Card className="p-4 bg-slate-900/90 border-slate-800">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs uppercase font-semibold">Total Occupancy</span>
                <Bike className="size-4 text-purple-400" />
              </div>
              <div className="text-2xl font-extrabold text-white font-mono">
                {stats.occupied} / {stats.total}
              </div>
              <p className="text-[11px] text-purple-400 mt-1">
                {Math.round((stats.occupied / stats.total) * 100)}% utilization
              </p>
            </Card>
          </div>

          {/* Phase 7 Requirement 2: Occupancy per building as a table & bar chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Building Occupancy Table */}
            <Card className="p-5 bg-slate-900/90 border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center gap-2">
                <Building2 className="size-5 text-sky-400" />
                <h3 className="text-base font-bold text-white">Occupancy by Building</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-2.5 font-bold uppercase tracking-wider">Building</th>
                      <th className="py-2.5 font-bold uppercase tracking-wider text-center">Total</th>
                      <th className="py-2.5 font-bold uppercase tracking-wider text-center text-red-400">Occupied</th>
                      <th className="py-2.5 font-bold uppercase tracking-wider text-center text-emerald-400">Available</th>
                      <th className="py-2.5 font-bold uppercase tracking-wider text-center text-slate-400">Maintenance</th>
                      <th className="py-2.5 font-bold uppercase tracking-wider text-right">Occupancy %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {(["AB1", "AB2", "AB3"] as const).map((building) => {
                      const b = stats.byBuilding[building];
                      return (
                        <tr key={building} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 font-bold text-white flex items-center gap-2">
                            <span className="size-2 rounded-full bg-sky-400" />
                            <span>{building} Section</span>
                          </td>
                          <td className="py-3 text-center font-mono text-slate-300">{b.total}</td>
                          <td className="py-3 text-center font-mono font-bold text-red-400">{b.occupied}</td>
                          <td className="py-3 text-center font-mono font-bold text-emerald-400">{b.available}</td>
                          <td className="py-3 text-center font-mono text-slate-400">{b.maintenance}</td>
                          <td className="py-3 text-right">
                            <span className="font-mono font-extrabold text-sm px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-sky-300">
                              {b.rate}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="border-t-2 border-slate-700 font-bold bg-slate-950/40">
                      <td className="py-3 text-white">Total Campus</td>
                      <td className="py-3 text-center font-mono">{stats.total}</td>
                      <td className="py-3 text-center font-mono text-red-400">{stats.occupied}</td>
                      <td className="py-3 text-center font-mono text-emerald-400">{stats.available}</td>
                      <td className="py-3 text-center font-mono text-slate-400">{stats.maintenance}</td>
                      <td className="py-3 text-right font-mono text-sky-300">
                        {Math.round((stats.occupied / stats.total) * 100)}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Building Occupancy Bar Chart (SVG) */}
            <Card className="p-5 bg-slate-900/90 border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="size-5 text-purple-400" />
                  <h3 className="text-base font-bold text-white">Occupancy Rate Comparison</h3>
                </div>
                <span className="text-xs text-slate-400">Live Campus Data</span>
              </div>

              {/* Clean Interactive SVG Bar Chart */}
              <div className="relative h-64 w-full pt-4">
                <svg className="size-full overflow-visible" viewBox="0 0 360 200">
                  {/* Grid Lines */}
                  {[0, 25, 50, 75, 100].map((pct) => {
                    const y = 170 - (pct / 100) * 140;
                    return (
                      <g key={pct}>
                        <line x1="40" y1={y} x2="340" y2={y} stroke="#334155" strokeDasharray="3 3" />
                        <text x="32" y={y + 3} fill="#94a3b8" fontSize="9" textAnchor="end" fontFamily="monospace">
                          {pct}%
                        </text>
                      </g>
                    );
                  })}

                  {/* Bars for AB1, AB2, AB3 */}
                  {(["AB1", "AB2", "AB3"] as const).map((building, idx) => {
                    const b = stats.byBuilding[building];
                    const rate = b.rate;
                    const barHeight = Math.max(8, (rate / 100) * 140);
                    const barX = 75 + idx * 95;
                    const barY = 170 - barHeight;

                    // Color based on occupancy level
                    const fill =
                      rate > 70 ? "url(#highGradient)" : rate > 40 ? "url(#medGradient)" : "url(#lowGradient)";

                    return (
                      <g key={building} className="transition-all duration-500">
                        {/* Bar */}
                        <rect
                          x={barX}
                          y={barY}
                          width="46"
                          height={barHeight}
                          rx="6"
                          fill={fill}
                          className="hover:opacity-90 transition-opacity cursor-pointer"
                        />
                        {/* Top Label (Percentage) */}
                        <text
                          x={barX + 23}
                          y={barY - 6}
                          fill="#ffffff"
                          fontSize="11"
                          fontWeight="bold"
                          textAnchor="middle"
                          fontFamily="monospace"
                        >
                          {rate}%
                        </text>
                        {/* Bottom Label (Building) */}
                        <text
                          x={barX + 23}
                          y="186"
                          fill="#cbd5e1"
                          fontSize="11"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          {building}
                        </text>
                        {/* Stand count */}
                        <text
                          x={barX + 23}
                          y="197"
                          fill="#64748b"
                          fontSize="9"
                          textAnchor="middle"
                          fontFamily="monospace"
                        >
                          {b.occupied}/{b.total}
                        </text>
                      </g>
                    );
                  })}

                  <defs>
                    <linearGradient id="highGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" />
                      <stop offset="100%" stopColor="#991b1b" />
                    </linearGradient>
                    <linearGradient id="medGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#b45309" />
                    </linearGradient>
                    <linearGradient id="lowGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" />
                      <stop offset="100%" stopColor="#1d4ed8" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              <div className="flex items-center justify-center gap-6 pt-2 text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-sm bg-sky-500" />
                  <span>Low (&lt;40%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-sm bg-amber-500" />
                  <span>Moderate (40-70%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-sm bg-red-500" />
                  <span>High (&gt;70%)</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: STAND MANAGEMENT & FORCE RELEASE */}
      {activeTab === "stands" && (
        <div className="space-y-6">
          {/* Active Sessions Panel (Phase 7: View all active sessions & Force Release) */}
          <Card className="p-5 bg-slate-900/90 border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="size-2.5 rounded-full bg-emerald-400 animate-ping" />
                <h3 className="text-base font-bold text-white">
                  Active Parking Sessions ({occupiedStands.length})
                </h3>
              </div>
              <span className="text-xs text-slate-400">
                Real-time occupied bicycle stands across campus
              </span>
            </div>

            {occupiedStands.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-sm">
                No active bicycle sessions right now. All stands are currently free.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {occupiedStands.map((stand) => (
                  <div
                    key={stand.id}
                    className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">Stand {stand.id}</span>
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/40">
                          Occupied
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {stand.building} Section &bull; Slot #{stand.slot}
                      </p>
                    </div>

                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleForceRelease(stand.id)}
                      leftIcon={<Unlock className="size-3.5" />}
                      className="shrink-0"
                    >
                      Force Release
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Stand Management Filter & Grid */}
          <Card className="p-5 bg-slate-900/90 border-slate-800 shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Bike className="size-5 text-sky-400" />
                <h3 className="text-base font-bold text-white">
                  Stand Directory ({filteredStands.length} matching)
                </h3>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-48">
                  <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search stand ID..."
                    value={standSearch}
                    onChange={(e) => setStandSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
                  />
                </div>

                <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-xl border border-slate-700 text-xs">
                  {(["ALL", "AB1", "AB2", "AB3"] as const).map((b) => (
                    <button
                      key={b}
                      onClick={() => setSelectedBuilding(b)}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                        selectedBuilding === b
                          ? "bg-[#1d4ed8] text-white"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-xl border border-slate-700 text-xs">
                  {(["ALL", "available", "occupied", "maintenance"] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => setSelectedStatus(st)}
                      className={`px-2.5 py-1 rounded-lg font-semibold capitalize transition-all ${
                        selectedStatus === st
                          ? "bg-[#1d4ed8] text-white"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Stands Table */}
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 text-slate-400 z-10">
                  <tr>
                    <th className="py-2.5 font-bold uppercase">Stand ID</th>
                    <th className="py-2.5 font-bold uppercase">Building</th>
                    <th className="py-2.5 font-bold uppercase">Slot</th>
                    <th className="py-2.5 font-bold uppercase">Status</th>
                    <th className="py-2.5 font-bold uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredStands.slice(0, 50).map((stand) => (
                    <tr key={stand.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 font-mono font-bold text-white">
                        <div className="flex items-center gap-2">
                          <span>{stand.id}</span>
                          <button
                            type="button"
                            onClick={() => setViewingQrStand(stand)}
                            className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-sky-300 border border-slate-700 transition-colors"
                            title={`View QR Code for ${stand.id}`}
                          >
                            <QrCode className="size-3" />
                          </button>
                        </div>
                      </td>
                      <td className="py-2.5 text-slate-300">{stand.building}</td>
                      <td className="py-2.5 font-mono text-slate-400">#{stand.slot}</td>
                      <td className="py-2.5">
                        <StatusPill status={stand.status} size="sm" />
                      </td>
                      <td className="py-2.5 text-right space-x-1.5">
                        {stand.status === "occupied" ? (
                          <button
                            onClick={() => handleForceRelease(stand.id)}
                            className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-semibold text-[11px] border border-rose-500/30 transition-colors"
                          >
                            Release
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleMaintenance(stand)}
                            className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] border transition-colors ${
                              stand.status === "maintenance"
                                ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                : "bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30"
                            }`}
                          >
                            {stand.status === "maintenance" ? "Clear Maint" : "Set Maint"}
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setEditingStand(stand);
                            setEditStatus(stand.status);
                          }}
                          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-[11px] border border-slate-700 transition-colors"
                          title="Edit stand"
                        >
                          <Edit2 className="size-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredStands.length > 50 && (
                <div className="py-2 text-center text-slate-500 text-[11px]">
                  Showing first 50 of {filteredStands.length} stands. Use filters to narrow down.
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: BULK STUDENT REGISTRATION (CSV) */}
      {activeTab === "bulk-upload" && (
        <div className="space-y-6">
          <Card className="p-6 bg-slate-900/90 border-slate-800 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Upload className="size-5 text-sky-400" />
                  <span>Bulk Register Students via CSV</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Import college student records to grant access to the ParkShark bicycle locking system
                </p>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={handleDownloadSample}
                leftIcon={<Download className="size-3.5" />}
              >
                Download CSV Template
              </Button>
            </div>

            {/* Upload Area / Textarea */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* File Drop Area */}
              <div className="border-2 border-dashed border-slate-700 hover:border-sky-400 rounded-2xl p-6 text-center flex flex-col items-center justify-center bg-slate-950/40 transition-colors">
                <FileText className="size-10 text-slate-500 mb-2" />
                <span className="text-xs font-bold text-white block">
                  Select CSV File from Computer
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Supported formats: .csv (columns: name, collegeId, phone, role)
                </span>
                <label className="mt-4">
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <span className="px-4 py-2 rounded-xl bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-semibold cursor-pointer shadow transition-colors inline-block">
                    Choose CSV File
                  </span>
                </label>
              </div>

              {/* Paste CSV Textarea */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Or Paste CSV Data Directly:
                </label>
                <textarea
                  rows={6}
                  value={csvText}
                  onChange={(e) => handleParseCsv(e.target.value)}
                  placeholder="name,collegeId,phone,role&#10;Kavya Nair,21BCE2045,+919876543230,student&#10;Aditya Sen,21BCE2046,+919876543231,student"
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
              </div>
            </div>

            {/* Parse Preview */}
            {parsedResult && (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-white">Parsed Preview:</span>
                    <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="size-3.5" />
                      <span>{parsedResult.valid.length} Valid Records</span>
                    </span>
                    {parsedResult.errors.length > 0 && (
                      <span className="text-xs text-rose-400 font-semibold flex items-center gap-1">
                        <XCircle className="size-3.5" />
                        <span>{parsedResult.errors.length} Formatting Errors</span>
                      </span>
                    )}
                  </div>

                  {parsedResult.valid.length > 0 && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={handleConfirmBulkRegister}
                      leftIcon={<Users className="size-4" />}
                    >
                      Confirm & Register {parsedResult.valid.length} Students
                    </Button>
                  )}
                </div>

                {/* Validation Preview Table */}
                <div className="max-h-48 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-800 text-slate-400 sticky top-0 bg-slate-950">
                      <tr>
                        <th className="py-1.5">Name</th>
                        <th className="py-1.5">College ID</th>
                        <th className="py-1.5">Mobile Number</th>
                        <th className="py-1.5">Role</th>
                        <th className="py-1.5 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900">
                      {parsedResult.valid.map((s, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/40">
                          <td className="py-1.5 text-white">{s.name}</td>
                          <td className="py-1.5 font-mono text-sky-400">{s.collegeId}</td>
                          <td className="py-1.5 font-mono text-slate-300">{s.phone}</td>
                          <td className="py-1.5 capitalize text-slate-400">{s.role}</td>
                          <td className="py-1.5 text-right text-emerald-400 font-semibold">Valid</td>
                        </tr>
                      ))}
                      {parsedResult.errors.map((err, idx) => (
                        <tr key={`err-${idx}`} className="bg-rose-950/20 text-rose-300">
                          <td colSpan={4} className="py-1.5">
                            Row {err.row}: {err.reason} ({err.raw})
                          </td>
                          <td className="py-1.5 text-right text-rose-400 font-bold">Error</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Currently Registered Students Directory */}
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="size-4 text-purple-400" />
                  <span>Whitelisted Students Directory ({registeredList.length})</span>
                </h4>
                <span className="text-xs text-slate-500">Authorized for Stand Locking</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto">
                {registeredList.map((stu) => (
                  <div
                    key={stu.collegeId}
                    className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-white block">{stu.name}</span>
                      <span className="font-mono text-[11px] text-sky-400 block">{stu.collegeId}</span>
                    </div>
                    <div className="text-right text-[11px] text-slate-400 font-mono">
                      <span>{stu.phone}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 4: COMPLAINTS & INCIDENT REPORTS */}
      {activeTab === "complaints" && (
        <div className="space-y-6 animate-fade-in">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <Card className="p-4 bg-slate-900/90 border-slate-800">
              <span className="text-xs uppercase font-semibold text-slate-400">Total Logged</span>
              <div className="text-2xl font-bold font-mono text-white mt-1">
                {complaints.length}
              </div>
              <span className="text-[11px] text-slate-500">All student reports</span>
            </Card>

            <Card className="p-4 bg-slate-900/90 border-amber-500/30">
              <span className="text-xs uppercase font-semibold text-amber-400">Pending Review</span>
              <div className="text-2xl font-bold font-mono text-amber-300 mt-1">
                {complaints.filter((c) => c.status === "pending").length}
              </div>
              <span className="text-[11px] text-amber-500/80">Requires facility action</span>
            </Card>

            <Card className="p-4 bg-slate-900/90 border-sky-500/30">
              <span className="text-xs uppercase font-semibold text-sky-400">Under Investigation</span>
              <div className="text-2xl font-bold font-mono text-sky-300 mt-1">
                {complaints.filter((c) => c.status === "investigating").length}
              </div>
              <span className="text-[11px] text-sky-500/80">Technician assigned</span>
            </Card>

            <Card className="p-4 bg-slate-900/90 border-emerald-500/30">
              <span className="text-xs uppercase font-semibold text-emerald-400">Resolved</span>
              <div className="text-2xl font-bold font-mono text-emerald-300 mt-1">
                {complaints.filter((c) => c.status === "resolved").length}
              </div>
              <span className="text-[11px] text-emerald-500/80">Closed & verified</span>
            </Card>
          </div>

          {/* Filter Bar */}
          <Card className="p-4 bg-slate-900/90 border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-slate-400 uppercase">Building:</span>
              {(["ALL", "AB1", "AB2", "AB3"] as const).map((b) => (
                <button
                  key={b}
                  onClick={() => setComplaintBuildingFilter(b)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    complaintBuildingFilter === b
                      ? "bg-[#1d4ed8] text-white shadow-sm"
                      : "bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-slate-400 uppercase">Status:</span>
              {(["ALL", "pending", "investigating", "resolved"] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setComplaintStatusFilter(st)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                    complaintStatusFilter === st
                      ? "bg-[#1d4ed8] text-white shadow-sm"
                      : "bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </Card>

          {/* Complaint Ticket Cards List */}
          <div className="space-y-4">
            {complaints
              .filter((c) => {
                if (complaintBuildingFilter !== "ALL" && c.building !== complaintBuildingFilter) return false;
                if (complaintStatusFilter !== "ALL" && c.status !== complaintStatusFilter) return false;
                return true;
              })
              .map((comp) => {
                const note = resolutionNotes[comp.id] ?? (comp.adminNotes || "");

                return (
                  <Card
                    key={comp.id}
                    className="p-5 bg-slate-900/95 border-slate-800 shadow-xl space-y-3.5"
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-800">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-xs text-sky-400 bg-sky-950/70 border border-sky-800 px-2 py-0.5 rounded-lg">
                          {comp.id}
                        </span>
                        {comp.standId && (
                          <span className="font-mono font-bold text-xs text-white bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-lg">
                            Stand {comp.standId} ({comp.building})
                          </span>
                        )}
                        <span className="text-xs text-slate-300 font-semibold">
                          {CATEGORY_LABELS[comp.category]?.label || comp.category}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                            comp.priority === "urgent"
                              ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                              : comp.priority === "high"
                              ? "bg-orange-500/20 text-orange-300 border-orange-500/40"
                              : "bg-blue-500/20 text-blue-300 border-blue-500/40"
                          }`}
                        >
                          {comp.priority}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                            comp.status === "pending"
                              ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                              : comp.status === "investigating"
                              ? "bg-sky-500/20 text-sky-300 border-sky-500/40"
                              : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                          }`}
                        >
                          {comp.status}
                        </span>
                        <span className="text-xs text-slate-500">
                          {new Date(comp.createdAt).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div>
                      <h3 className="text-base font-bold text-white">{comp.title}</h3>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        {comp.description}
                      </p>
                    </div>

                    {/* Student Info */}
                    <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">Reporter:</span>
                        <span className="font-semibold text-white">{comp.studentName}</span>
                        <span className="font-mono text-sky-400">({comp.studentId})</span>
                      </div>
                      <span className="font-mono text-slate-400 text-[11px]">
                        Phone: {comp.studentPhone}
                      </span>
                    </div>

                    {/* Admin Resolution Section */}
                    <div className="pt-2 space-y-2 border-t border-slate-800">
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                        Admin / Facilities Resolution Notes:
                      </label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={note}
                          onChange={(e) =>
                            setResolutionNotes({ ...resolutionNotes, [comp.id]: e.target.value })
                          }
                          placeholder="e.g. Technician Ramesh inspected Stand; solenoid lock lubricated and recalibrated."
                          className="flex-1 bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                        />
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <div className="flex items-center gap-2">
                          {/* Quick Stand Maintenance Action */}
                          {comp.standId && (
                            <button
                              type="button"
                              onClick={() => {
                                updateStandStatus(comp.standId!, "maintenance");
                                showToast(`Stand ${comp.standId} set to MAINTENANCE`, "info");
                              }}
                              className="px-2.5 py-1 rounded-lg border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-medium transition-colors flex items-center gap-1.5"
                            >
                              <Wrench className="size-3.5 text-amber-400" />
                              <span>Set Stand to Maintenance</span>
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {comp.status !== "investigating" && comp.status !== "resolved" && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                updateComplaintStatus(
                                  comp.id,
                                  "investigating",
                                  note || "Technician assigned to investigate incident"
                                );
                                showToast(`Ticket ${comp.id} marked as Investigating`, "info");
                              }}
                              className="text-xs bg-slate-800 hover:bg-slate-700 text-sky-300"
                            >
                              Investigate
                            </Button>
                          )}

                          {comp.status !== "resolved" && (
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => {
                                updateComplaintStatus(
                                  comp.id,
                                  "resolved",
                                  note || "Issue verified and resolved by campus facilities team."
                                );
                                showToast(`Ticket ${comp.id} marked as RESOLVED`, "success");
                              }}
                              leftIcon={<CheckCircle2 className="size-3.5" />}
                              className="text-xs bg-emerald-600 hover:bg-emerald-500"
                            >
                              Resolve Ticket
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
          </div>
        </div>
      )}

      {/* Edit Stand Modal */}
      {editingStand && (
        <Modal
          isOpen={!!editingStand}
          onClose={() => setEditingStand(null)}
          title={`Edit Stand ${editingStand.id}`}
          description={`Update operational status and notes for ${editingStand.building} slot #${editingStand.slot}`}
        >
          <form onSubmit={handleSaveEdit} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Stand Status
              </label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as StandStatus)}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-400"
              >
                <option value="available">Available (Operational)</option>
                <option value="occupied">Occupied (In-Use)</option>
                <option value="maintenance">Maintenance (Offline)</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <Button type="button" variant="ghost" onClick={() => setEditingStand(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Save Stand
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Stand QR Code Modal */}
      {viewingQrStand && (
        <Modal
          isOpen={!!viewingQrStand}
          onClose={() => setViewingQrStand(null)}
          title={`Stand QR Code — ${viewingQrStand.id}`}
        >
          <div className="space-y-4 text-center">
            <div className="p-4 rounded-2xl bg-white shadow-xl mx-auto inline-block border-2 border-slate-200">
              <QrCodeSvg
                value={createStandQRPayload(viewingQrStand.id)}
                size={180}
                className="mx-auto"
              />
              <div className="mt-2 text-xs font-mono font-bold text-slate-900 tracking-wider">
                STAND {viewingQrStand.id} &bull; {viewingQrStand.building}
              </div>
            </div>

            <div className="text-xs text-slate-400">
              Payload: <code className="text-sky-300 font-mono text-[11px] bg-slate-800 px-1.5 py-0.5 rounded">{createStandQRPayload(viewingQrStand.id)}</code>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="w-1/2"
                onClick={() => {
                  navigator.clipboard?.writeText(createStandQRPayload(viewingQrStand.id));
                  showToast(`Copied QR payload for Stand ${viewingQrStand.id}`, "success");
                }}
              >
                Copy Payload
              </Button>
              <Button
                variant="primary"
                className="w-1/2"
                onClick={() => {
                  setViewingQrStand(null);
                  onNavigate("/admin/qrcodes");
                }}
                leftIcon={<QrCode className="size-4" />}
              >
                Print Placards
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

