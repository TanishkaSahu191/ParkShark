import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Lock,
  QrCode,
  Radio,
  Bike,
  HelpCircle,
  Upload,
  ArrowLeft,
  Filter,
  Send,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Info,
  Building,
  Image as ImageIcon,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/useAuthStore";
import { useUIStore } from "@/store/useUIStore";
import { useBikesStore } from "@/store/useBikesStore";
import {
  useComplaintStore,
  type ComplaintCategory,
  type ComplaintPriority,
  type ComplaintStatus,
  CATEGORY_LABELS,
  validateComplaintInput,
} from "@/store/useComplaintStore";

interface ComplaintsScreenProps {
  onNavigate: (route: string) => void;
  initialStandId?: string | null;
}

export const ComplaintsScreen: React.FC<ComplaintsScreenProps> = ({
  onNavigate,
  initialStandId,
}) => {
  const { user } = useAuthStore();
  const { showToast } = useUIStore();
  const { stands } = useBikesStore();
  const { complaints, registerComplaint } = useComplaintStore();

  // Navigation tab: 'new' (Register a Complaint) or 'history' (My Complaints)
  const [activeTab, setActiveTab] = useState<"new" | "history">("new");

  // Form State
  const [selectedStandId, setSelectedStandId] = useState<string>(
    initialStandId || ""
  );
  const [category, setCategory] = useState<ComplaintCategory>("lock_jammed");
  const [priority, setPriority] = useState<ComplaintPriority>("medium");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicketId, setSubmittedTicketId] = useState<string | null>(null);

  // Filter for My Complaints history
  const [statusFilter, setStatusFilter] = useState<"ALL" | ComplaintStatus>("ALL");

  // Filter complaints belonging to the current user
  const userComplaints = complaints.filter(
    (c) => c.studentId.toLowerCase() === (user?.collegeId || "21BCE1042").toLowerCase()
  );

  const filteredHistory = userComplaints.filter((c) => {
    if (statusFilter === "ALL") return true;
    return c.status === statusFilter;
  });

  // Handle Photo selection (simulated camera capture or file upload)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast("Photo must be less than 5MB", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Submit Complaint Form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors([]);

    const input = {
      studentId: user?.collegeId || "21BCE1042",
      studentName: user?.name || "Student User",
      studentPhone: user?.phone || "+91 9876543210",
      standId: selectedStandId.trim() || undefined,
      category,
      priority,
      title: title.trim(),
      description: description.trim(),
      photoUrl: photoPreview || undefined,
    };

    const validation = validateComplaintInput(input);
    if (!validation.valid) {
      setFormErrors(validation.errors);
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const created = registerComplaint(input);
      setIsSubmitting(false);
      setSubmittedTicketId(created.id);
      showToast(`Complaint registered successfully: ${created.id}`, "success");
      // Reset form fields
      setTitle("");
      setDescription("");
      setPhotoPreview(null);
    }, 600);
  };

  // Icon mapping for issue categories
  const getCategoryIcon = (cat: ComplaintCategory) => {
    switch (cat) {
      case "lock_jammed":
        return <Lock className="size-4.5 text-rose-400" />;
      case "qr_damaged":
        return <QrCode className="size-4.5 text-sky-400" />;
      case "stand_damaged":
        return <AlertTriangle className="size-4.5 text-amber-400" />;
      case "unauthorized_bike":
        return <Bike className="size-4.5 text-purple-400" />;
      case "sensor_mismatch":
        return <Radio className="size-4.5 text-cyan-400" />;
      case "penalty_dispute":
        return <Clock className="size-4.5 text-orange-400" />;
      case "other":
        return <HelpCircle className="size-4.5 text-emerald-400" />;
    }
  };

  const getStatusBadge = (status: ComplaintStatus) => {
    switch (status) {
      case "pending":
        return {
          label: "Pending Review",
          class: "bg-amber-500/15 text-amber-300 border-amber-500/30",
          icon: Clock,
        };
      case "investigating":
        return {
          label: "Investigating",
          class: "bg-sky-500/15 text-sky-300 border-sky-500/30",
          icon: Radio,
        };
      case "resolved":
        return {
          label: "Resolved",
          class: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
          icon: CheckCircle2,
        };
      case "rejected":
        return {
          label: "Closed / Rejected",
          class: "bg-slate-700/50 text-slate-400 border-slate-600",
          icon: X,
        };
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] p-4 max-w-4xl mx-auto pb-28 space-y-6 animate-fade-in text-slate-100">
      {/* Top Banner / Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => onNavigate("/dashboard")}
            className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 mb-2 transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            <span>Back to Dashboard</span>
          </button>
          <div className="flex items-center gap-2.5">
            <div className="size-10 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center justify-center">
              <AlertTriangle className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-display text-white">
                Register a Complaint
              </h1>
              <p className="text-xs text-slate-400">
                Report damaged bicycle stands, jammed smart locks, unreadable QR codes, or billing disputes
              </p>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800 shrink-0">
          <button
            onClick={() => {
              setActiveTab("new");
              setSubmittedTicketId(null);
            }}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === "new"
                ? "bg-[#1d4ed8] text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <AlertTriangle className="size-3.5" />
            <span>File New Complaint</span>
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === "history"
                ? "bg-[#1d4ed8] text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Clock className="size-3.5" />
            <span>My Complaints ({userComplaints.length})</span>
          </button>
        </div>
      </div>

      {/* SUCCESS CONFIRMATION MODAL / BANNER */}
      {submittedTicketId && (
        <Card className="p-6 bg-gradient-to-r from-emerald-950/70 via-slate-900/90 to-slate-900/90 border-emerald-500/40 shadow-2xl animate-slide-up">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="size-7" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                  Complaint Ticket Logged
                </span>
                <h3 className="text-xl font-bold font-mono text-white">
                  Ticket #{submittedTicketId}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Your issue has been routed to the VIT Campus Bicycle Facilities team. Expected review within 24 hours.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  setActiveTab("history");
                  setSubmittedTicketId(null);
                }}
                className="bg-emerald-600 hover:bg-emerald-500"
              >
                View in My Complaints
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSubmittedTicketId(null)}
              >
                Dismiss
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* VIEW 1: REGISTER A COMPLAINT FORM */}
      {activeTab === "new" && (
        <Card className="p-6 bg-slate-900/90 border-slate-800 shadow-2xl space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Validation Errors Alert */}
            {formErrors.length > 0 && (
              <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-200 text-xs space-y-1">
                <div className="font-semibold flex items-center gap-1.5 text-rose-300">
                  <AlertTriangle className="size-4" />
                  <span>Please resolve the following issues:</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 pl-2 text-rose-200">
                  {formErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* 1. Target Bicycle Stand Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Building className="size-3.5 text-sky-400" />
                <span>Affected Bicycle Stand / Rack (Optional)</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  value={selectedStandId}
                  onChange={(e) => setSelectedStandId(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
                >
                  <option value="">General Issue (Not stand-specific)</option>
                  <optgroup label="AB1 Academic Block (Stands 01 - 50)">
                    {stands
                      .filter((s) => s.id.startsWith("AB1"))
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          Stand {s.id} ({s.status})
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="AB2 Academic Block (Stands 01 - 50)">
                    {stands
                      .filter((s) => s.id.startsWith("AB2"))
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          Stand {s.id} ({s.status})
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="AB3 Academic Block (Stands 01 - 50)">
                    {stands
                      .filter((s) => s.id.startsWith("AB3"))
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          Stand {s.id} ({s.status})
                        </option>
                      ))}
                  </optgroup>
                </select>

                <div className="text-xs text-slate-400 flex items-center gap-2 p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50">
                  <Info className="size-4 text-sky-400 shrink-0" />
                  <span>
                    Select the stand number stamped on the rack placard (e.g. AB1-12) to dispatch maintenance directly to that location.
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Issue Category Picker */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Issue Category
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {(Object.keys(CATEGORY_LABELS) as ComplaintCategory[]).map((cat) => {
                  const meta = CATEGORY_LABELS[cat];
                  const isSelected = category === cat;

                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1.5 ${
                        isSelected
                          ? "bg-sky-950/70 border-sky-400 ring-2 ring-sky-500/40 shadow-lg"
                          : "bg-slate-800/60 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(cat)}
                        <span className="font-semibold text-xs text-white">
                          {meta.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2">
                        {meta.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Urgency / Priority */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Priority / Urgency
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {(["low", "medium", "high", "urgent"] as ComplaintPriority[]).map((p) => {
                  const isSelected = priority === p;
                  let colorClass = "border-slate-700 bg-slate-800 text-slate-400";
                  if (isSelected) {
                    if (p === "urgent") colorClass = "bg-rose-600 text-white border-rose-400 shadow-rose-900/40";
                    else if (p === "high") colorClass = "bg-orange-600 text-white border-orange-400 shadow-orange-900/40";
                    else if (p === "medium") colorClass = "bg-amber-600 text-white border-amber-400 shadow-amber-900/40";
                    else colorClass = "bg-blue-600 text-white border-blue-400 shadow-blue-900/40";
                  }

                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all shadow-sm ${colorClass}`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Title / Summary */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Complaint Title / Brief Summary
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Smart lock solenoid stuck on Stand AB2-14"
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {/* 5. Detailed Description */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Detailed Description of the Problem
                </label>
                <span className="text-[11px] text-slate-500">
                  {description.length} characters
                </span>
              </div>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what occurred, error messages, physical condition of the stand or rack, and time of incident..."
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
              />
            </div>

            {/* 6. Photo Evidence Attachment */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <ImageIcon className="size-3.5 text-sky-400" />
                <span>Attach Photo Evidence (Optional)</span>
              </label>

              {photoPreview ? (
                <div className="relative inline-block rounded-xl overflow-hidden border border-slate-700">
                  <img
                    src={photoPreview}
                    alt="Uploaded Evidence"
                    className="h-36 w-auto object-cover rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setPhotoPreview(null)}
                    className="absolute top-2 right-2 p-1 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-lg transition-transform active:scale-95"
                    title="Remove Photo"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-slate-700 hover:border-sky-500 bg-slate-800/50 hover:bg-slate-800 text-xs text-slate-300 transition-colors">
                    <Upload className="size-4 text-sky-400" />
                    <span>Upload Stand or Lock Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                  <span className="text-[11px] text-slate-500">
                    Max 5MB (PNG, JPG)
                  </span>
                </div>
              )}
            </div>

            {/* 7. Student Verification Info (Pre-filled) */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-emerald-400" />
                <span className="text-slate-400">Filing As Registered Student:</span>
                <span className="font-semibold text-white font-mono">
                  {user?.collegeId || "21BCE1042"}
                </span>
                <span className="text-slate-500">({user?.name || "Arjun Sharma"})</span>
              </div>
              <span className="text-slate-400 font-mono text-[11px]">
                Phone: {user?.phone || "+91 9876543210"}
              </span>
            </div>

            {/* Submit Action Button */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onNavigate("/dashboard")}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting}
                leftIcon={<Send className="size-4" />}
                className="bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-900/40 min-w-40"
              >
                {isSubmitting ? "Submitting Ticket..." : "Submit Complaint"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* VIEW 2: MY COMPLAINTS HISTORY */}
      {activeTab === "history" && (
        <Card className="p-6 bg-slate-900/90 border-slate-800 shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <MessageSquare className="size-4.5 text-sky-400" />
                <span>My Registered Tickets ({userComplaints.length})</span>
              </h2>
              <p className="text-xs text-slate-400">
                Live status tracking for complaints submitted by {user?.name || "you"}
              </p>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {(["ALL", "pending", "investigating", "resolved"] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                    statusFilter === st
                      ? "bg-[#1d4ed8] text-white shadow-sm"
                      : "bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {filteredHistory.length === 0 ? (
            <div className="py-12 text-center space-y-3 text-slate-400">
              <div className="size-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
                <CheckCircle2 className="size-6" />
              </div>
              <p className="text-sm">No complaints found under "{statusFilter}".</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setActiveTab("new")}
                leftIcon={<AlertTriangle className="size-3.5" />}
              >
                Register a Complaint
              </Button>
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredHistory.map((comp) => {
                const statusMeta = getStatusBadge(comp.status);
                const StatusIcon = statusMeta.icon;

                return (
                  <div
                    key={comp.id}
                    className="p-4 rounded-2xl border border-slate-800 bg-slate-950/60 hover:border-slate-700/80 transition-all space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-xs text-sky-400 bg-sky-950/60 border border-sky-800 px-2 py-0.5 rounded-lg">
                          {comp.id}
                        </span>
                        {comp.standId && (
                          <span className="font-mono font-bold text-xs text-slate-200 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-lg">
                            Stand {comp.standId}
                          </span>
                        )}
                        <span className="text-xs text-slate-400">
                          {CATEGORY_LABELS[comp.category]?.label || comp.category}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${statusMeta.class}`}
                        >
                          <StatusIcon className="size-3" />
                          <span>{statusMeta.label}</span>
                        </span>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-bold text-sm text-white">{comp.title}</h3>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        {comp.description}
                      </p>
                    </div>

                    {/* Admin Response Box */}
                    {comp.adminNotes && (
                      <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
                          <ShieldCheck className="size-3.5" />
                          <span>VIT Campus Facilities & Security Update:</span>
                        </div>
                        <p className="text-emerald-200/90 pl-5 leading-relaxed">
                          {comp.adminNotes}
                        </p>
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                      <span>
                        Filed on{" "}
                        {new Date(comp.createdAt).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {comp.resolvedAt && (
                        <span className="text-emerald-400 font-medium">
                          Resolved in{" "}
                          {Math.max(
                            1,
                            Math.round(
                              (comp.resolvedAt - comp.createdAt) / (1000 * 3600)
                            )
                          )}{" "}
                          hr(s)
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

