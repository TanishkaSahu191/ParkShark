import React, { useState, useRef } from "react";
import { ArrowLeft, QrCode, Lock, ShieldCheck, Check, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { useBikesStore } from "@/store/useBikesStore";
import { useSessionStore } from "@/store/useSessionStore";
import { useUIStore } from "@/store/useUIStore";

interface LockScreenProps {
  standId: string;
  onNavigate: (route: string) => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({ standId, onNavigate }) => {
  const { getStandById } = useBikesStore();
  const { startSession } = useSessionStore();
  const { showToast } = useUIStore();

  const stand = getStandById(standId);

  const [scanned, setScanned] = useState(false);
  const [duration, setDuration] = useState<1 | 2 | 3>(2);
  const [pin, setPin] = useState(["", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [isLocking, setIsLocking] = useState(false);

  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);

  if (!stand) {
    return (
      <div className="absolute inset-0 z-20 flex items-center justify-center p-4">
        <Card className="max-w-sm p-6 text-center">
          <h2 className="text-lg font-bold mb-2">Stand Not Found</h2>
          <Button fullWidth onClick={() => onNavigate("/campus")}>Return to Campus</Button>
        </Card>
      </div>
    );
  }

  const handlePinChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    setError(null);

    const nextPin = [...pin];
    nextPin[index] = val.slice(-1);
    setPin(nextPin);

    if (val && index < 3) {
      pinRefs.current[index + 1]?.focus();
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      pinRefs.current[index - 1]?.focus();
    }
  };

  const handleSimulateScan = () => {
    setScanned(true);
    showToast(`QR Code Verified: Stand ${stand.id}`, "success");
    setTimeout(() => pinRefs.current[0]?.focus(), 100);
  };

  const handleLock = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!scanned) {
      setError("Please scan the stand's QR code first");
      return;
    }

    const pinCode = pin.join("");
    if (pinCode.length !== 4) {
      setError("Please set a 4-digit security PIN to lock your bicycle");
      return;
    }

    setIsLocking(true);
    setTimeout(() => {
      setIsLocking(false);
      const res = startSession(stand.id, duration, pinCode);
      if (res.success) {
        showToast(`Bicycle locked successfully at Stand ${stand.id}!`, "success");
        onNavigate("/session");
      } else {
        setError(res.error || "Failed to lock stand");
      }
    }, 600);
  };

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-4 pb-24 animate-fade-in">
      <Card className="w-full max-w-md p-6 sm:p-7 shadow-2xl border-white/20">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => onNavigate("/campus")}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          >
            <ArrowLeft className="size-4" />
            <span>Cancel</span>
          </button>
          <StatusPill status={stand.status} size="sm" />
        </div>

        <div className="mb-5">
          <span className="text-[11px] uppercase tracking-wider font-bold text-sky-600 dark:text-sky-400">
            Locking Slot
          </span>
          <h1 className="text-2xl font-bold font-display text-slate-900 dark:text-white">
            Stand {stand.id}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {stand.building} Section &bull; Slot #{stand.slot}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Simulated QR Code Scanner Viewfinder */}
        <div className="mb-6">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
            1. Stand QR Verification
          </label>
          <div
            onClick={handleSimulateScan}
            className={`relative h-44 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-4 cursor-pointer transition-all ${
              scanned
                ? "border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20"
                : "border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 hover:border-[#1d4ed8]"
            }`}
          >
            {scanned ? (
              <div className="text-center space-y-2 animate-fade-in">
                <div className="size-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-md">
                  <Check className="size-6 stroke-[3]" />
                </div>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  QR Verified: Stand {stand.id}
                </p>
                <p className="text-xs text-slate-400">Click to re-scan if needed</p>
              </div>
            ) : (
              <div className="text-center space-y-2">
                <div className="size-12 rounded-2xl bg-[#1d4ed8]/10 text-[#1d4ed8] flex items-center justify-center mx-auto">
                  <QrCode className="size-6" />
                </div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Tap to Scan Stand QR
                </p>
                <p className="text-xs text-slate-400 max-w-xs">
                  Point camera at the QR code mounted on Stand {stand.id}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Step 2: Duration Selector */}
        <div className="mb-6">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
            2. Choose Duration
          </label>
          <div className="grid grid-cols-3 gap-2.5">
            {([1, 2, 3] as const).map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setDuration(h)}
                className={`py-3 px-2 rounded-xl text-center border transition-all ${
                  duration === h
                    ? "border-[#1d4ed8] bg-[#1d4ed8] text-white shadow-md font-bold"
                    : "border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                }`}
              >
                <div className="text-base font-extrabold">{h} hr{h > 1 ? "s" : ""}</div>
                <div className="text-[11px] opacity-80 mt-0.5">Free Student</div>
              </button>
            ))}
          </div>
        </div>

        {/* Step 3: Self-Chosen 4-digit PIN */}
        <form onSubmit={handleLock} className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                3. Set 4-Digit Unlock PIN
              </label>
              <span className="text-[11px] text-slate-400">Remember this code</span>
            </div>

            <div className="grid grid-cols-4 gap-3 max-w-xs mx-auto">
              {pin.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    pinRefs.current[idx] = el;
                  }}
                  type="password"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handlePinChange(idx, e.target.value)}
                  onKeyDown={(e) => handlePinKeyDown(idx, e)}
                  data-input="true"
                  className="size-14 rounded-2xl text-center font-extrabold text-2xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] focus:border-transparent transition-all shadow-sm"
                  aria-label={`PIN digit ${idx + 1}`}
                />
              ))}
            </div>
          </div>

          <Button type="submit" fullWidth size="lg" isLoading={isLocking} leftIcon={<Lock className="size-5" />}>
            Lock Bicycle & Start Timer
          </Button>

          <p className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1.5">
            <ShieldCheck className="size-3.5 text-emerald-500" />
            <span>PIN is hashed securely. Early unlock is permitted anytime.</span>
          </p>
        </form>
      </Card>
    </div>
  );
};
