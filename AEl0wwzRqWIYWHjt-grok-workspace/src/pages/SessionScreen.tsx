import React, { useState, useEffect } from "react";
import { Unlock, AlertTriangle, Clock, MapPin, Bike, ArrowRight, Bell, BellRing } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { useSessionStore } from "@/store/useSessionStore";
import { useUIStore } from "@/store/useUIStore";
import {
  requestNotificationPermission,
  hasNotificationPermission,
  sendLocalPushNotification,
} from "@/services/notificationService";

interface SessionScreenProps {
  onNavigate: (route: string) => void;
}

export const SessionScreen: React.FC<SessionScreenProps> = ({ onNavigate }) => {
  const { activeSession, expireSession, reportIssue, markNotified10Min, fcmToken } = useSessionStore();
  const { showToast } = useUIStore();

  const [timeLeftMs, setTimeLeftMs] = useState(0);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportText, setReportText] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(hasNotificationPermission());

  useEffect(() => {
    if (!activeSession) return;

    const tick = () => {
      const remaining = activeSession.endAt - Date.now();
      if (remaining <= 0) {
        setTimeLeftMs(0);
        expireSession();
        showToast("Parking session duration expired! Stand released.", "warning");
      } else {
        setTimeLeftMs(remaining);

        // Check 10-minute threshold (10 minutes = 600,000 ms)
        if (remaining <= 10 * 60 * 1000 && !activeSession.notified10min) {
          markNotified10Min();

          // Push browser notification
          sendLocalPushNotification("ParkShark: 10-Minute Parking Alert", {
            body: `Your parking session on Stand ${activeSession.standId} has less than 10 minutes remaining.`,
          });

          showToast(
            `10-Minute Warning: Session on Stand ${activeSession.standId} is expiring soon!`,
            "warning"
          );
        }
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [activeSession, expireSession, markNotified10Min, showToast]);

  const handleEnableNotifications = async () => {
    const token = await requestNotificationPermission();
    if (token) {
      setNotificationsEnabled(true);
      showToast("Push notifications enabled! You'll receive a 10-minute alert.", "success");
    } else {
      showToast("Notification permission not granted.", "info");
    }
  };

  if (!activeSession) {
    return (
      <div className="relative min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-4 pb-24 animate-fade-in">
        <Card className="w-full max-w-md p-8 text-center shadow-xl">
          <div className="size-16 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-4">
            <Clock className="size-8" />
          </div>
          <h2 className="text-xl font-bold font-display text-slate-900 dark:text-white">
            No Active Session
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 mb-6 max-w-xs mx-auto">
            You do not currently have a bicycle locked. Find a stand in the 3D campus to park.
          </p>
          <Button fullWidth onClick={() => onNavigate("/campus")} rightIcon={<ArrowRight className="size-4" />}>
            Explore Campus Stands
          </Button>
        </Card>
      </div>
    );
  }

  // Format countdown driven strictly by activeSession.endAt
  const totalSeconds = Math.max(0, Math.floor(timeLeftMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const formattedTime = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  // Progress for SVG ring
  const totalDurationMs = activeSession.durationHours * 3600 * 1000;
  const progressRatio = Math.max(0, Math.min(1, timeLeftMs / totalDurationMs));
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - progressRatio * circumference;

  // Turns red under 10 minutes (600 seconds)
  const isLowTime = totalSeconds < 600;

  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportText.trim()) return;
    reportIssue(activeSession.standId, reportText);
    showToast("Issue reported. Maintenance team notified.", "info");
    setIsReportOpen(false);
    setReportText("");
  };

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-4 pb-24 animate-fade-in">
      <Card className="w-full max-w-md p-6 sm:p-8 shadow-2xl border-white/20">
        {/* Header Badge & Report Button */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span
              className={`size-2.5 rounded-full ${
                isLowTime ? "bg-red-500 animate-ping" : "bg-emerald-500 animate-ping"
              }`}
            />
            <span
              className={`text-xs uppercase font-bold tracking-wider ${
                isLowTime
                  ? "text-red-600 dark:text-red-400"
                  : "text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {isLowTime ? "Session Expiring Soon" : "Active Parking Session"}
            </span>
          </div>
          <button
            onClick={() => setIsReportOpen(true)}
            className="text-xs font-semibold text-slate-400 hover:text-amber-500 flex items-center gap-1 transition-colors"
          >
            <AlertTriangle className="size-3.5" />
            <span>Report</span>
          </button>
        </div>

        {/* Phase 6 Requirement 1 & 3: In-App 10-Minute Banner */}
        {isLowTime && (
          <div className="mb-4 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 flex items-start gap-2.5 animate-pulse">
            <AlertTriangle className="size-5 shrink-0 mt-0.5 text-red-500" />
            <div className="text-xs">
              <span className="font-bold block text-sm">10-Minute Expiry Warning</span>
              <p className="mt-0.5 text-slate-600 dark:text-slate-300">
                Your parking session for Stand <span className="font-bold text-red-600 dark:text-red-400">{activeSession.standId}</span> has under 10 minutes remaining. Please unlock your bicycle soon.
              </p>
            </div>
          </div>
        )}

        {/* Circular Countdown Timer */}
        <div className="relative flex flex-col items-center justify-center my-6">
          <svg className="size-56 -rotate-90 transform" viewBox="0 0 210 210">
            {/* Background Ring */}
            <circle
              cx="105"
              cy="105"
              r={radius}
              className="text-slate-200 dark:text-slate-800/80"
              strokeWidth="12"
              stroke="currentColor"
              fill="transparent"
            />
            {/* Active Progress Ring - Turns RED under 10 minutes */}
            <circle
              cx="105"
              cy="105"
              r={radius}
              className={`transition-all duration-1000 ease-linear ${
                isLowTime ? "text-red-500 stroke-red-500" : "text-[#1d4ed8] dark:text-sky-400"
              }`}
              strokeWidth="12"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
            />
          </svg>

          {/* Center Digital Clock */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">
              Time Remaining
            </span>
            <div
              className={`text-4xl font-extrabold tracking-tight font-mono ${
                isLowTime
                  ? "text-red-500 dark:text-red-400 animate-pulse"
                  : "text-slate-900 dark:text-white"
              }`}
            >
              {formattedTime}
            </div>
            {isLowTime ? (
              <span className="text-[11px] font-bold text-red-500 mt-1">
                &bull; Less Than 10 Min
              </span>
            ) : (
              <span className="text-[11px] font-medium text-slate-400 mt-1">
                Duration: {activeSession.durationHours} hr{activeSession.durationHours > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        {/* Stand Details Card */}
        <div className="rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-4 mb-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`size-10 rounded-xl flex items-center justify-center ${
                  isLowTime ? "bg-red-500/10 text-red-500" : "bg-[#1d4ed8]/10 text-[#1d4ed8]"
                }`}
              >
                <Bike className="size-5" />
              </div>
              <div>
                <h4 className="font-bold text-base text-slate-900 dark:text-white">
                  Stand {activeSession.standId}
                </h4>
                <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                  <MapPin className="size-3" />
                  <span>{activeSession.building} Section &bull; Slot #{activeSession.slot}</span>
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400">Total Duration</span>
              <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {activeSession.durationHours} hr{activeSession.durationHours > 1 ? "s" : ""}
              </div>
            </div>
          </div>
        </div>

        {/* Notification Permission Card / Status */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100/70 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 text-xs mb-6">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            {notificationsEnabled ? (
              <BellRing className="size-4 text-emerald-500 shrink-0" />
            ) : (
              <Bell className="size-4 text-amber-500 shrink-0" />
            )}
            <span>
              {notificationsEnabled
                ? "Push notifications enabled (FCM active)"
                : "Receive 10-min expiry alert via push"}
            </span>
          </div>
          {!notificationsEnabled && (
            <button
              onClick={handleEnableNotifications}
              className="text-xs font-semibold text-[#1d4ed8] dark:text-sky-400 hover:underline shrink-0 ml-2"
            >
              Enable
            </button>
          )}
        </div>

        {/* Action Button: Early Unlock */}
        <div className="space-y-3">
          <Button
            fullWidth
            size="lg"
            variant={isLowTime ? "danger" : "primary"}
            onClick={() => onNavigate("/unlock")}
            leftIcon={<Unlock className="size-5" />}
          >
            Unlock Bicycle (Early Unlock)
          </Button>

          <Button
            fullWidth
            size="md"
            variant="ghost"
            onClick={() => onNavigate("/campus")}
          >
            View Campus Map
          </Button>
        </div>
      </Card>

      {/* Report Issue Modal */}
      <Modal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        title="Report Stand Issue"
        description={`Report a lock or bicycle issue for Stand ${activeSession.standId}`}
      >
        <form onSubmit={handleReportSubmit} className="space-y-4">
          <Input
            label="Issue Description"
            placeholder="e.g. Mechanical lock jammed, bicycle flat tire"
            value={reportText}
            onChange={(e) => setReportText(e.target.value)}
            autoFocus
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsReportOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="danger">
              Submit Report
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
