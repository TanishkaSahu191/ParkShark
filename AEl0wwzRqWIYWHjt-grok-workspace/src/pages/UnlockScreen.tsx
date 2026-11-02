import React, { useState, useRef, useEffect } from "react";
import { ArrowLeft, KeyRound, Unlock, AlertCircle, CheckCircle2, ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useSessionStore } from "@/store/useSessionStore";
import { useUIStore } from "@/store/useUIStore";
import { callUnlockBicycle } from "@/services/lockService";

interface UnlockScreenProps {
  onNavigate: (route: string) => void;
}

export const UnlockScreen: React.FC<UnlockScreenProps> = ({ onNavigate }) => {
  const { activeSession, failedAttempts, lockoutUntil, resetLockout } = useSessionStore();
  const { showToast } = useUIStore();

  const [pin, setPin] = useState(["", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [unlockedSuccess, setUnlockedSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [lockoutRemainingSecs, setLockoutRemainingSecs] = useState<number>(0);

  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Ticking countdown for lockout timer
  useEffect(() => {
    const updateLockout = () => {
      if (lockoutUntil && Date.now() < lockoutUntil) {
        setLockoutRemainingSecs(Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000)));
      } else {
        if (lockoutRemainingSecs > 0) {
          resetLockout();
        }
        setLockoutRemainingSecs(0);
      }
    };

    updateLockout();
    const interval = setInterval(updateLockout, 1000);
    return () => clearInterval(interval);
  }, [lockoutUntil, lockoutRemainingSecs, resetLockout]);

  if (!activeSession && !unlockedSuccess) {
    return (
      <div className="relative min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-4 pb-24">
        <Card className="max-w-sm p-6 text-center">
          <h2 className="text-lg font-bold mb-2">No Active Session</h2>
          <p className="text-sm text-slate-400 mb-4">You do not have an active bicycle session to unlock.</p>
          <Button fullWidth onClick={() => onNavigate("/campus")}>Return to Campus</Button>
        </Card>
      </div>
    );
  }

  const isLockedOut = lockoutRemainingSecs > 0;
  const lockoutMinutes = Math.floor(lockoutRemainingSecs / 60);
  const lockoutSeconds = lockoutRemainingSecs % 60;

  const handlePinChange = (index: number, val: string) => {
    if (isLockedOut) return;
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
    if (isLockedOut) return;
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      pinRefs.current[index - 1]?.focus();
    }
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLockedOut) return;

    const pinCode = pin.join("");
    if (pinCode.length !== 4) {
      setError("Please enter the complete 4-digit security PIN");
      return;
    }

    if (!activeSession) return;

    setIsVerifying(true);
    setError(null);

    try {
      const res = await callUnlockBicycle(activeSession.id, pinCode);

      if (res.success) {
        const msg = res.message || `Bicycle unlocked successfully! Stand ${activeSession.standId} is now available.`;
        setSuccessMessage(msg);
        setUnlockedSuccess(true);
        showToast(msg, "success");

        setTimeout(() => {
          onNavigate("/dashboard");
        }, 2000);
      } else {
        if (res.lockedOut) {
          setError(res.error || "Too many wrong attempts. Locked out for 5 minutes.");
        } else {
          setError(res.error || "Incorrect 4-digit security code. Please check your PIN.");
        }
      }
    } catch (err: any) {
      setError(err?.message || "Failed to process unlock request.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-4 pb-24 animate-fade-in">
      <Card className="w-full max-w-md p-6 sm:p-8 shadow-2xl border-white/20">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => onNavigate("/session")}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          >
            <ArrowLeft className="size-4" />
            <span>Back to Timer</span>
          </button>
        </div>

        {unlockedSuccess ? (
          <div className="text-center py-6 space-y-4 animate-fade-in">
            <div className="size-16 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
              <CheckCircle2 className="size-9 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-2xl font-bold font-display text-slate-900 dark:text-white">
                Unlock Complete!
              </h2>
              {/* Exact Phase 6 Requirement 6 Success Message */}
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-2 bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800">
                {successMessage}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                Thank you for parking responsibly with ParkShark.
              </p>
            </div>
            <div className="text-xs text-sky-500 font-semibold pt-2">
              Redirecting to Dashboard…
            </div>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <div className="size-14 rounded-2xl bg-[#1d4ed8]/10 text-[#1d4ed8] flex items-center justify-center mx-auto mb-3">
                <KeyRound className="size-7" />
              </div>
              <h1 className="text-2xl font-bold font-display text-slate-900 dark:text-white">
                Unlock Stand {activeSession?.standId}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Enter your 4-digit code to release your locked bicycle
              </p>
            </div>

            {/* Lockout Warning Banner */}
            {isLockedOut ? (
              <div className="mb-5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-300 dark:border-red-800 text-xs text-red-600 dark:text-red-400 flex items-start gap-2.5">
                <ShieldAlert className="size-5 shrink-0 text-red-500 mt-0.5" />
                <div>
                  <span className="font-bold block text-sm">Account Locked Out</span>
                  <p className="mt-0.5">
                    Limit of 5 wrong attempts reached. Security lockout active for:
                  </p>
                  <div className="text-base font-extrabold font-mono text-red-600 dark:text-red-400 mt-1">
                    {String(lockoutMinutes).padStart(2, "0")}:{String(lockoutSeconds).padStart(2, "0")}
                  </div>
                </div>
              </div>
            ) : error ? (
              <div className="mb-5 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : failedAttempts > 0 ? (
              <div className="mb-4 text-center text-xs text-amber-500 font-medium">
                Failed attempts: {failedAttempts} of 5. After 5 attempts, a 5-minute lockout will apply.
              </div>
            ) : null}

            <form onSubmit={handleUnlock} className="space-y-6">
              <div>
                <label className="block text-center text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3">
                  Enter 4-Digit Security Code
                </label>

                {/* 4 Digit Boxes */}
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
                      disabled={isLockedOut}
                      value={digit}
                      onChange={(e) => handlePinChange(idx, e.target.value)}
                      onKeyDown={(e) => handlePinKeyDown(idx, e)}
                      data-input="true"
                      autoFocus={idx === 0 && !isLockedOut}
                      className={`size-14 rounded-2xl text-center font-extrabold text-2xl border text-slate-900 dark:text-white focus:outline-none transition-all shadow-sm ${
                        isLockedOut
                          ? "bg-slate-200 dark:bg-slate-800/50 border-slate-300 dark:border-slate-700 cursor-not-allowed opacity-60"
                          : "bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-[#1d4ed8] focus:border-transparent"
                      }`}
                      aria-label={`Code digit ${idx + 1}`}
                    />
                  ))}
                </div>
              </div>

              <Button
                type="submit"
                fullWidth
                size="lg"
                disabled={isLockedOut}
                isLoading={isVerifying}
                leftIcon={<Unlock className="size-5" />}
              >
                {isLockedOut ? "Locked Out (Wait 5 min)" : "Verify & Unlock Bicycle"}
              </Button>
            </form>
          </>
        )}
      </Card>
    </div>
  );
};
