import React, { useState, useRef } from "react";
import { ArrowLeft, KeyRound, Unlock, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useSessionStore } from "@/store/useSessionStore";
import { useUIStore } from "@/store/useUIStore";

interface UnlockScreenProps {
  onNavigate: (route: string) => void;
}

export const UnlockScreen: React.FC<UnlockScreenProps> = ({ onNavigate }) => {
  const { activeSession, unlockSession } = useSessionStore();
  const { showToast } = useUIStore();

  const [pin, setPin] = useState(["", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [unlockedSuccess, setUnlockedSuccess] = useState(false);

  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);

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

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    const pinCode = pin.join("");
    if (pinCode.length !== 4) {
      setError("Please enter the complete 4-digit security PIN");
      return;
    }

    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      const res = unlockSession(pinCode);
      if (res.success) {
        setUnlockedSuccess(true);
        showToast("Bicycle unlocked! Stand has been released.", "success");
        setTimeout(() => {
          onNavigate("/dashboard");
        }, 1500);
      } else {
        setError(res.error || "Incorrect PIN. Please try again.");
      }
    }, 600);
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
                Bicycle Unlocked!
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Thank you for using ParkShark. Stand is now available for other students.
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
                Early Unlock
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Enter your 4-digit code to release Stand {activeSession?.standId}
              </p>
            </div>

            {error && (
              <div className="mb-5 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleUnlock} className="space-y-6">
              <div>
                <label className="block text-center text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3">
                  Enter 4-Digit Security Code
                </label>

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
                      autoFocus={idx === 0}
                      className="size-14 rounded-2xl text-center font-extrabold text-2xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] focus:border-transparent transition-all shadow-sm"
                      aria-label={`Code digit ${idx + 1}`}
                    />
                  ))}
                </div>
              </div>

              <Button
                type="submit"
                fullWidth
                size="lg"
                isLoading={isVerifying}
                leftIcon={<Unlock className="size-5" />}
              >
                Verify & Unlock Bicycle
              </Button>
            </form>
          </>
        )}
      </Card>
    </div>
  );
};
