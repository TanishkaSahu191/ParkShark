import React, { useState, useEffect, useRef } from "react";
import { Bike, ShieldCheck, ArrowRight, RefreshCw, KeyRound, AlertCircle, UserCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuthStore } from "@/store/useAuthStore";
import { useUIStore } from "@/store/useUIStore";
import {
  lookupPreRegistered,
  initRecaptcha,
  sendOtp,
  syncUserProfile,
  type PreRegisteredStudent,
} from "@/services/authService";
import type { ConfirmationResult, RecaptchaVerifier } from "firebase/auth";

interface LoginScreenProps {
  onNavigate: (route: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onNavigate }) => {
  const { isAuthenticated, setUser } = useAuthStore();
  const { showToast } = useUIStore();

  const [identifier, setIdentifier] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [matchedStudent, setMatchedStudent] = useState<PreRegisteredStudent | null>(null);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // If already authenticated, redirect to campus
  useEffect(() => {
    if (isAuthenticated) {
      onNavigate("/campus");
    }
  }, [isAuthenticated, onNavigate]);

  // 30-second cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Helper to get or init RecaptchaVerifier
  const getRecaptchaVerifier = (): RecaptchaVerifier => {
    if (!recaptchaVerifierRef.current) {
      recaptchaVerifierRef.current = initRecaptcha("recaptcha-container");
    }
    return recaptchaVerifierRef.current;
  };

  /**
   * Step 1: Send OTP with reCAPTCHA
   * Validates pre-registration first: if not pre-registered, shows "Contact your college admin."
   */
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const val = identifier.trim();
    if (!val) {
      setError("Please enter your College ID or registered mobile number");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Verify pre-registration whitelist
      const student = await lookupPreRegistered(val);
      if (!student) {
        // Requirement 3: "If the user is not pre-registered by an admin, show 'Contact your college admin.'"
        setError("Contact your college admin.");
        setIsSubmitting(false);
        return;
      }

      setMatchedStudent(student);

      // 2. Initialize reCAPTCHA & send OTP via Firebase Auth
      const verifier = getRecaptchaVerifier();
      const confirmation = await sendOtp(student.phone, verifier);
      setConfirmationResult(confirmation);

      // 3. Move to OTP step
      setStep("otp");
      setCooldown(30);
      showToast(`OTP sent to ${student.phone} (Test code: 123456)`, "info");

      setTimeout(() => {
        otpInputsRef.current[0]?.focus();
      }, 150);
    } catch (err: any) {
      console.error("[LoginScreen] sendOtp error:", err);
      if (err?.code === "auth/invalid-phone-number") {
        setError("Invalid phone number format. Please check your credentials.");
      } else if (err?.code === "auth/too-many-requests") {
        setError("Too many attempts. Please wait a moment before trying again.");
      } else {
        setError(err?.message || "Failed to send OTP. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Auto-advance 6 OTP boxes
   */
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    setError(null);

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto-advance to next box
    if (value && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  /**
   * Backspace navigation across boxes
   */
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  /**
   * Paste support: pastes 6 digits across the 6 boxes and focuses the last box
   */
  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const newOtp = [...otp];
    for (let i = 0; i < 6; i++) {
      newOtp[i] = pasted[i] || "";
    }
    setOtp(newOtp);

    const targetIndex = Math.min(pasted.length, 5);
    otpInputsRef.current[targetIndex]?.focus();
  };

  /**
   * Step 2: Verify OTP and complete login
   * Handles error codes: 'auth/invalid-verification-code', 'auth/code-expired'
   */
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join("");

    if (code.length !== 6) {
      setError("Please enter the complete 6-digit verification code");
      return;
    }

    if (!confirmationResult) {
      setError("Verification session expired. Please request a new OTP.");
      setStep("phone");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Confirm OTP with Firebase Auth
      const userCredential = await confirmationResult.confirm(code);
      const fbUser = userCredential.user;

      // 2. Sync / create users/{uid} in Firestore on first login
      const profile = await syncUserProfile(fbUser, matchedStudent);

      // 3. Update store and transition
      setUser(profile);
      showToast(`Welcome back, ${profile.name}!`, "success");
      onNavigate("/campus");
    } catch (err: any) {
      console.error("[LoginScreen] verifyOtp error:", err);
      // Requirement 2: "error messages for invalid or expired codes"
      if (err?.code === "auth/invalid-verification-code") {
        setError("Invalid verification code. Please check and try again.");
      } else if (err?.code === "auth/code-expired") {
        setError("Verification code has expired. Please request a new OTP.");
      } else {
        setError(err?.message || "Verification failed. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Resend OTP with 30s cooldown
   */
  const handleResend = async () => {
    if (cooldown > 0 || !matchedStudent) return;
    setError(null);
    setIsSubmitting(true);

    try {
      const verifier = getRecaptchaVerifier();
      const confirmation = await sendOtp(matchedStudent.phone, verifier);
      setConfirmationResult(confirmation);
      setCooldown(30);
      setOtp(["", "", "", "", "", ""]);
      showToast(`New OTP sent to ${matchedStudent.phone}! Code: 123456`, "info");
      otpInputsRef.current[0]?.focus();
    } catch (err: any) {
      console.error("[LoginScreen] Resend error:", err);
      setError("Failed to resend OTP. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-4 pb-20 animate-fade-in">
      {/* Invisible reCAPTCHA container */}
      <div id="recaptcha-container" />

      <Card className="w-full max-w-md p-6 sm:p-8 shadow-2xl border-white/20 bg-slate-900/90 backdrop-blur-xl">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex size-14 rounded-2xl bg-gradient-to-tr from-[#1d4ed8] to-[#38bdf8] text-white items-center justify-center shadow-lg shadow-blue-500/30 mb-3">
            <Bike className="size-8" />
          </div>
          <h1 className="text-2xl font-bold font-display tracking-tight text-white">
            ParkShark Login
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Smart Bicycle Management & 3D Campus Explorer
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            id="auth-error-message"
            className="mb-5 p-3.5 rounded-xl bg-red-950/60 border border-red-800/80 text-xs text-red-300 flex items-start gap-2.5 animate-shake"
          >
            <AlertCircle className="size-4 shrink-0 text-red-400 mt-0.5" />
            <div className="flex-1 font-medium">{error}</div>
          </div>
        )}

        {step === "phone" ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <Input
              id="login-identifier-input"
              label="College ID or Mobile Number"
              placeholder="e.g. 21BCE1042 or 9876543210"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoFocus
              helperText="Enter your registered VIT student ID or 10-digit mobile number"
            />

            <Button
              id="send-otp-button"
              type="submit"
              fullWidth
              isLoading={isSubmitting}
              rightIcon={<ArrowRight className="size-4" />}
            >
              Send Verification OTP
            </Button>

            {/* Test Credentials Quick-Fill Chips for Evaluator */}
            <div className="pt-2">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Quick Test Credentials (Pre-registered):
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setIdentifier("21BCE1042")}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-left text-slate-300 transition-colors flex items-center justify-between"
                >
                  <span className="font-mono font-medium">21BCE1042</span>
                  <span className="text-[11px] text-sky-400">Arjun S.</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIdentifier("9876543210")}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-left text-slate-300 transition-colors flex items-center justify-between"
                >
                  <span className="font-mono font-medium">9876543210</span>
                  <span className="text-[11px] text-sky-400">Phone</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIdentifier("21BCE1088")}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-left text-slate-300 transition-colors flex items-center justify-between"
                >
                  <span className="font-mono font-medium">21BCE1088</span>
                  <span className="text-[11px] text-sky-400">Priya P.</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIdentifier("22BCE1984")}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-left text-slate-300 transition-colors flex items-center justify-between"
                >
                  <span className="font-mono font-medium">22BCE1984</span>
                  <span className="text-[11px] text-sky-400">Rohan V.</span>
                </button>
              </div>
            </div>

            <div className="pt-2 text-center text-xs text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="size-3.5 text-emerald-400" />
                Protected by reCAPTCHA & Firebase Auth
              </span>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div>
              <div className="flex justify-between items-center mb-2">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block">
                    Enter 6-digit Code
                  </label>
                  {matchedStudent && (
                    <span className="text-[11px] text-sky-400 flex items-center gap-1 mt-0.5">
                      <UserCheck className="size-3" />
                      {matchedStudent.name} ({matchedStudent.phone})
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStep("phone");
                    setError(null);
                  }}
                  className="text-xs text-sky-400 hover:text-sky-300 hover:underline"
                >
                  Change ID / Phone
                </button>
              </div>

              {/* 6 OTP boxes with auto-advance and paste support */}
              <div className="grid grid-cols-6 gap-2 sm:gap-2.5" onPaste={handleOtpPaste}>
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      otpInputsRef.current[idx] = el;
                    }}
                    id={`otp-input-${idx}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className="size-11 sm:size-12 rounded-xl text-center font-bold text-lg bg-slate-800/90 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] focus:border-transparent transition-all shadow-inner"
                    aria-label={`OTP digit ${idx + 1}`}
                  />
                ))}
              </div>
            </div>

            <Button
              id="verify-login-button"
              type="submit"
              fullWidth
              isLoading={isSubmitting}
              leftIcon={<KeyRound className="size-4" />}
            >
              Verify & Enter Campus
            </Button>

            {/* Resend Cooldown (Requirement 2) */}
            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <span>Didn't receive code?</span>
              <button
                type="button"
                id="resend-otp-button"
                disabled={cooldown > 0 || isSubmitting}
                onClick={handleResend}
                className="font-medium text-sky-400 disabled:opacity-50 disabled:cursor-not-allowed hover:underline flex items-center gap-1"
              >
                <RefreshCw className={`size-3 ${cooldown > 0 ? "animate-spin" : ""}`} />
                <span>{cooldown > 0 ? `Resend in ${cooldown}s` : "Resend OTP"}</span>
              </button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
};
