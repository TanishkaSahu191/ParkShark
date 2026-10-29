import React, { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  QrCode,
  Lock,
  ShieldCheck,
  Check,
  AlertCircle,
  Camera,
  Keyboard,
  RefreshCw,
  Clock,
  Sparkles,
} from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { useBikesStore } from "@/store/useBikesStore";
import { useUIStore } from "@/store/useUIStore";
import { callLockBicycle } from "@/services/lockService";
import { parseAndVerifyQRPayload, generateStandToken } from "@/utils/qr";

interface LockScreenProps {
  standId: string;
  onNavigate: (route: string) => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({ standId, onNavigate }) => {
  const { getStandById } = useBikesStore();
  const { showToast } = useUIStore();

  const stand = getStandById(standId);

  // Scan state
  const [scanned, setScanned] = useState(false);
  const [scannedToken, setScannedToken] = useState<string>("");
  const [scanMode, setScanMode] = useState<"camera" | "manual" | "verified">("camera");

  // Camera & permission states
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerId = "parkshark-qr-reader";

  // Manual fallback input
  const [manualCodeInput, setManualCodeInput] = useState(standId || "");

  // Duration & PIN
  const [duration, setDuration] = useState<1 | 2 | 3>(2);
  const [pin, setPin] = useState(["", "", "", ""]);
  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Lock status
  const [error, setError] = useState<string | null>(null);
  const [isLocking, setIsLocking] = useState(false);
  const [lockSuccess, setLockSuccess] = useState(false);

  // Initialize camera scanner
  useEffect(() => {
    let isMounted = true;

    if (scanMode === "camera" && !scanned) {
      const startScanner = async () => {
        try {
          // If scanner instance already exists, stop it first
          if (scannerRef.current) {
            try {
              await scannerRef.current.stop();
            } catch {
              // ignore
            }
          }

          const html5QrCode = new Html5Qrcode(scannerId);
          scannerRef.current = html5QrCode;

          await html5QrCode.start(
            { facingMode: "environment" },
            {
              fps: 10,
              qrbox: { width: 220, height: 220 },
            },
            (decodedText) => {
              if (isMounted) {
                handleScanSuccess(decodedText);
              }
            },
            () => {
              // frame parse errors are normal and ignored
            }
          );

          if (isMounted) {
            setIsCameraActive(true);
            setCameraError(null);
          }
        } catch (err: any) {
          if (isMounted) {
            setIsCameraActive(false);
            console.warn("[QR Scanner] Camera start issue:", err);
            setCameraError(
              err?.name === "NotAllowedError" || err?.message?.includes("Permission")
                ? "Camera permission denied. You can switch to manual code entry below."
                : "Unable to start camera scanner on this device. Please use manual entry."
            );
          }
        }
      };

      // Slight delay to ensure DOM container is mounted
      const timer = setTimeout(startScanner, 200);
      return () => {
        clearTimeout(timer);
        isMounted = false;
        if (scannerRef.current) {
          scannerRef.current.stop().catch(() => {});
        }
      };
    }
  }, [scanMode, scanned]);

  // Clean up scanner on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {
        // ignore
      }
      setIsCameraActive(false);
    }
  };

  // Handle scanned QR payload
  const handleScanSuccess = async (rawText: string) => {
    const verified = parseAndVerifyQRPayload(rawText);
    if (verified.valid && verified.standId) {
      await stopCamera();
      setScanned(true);
      setScannedToken(verified.token || generateStandToken(verified.standId));
      setScanMode("verified");
      setError(null);
      showToast(`QR Code Scanned! Stand ${verified.standId} is available.`, "success");
      setTimeout(() => pinRefs.current[0]?.focus(), 150);
    } else {
      setError(verified.error || "Unrecognized stand QR code. Please scan a valid ParkShark placard.");
    }
  };

  // Manual fallback submission
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCodeInput.trim()) {
      setError("Please enter a valid stand ID (e.g. AB1-12)");
      return;
    }

    const verified = parseAndVerifyQRPayload(manualCodeInput);
    if (verified.valid && verified.standId) {
      stopCamera();
      setScanned(true);
      setScannedToken(verified.token || generateStandToken(verified.standId));
      setScanMode("verified");
      setError(null);
      showToast(`QR Code Verified! Stand ${verified.standId} is available.`, "success");
      setTimeout(() => pinRefs.current[0]?.focus(), 150);
    } else {
      setError("Invalid stand ID. Format should be like AB1-01 to AB3-50.");
    }
  };

  // 3D world simulated scan
  const handleSimulateScan = async () => {
    await stopCamera();
    setScanned(true);
    setScannedToken(generateStandToken(stand?.id || standId));
    setScanMode("verified");
    setError(null);
    showToast(`QR Code Scanned! Stand ${stand?.id || standId} is available.`, "success");
    setTimeout(() => pinRefs.current[0]?.focus(), 150);
  };

  // PIN inputs
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

  // Requirement 6: Submit lock via callable Cloud Function
  const handleLock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!scanned) {
      setError("Please scan the stand's QR code before locking");
      return;
    }

    const pinCode = pin.join("");
    // Requirement 5: Exactly 4 digits validation
    if (!/^\d{4}$/.test(pinCode)) {
      setError("Please enter exactly 4 digits for your security PIN");
      return;
    }

    setIsLocking(true);

    try {
      const activeToken = scannedToken || generateStandToken(stand?.id || standId);
      const res = await callLockBicycle(stand?.id || standId, activeToken, duration, pinCode);

      if (res.success) {
        setLockSuccess(true);
        showToast(`Bicycle successfully locked at Stand ${stand?.id || standId}!`, "success");

        // Requirement 7: Show success state, then navigate to the timer screen
        setTimeout(() => {
          onNavigate("/session");
        }, 1200);
      } else {
        setIsLocking(false);
        setError(res.error || "Failed to lock stand. Please try again.");
      }
    } catch (err: any) {
      setIsLocking(false);
      setError(err?.message || "An error occurred while communicating with lock server.");
    }
  };

  if (!stand) {
    return (
      <div className="absolute inset-0 z-20 flex items-center justify-center p-4">
        <Card className="max-w-sm p-6 text-center bg-slate-900 border-slate-700">
          <h2 className="text-lg font-bold mb-2 text-white">Stand Not Found</h2>
          <p className="text-sm text-slate-400 mb-4">No stand matching ID "{standId}" exists.</p>
          <Button fullWidth onClick={() => onNavigate("/campus")}>
            Return to Campus
          </Button>
        </Card>
      </div>
    );
  }

  // Requirement 7: Success state
  if (lockSuccess) {
    return (
      <div className="relative min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-4 pb-24 animate-fade-in">
        <Card className="w-full max-w-md p-8 text-center bg-slate-900 border-emerald-500/50 shadow-2xl space-y-4">
          <div className="size-20 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border-2 border-emerald-400 animate-bounce-short">
            <Check className="size-10 stroke-[3]" />
          </div>
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-emerald-400 font-bold">
              Lock Secured
            </span>
            <h2 className="text-2xl font-black font-display text-white mt-1">
              Stand {stand.id} Locked!
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              Your {duration}-hour parking session is active. Opening timer...
            </p>
          </div>
          <div className="pt-2 flex items-center justify-center gap-2 text-xs text-slate-400 font-mono">
            <Clock className="size-4 text-sky-400 animate-spin" />
            <span>Redirecting to Session Screen...</span>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-4 pb-24 animate-fade-in text-slate-100">
      <Card className="w-full max-w-md p-6 sm:p-7 shadow-2xl border-white/20 bg-slate-900/95 backdrop-blur-xl">
        {/* Top Header */}
        <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
          <button
            type="button"
            onClick={() => onNavigate("/campus")}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="size-4" />
            <span>Cancel</span>
          </button>
          <StatusPill status={stand.status} size="sm" />
        </div>

        {/* Stand Title */}
        <div className="mb-5">
          <span className="text-[11px] uppercase tracking-wider font-bold text-sky-400 font-mono">
            Smart Bicycle Locking
          </span>
          <h1 className="text-2xl font-black font-display text-white tracking-tight">
            Stand {stand.id}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {stand.building} Section &bull; Slot #{stand.slot}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-600/70 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Requirement 4: Verification Banner when scanned */}
        {scanned ? (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-950/70 border border-emerald-500/60 text-emerald-300 flex items-center justify-between gap-3 animate-slide-down">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold shadow-md">
                <Check className="size-6 stroke-[3]" />
              </div>
              <div>
                <div className="font-extrabold text-sm text-white">
                  QR Code Scanned! Stand {stand.id} is available.
                </div>
                <div className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono">
                  <ShieldCheck className="size-3.5" />
                  <span>Token Verified &bull; Ready to Lock</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setScanned(false);
                setScanMode("camera");
              }}
              className="text-[11px] text-slate-400 hover:text-white underline"
            >
              Re-scan
            </button>
          </div>
        ) : (
          /* Step 1: QR Scanner (html5-qrcode camera with permission handling + manual fallback) */
          <div className="mb-6 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                1. Stand QR Verification
              </label>
              {/* Scan Mode Toggle */}
              <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-lg border border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setScanMode("camera");
                    setError(null);
                  }}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-all ${
                    scanMode === "camera" ? "bg-[#1d4ed8] text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Camera className="size-3" />
                  <span>Camera</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    setScanMode("manual");
                    setError(null);
                  }}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-all ${
                    scanMode === "manual" ? "bg-[#1d4ed8] text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Keyboard className="size-3" />
                  <span>Manual</span>
                </button>
              </div>
            </div>

            {/* Mode A: Real Camera Scanner (html5-qrcode) */}
            {scanMode === "camera" && (
              <div className="relative rounded-2xl overflow-hidden border border-slate-700 bg-black min-h-[220px] flex flex-col items-center justify-center">
                {/* HTML5 QR Code Container */}
                <div id={scannerId} className="w-full max-w-[280px] overflow-hidden" />

                {/* Camera Error or Permission Banner */}
                {cameraError && (
                  <div className="p-4 text-center space-y-2 bg-slate-900/90 w-full h-full absolute inset-0 flex flex-col items-center justify-center">
                    <AlertCircle className="size-7 text-amber-400 mx-auto" />
                    <p className="text-xs text-amber-200 font-semibold px-4">{cameraError}</p>
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setScanMode("manual")}
                        leftIcon={<Keyboard className="size-3.5" />}
                        className="text-xs"
                      >
                        Enter Code Manually
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleSimulateScan}
                        className="text-xs text-sky-400"
                      >
                        Simulate Scan
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Mode B: Manual Entry Fallback (Requirement 2) */}
            {scanMode === "manual" && (
              <form
                onSubmit={handleManualSubmit}
                className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-3"
              >
                <div>
                  <label className="block text-xs text-slate-300 font-medium mb-1">
                    Stand Code or QR String
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="e.g. AB1-12 or scan payload"
                      value={manualCodeInput}
                      onChange={(e) => setManualCodeInput(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Located on the metal plaque affixed to this rack.
                  </span>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" size="sm" variant="primary" fullWidth leftIcon={<Check className="size-4" />}>
                    Verify Stand Code
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleSimulateScan}
                    className="text-xs text-sky-400 whitespace-nowrap"
                  >
                    Auto-fill
                  </Button>
                </div>
              </form>
            )}

            {/* Quick action: Simulated 3D scan shortcut */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
              <span>Standing at the physical rack?</span>
              <button
                type="button"
                onClick={handleSimulateScan}
                className="text-sky-400 hover:text-sky-300 font-semibold underline"
              >
                Instant 3D Scan
              </button>
            </div>
          </div>
        )}

        {/* Requirement 5: Step 2 - Choose Duration (1, 2, or 3 hours) */}
        <div className="mb-6">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
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
                    ? "border-sky-400 bg-[#1d4ed8] text-white shadow-lg font-bold scale-[1.02]"
                    : "border-slate-700 bg-slate-800/80 text-slate-300 hover:border-slate-600"
                }`}
              >
                <div className="text-base font-extrabold font-mono">
                  {h} hr{h > 1 ? "s" : ""}
                </div>
                <div className="text-[11px] opacity-80 mt-0.5">Free Student</div>
              </button>
            ))}
          </div>
        </div>

        {/* Requirement 5: Step 3 - Exactly 4-digit code */}
        <form onSubmit={handleLock} className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                3. Set 4-Digit Unlock PIN
              </label>
              <span className="text-[11px] text-slate-400 font-mono">Exactly 4 digits</span>
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
                  className="size-14 rounded-2xl text-center font-extrabold text-2xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all shadow-inner font-mono"
                  aria-label={`PIN digit ${idx + 1}`}
                />
              ))}
            </div>
          </div>

          <Button
            type="submit"
            fullWidth
            size="lg"
            isLoading={isLocking}
            disabled={!scanned}
            leftIcon={<Lock className="size-5" />}
            className="shadow-lg shadow-blue-900/50"
          >
            Lock Bicycle & Start Timer
          </Button>

          <p className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1.5">
            <ShieldCheck className="size-3.5 text-emerald-400" />
            <span>PIN is hashed with a cryptographic salt in Firestore.</span>
          </p>
        </form>
      </Card>
    </div>
  );
};
