"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Compass, Eye, EyeOff, UserPlus, X } from "lucide-react";
import { apiPost } from "../../lib/apiClient";
import { useAuthStore } from "../../store/useAuthStore";
import { getCookie, setCookie } from "../../lib/cookies";
import { useRegionStore } from "../../store/useRegionStore";
import { isGoogleAuthEnabled } from "../../lib/socialAuthConfig";
import SocialAuthButton from "../auth/SocialAuthButton";

export default function LoginGateModal({
  open,
  onClose,
  onSubmit,
  allowRegister = false,
  initialMode = "login",
  errorMessage = "",
}) {
  const titleId = useId();
  const formRef = useRef(null);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [mode, setMode] = useState("login");
  const [step, setStep] = useState("login");
  const [otpCode, setOtpCode] = useState("");
  const [otpStatus, setOtpStatus] = useState("");
  const [otpChannel, setOtpChannel] = useState("email");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+1");
  const [resetStatus, setResetStatus] = useState("");
  const [socialError, setSocialError] = useState("");
  const [portalReady, setPortalReady] = useState(false);
  const [allowInput, setAllowInput] = useState(false);
  const { refresh } = useAuthStore();
  const { config } = useRegionStore();
  const googleAuthEnabled = isGoogleAuthEnabled();
  const isRegister = mode === "register";
  const title = isRegister ? "Create your reader pass" : "Welcome back";
  const subtitle = isRegister
    ? "Start a shelf for comics, novels, and interactive routes."
    : "Continue your stories.";
  const primaryLabel = isRegister ? "Create account" : "Sign in";
  const inputClass =
    "gush-auth-modal-input h-12 w-full rounded-lg border border-white/10 bg-[#10131f] px-4 text-sm font-semibold text-white outline-none transition placeholder:text-white/35 focus:border-[#EC4899]/70 focus:ring-2 focus:ring-[#EC4899]/18 sm:h-14 sm:rounded-xl sm:px-5 sm:text-base";
  const secondaryActionClass =
    "group flex min-h-[3.25rem] w-full items-center justify-between rounded-lg border border-white/10 bg-black/10 px-4 text-sm font-black text-[#E879F9] transition hover:border-[#EC4899]/35 hover:bg-white/[0.045] sm:min-h-[4rem] sm:rounded-xl sm:px-5 sm:text-base";
  const secondaryPillClass =
    "rounded-full border border-white/10 bg-white/[0.035] px-4 py-2 text-xs font-black text-white/72 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white";
  const activePillClass =
    "rounded-full border border-white/16 bg-white/[0.08] px-4 py-2 text-xs font-black text-white shadow-[0_12px_26px_rgba(0,0,0,0.2)]";
  const dividerClass = "h-px flex-1 bg-white/10";

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (open) {
      setEmail("");
      setPassword("");
      setAllowInput(false);
      setMode(initialMode === "register" ? "register" : "login");
      setStep("login");
      setOtpCode("");
      setOtpStatus("");
      setOtpChannel("email");
      setPhone("");
      setCountryCode("+1");
      setResetStatus("");
      setSocialError("");
    }
  }, [initialMode, open]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const clearAutofill = () => {
      if (
        document.activeElement === emailRef.current ||
        document.activeElement === passwordRef.current
      ) {
        return;
      }
      setEmail("");
      setPassword("");
      if (emailRef.current) {
        emailRef.current.value = "";
      }
      if (passwordRef.current) {
        passwordRef.current.value = "";
      }
      formRef.current?.reset?.();
    };

    clearAutofill();
    const timers = [80, 260, 700].map((delay) =>
      window.setTimeout(clearAutofill, delay),
    );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const region =
      (typeof window !== "undefined"
        ? window.localStorage.getItem("mn_region")
        : null) ||
      getCookie("mn_region") ||
      "global";
    const regionMap = {
      us: "+1",
      kr: "+82",
      cn: "+86",
      jp: "+81",
      sg: "+65",
      global: "+1",
    };
    setCountryCode(regionMap[region] || "+1");
  }, [open]);

  const handleSubmit = async (event) => {
    event?.preventDefault?.();
    if (step === "otp") {
      setOtpStatus("");
      const response = await apiPost("/api/auth/otp/verify", {
        email,
        code: otpCode,
      });
      if (response.ok) {
        await refresh();
        onClose?.();
      } else {
        setOtpStatus(response.error || "Code failed.");
      }
      return;
    }

    const response = await onSubmit?.({ email, password, mode });
    if (response?.status === 202 || response?.data?.requiresOtp) {
      setStep("otp");
      setOtpStatus("Code sent.");
    }
  };

  const handleResendOtp = async () => {
    if (!email) {
      setOtpStatus("Enter your email first.");
      return;
    }
    if (otpChannel === "sms") {
      const lengthMap = config?.lengthRules || {
        "+1": [10],
        "+82": [9, 10, 11],
        "+86": [11],
        "+81": [9, 10, 11],
        "+65": [8],
      };
      const allowed = lengthMap[countryCode] || [8, 9, 10, 11];
      if (!allowed.includes(phone.length)) {
        setOtpStatus("Invalid phone number length.");
        return;
      }
    }
    const response = await apiPost("/api/auth/otp/request", {
      email,
      channel: otpChannel,
      phone: otpChannel === "sms" ? `${countryCode}${phone}` : "",
    });
    if (response.ok) {
      setOtpStatus("Code resent.");
    } else if (response.error === "INVALID_REQUEST") {
      setOtpStatus("Invalid phone number.");
    } else {
      setOtpStatus(response.error || "Resend failed.");
    }
  };

  const handleReset = async () => {
    if (!email) {
      setResetStatus("Enter your email.");
      return;
    }
    const response = await apiPost("/api/auth/request-reset", { email });
    if (response.ok) {
      setResetStatus("Reset link sent.");
    } else {
      setResetStatus(response.error || "Couldn't send reset link.");
    }
  };

  const handleSocialSuccess = useCallback(async () => {
    setSocialError("");
    const response = await refresh();
    if (response?.ok && (response.data?.isSignedIn || response.data?.user)) {
      setCookie("mn_is_signed_in", "1");
      onClose?.();
      return;
    }
    setSocialError("Google sign-in worked, but the session did not refresh.");
  }, [onClose, refresh]);

  const handleSocialError = useCallback((message) => {
    setSocialError(message || "Social sign-in failed.");
  }, []);

  if (!open || !portalReady) {
    return null;
  }

  return createPortal(
    <div
      role="presentation"
      className="fixed inset-0 z-[1000] flex min-h-screen items-center justify-center overflow-y-auto bg-[#070A13]/90 px-4 py-6 font-[Inter,Geist,Satoshi,'SF_Pro_Display',system-ui,sans-serif] text-white backdrop-blur-2xl"
      onClick={onClose}
    >
      <style jsx global>{`
        .gush-auth-modal-input:-webkit-autofill,
        .gush-auth-modal-input:-webkit-autofill:hover,
        .gush-auth-modal-input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 1000px #10131f inset !important;
          -webkit-text-fill-color: #ffffff !important;
          caret-color: #ffffff;
          transition: background-color 9999s ease-out;
        }
      `}</style>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-[620px] overflow-hidden rounded-[1.65rem] border border-white/10 bg-white/[0.045] p-[1.35rem] shadow-[0_2rem_7rem_rgba(0,0,0,0.48)] backdrop-blur-2xl sm:rounded-[2rem] sm:p-10 lg:p-14"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(circle_at_top_right,rgba(236,72,153,0.22),transparent_34%)]" />
        <div className="pointer-events-none absolute inset-[1px] rounded-[calc(1.65rem-1px)] border border-white/5 sm:rounded-[calc(2rem-1px)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(236,72,153,0.92),rgba(168,85,247,0.72),transparent)]" />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close sign in"
          className="absolute right-4 top-4 z-10 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-white/12 bg-white/[0.055] text-white/78 shadow-[0_12px_30px_rgba(0,0,0,0.26)] transition hover:border-white/24 hover:bg-white/[0.09] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#EC4899]/45 sm:right-6 sm:top-6"
        >
          <X size={18} aria-hidden="true" />
        </button>

        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="relative"
          autoComplete="off"
        >
          <div className="pr-12">
            <h3
              id={titleId}
              className="text-[2rem] font-black leading-tight tracking-[-0.045em] text-white sm:text-[2.85rem]"
            >
              {title}
            </h3>
            <p className="mt-1.5 text-sm leading-6 text-white/64 sm:mt-3 sm:text-lg">
              {subtitle}
            </p>
          </div>

          <div className="mt-7 space-y-5 sm:mt-10 sm:space-y-7">
          <div>
            <label
              htmlFor="gush-modal-email"
              className="mb-2 block text-[0.7rem] font-black text-white/88 sm:mb-3 sm:text-sm"
            >
              Email
            </label>
            <input
              ref={emailRef}
              id="gush-modal-email"
              type="email"
              name="gush-reader-access-email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onFocus={() => setAllowInput(true)}
              placeholder="you@example.com"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              readOnly={!allowInput}
              className={inputClass}
            />
          </div>

          {step === "otp" ? (
            <div className="flex items-center gap-3 text-xs">
              <button
                type="button"
                onClick={() => setOtpChannel("email")}
                className={`rounded-full px-4 py-2 font-semibold transition-all duration-300 ${
                  otpChannel === "email" ? activePillClass : secondaryPillClass
                }`}
              >
                Email OTP
              </button>
              <button
                type="button"
                onClick={() => setOtpChannel("sms")}
                className={`rounded-full px-4 py-2 font-semibold transition-all duration-300 ${
                  otpChannel === "sms" ? activePillClass : secondaryPillClass
                }`}
              >
                SMS OTP
              </button>
            </div>
          ) : null}

          {step !== "otp" ? (
            <div>
              <label
                htmlFor="gush-modal-password"
                className="mb-2 block text-[0.7rem] font-black text-white/88 sm:mb-3 sm:text-sm"
              >
                Password
              </label>
              <div className="relative">
                <input
                  ref={passwordRef}
                  id="gush-modal-password"
                  type={showPassword ? "text" : "password"}
                  name="gush-reader-access-passcode"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  onFocus={() => setAllowInput(true)}
                  placeholder="Enter your password"
                  autoComplete="new-password"
                  readOnly={!allowInput}
                  className={`${inputClass} pr-12 sm:pr-14`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 flex min-h-11 w-12 items-center justify-center text-white/52 transition hover:text-white sm:w-14"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" />
                  ) : (
                    <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
                  )}
                </button>
              </div>
            </div>
          ) : (
            <>
              {otpChannel === "sms" ? (
                <div className="flex items-center gap-2">
                  <select
                    value={countryCode}
                    onChange={(event) => setCountryCode(event.target.value)}
                    className="min-h-[48px] rounded-[22px] border border-white/12 bg-[rgba(7,10,21,0.72)] px-3 py-3 text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_12px_28px_rgba(8,6,20,0.18)] transition-[border-color,box-shadow,background-color] duration-200 focus:border-cyan-300/40 focus:bg-[rgba(11,15,28,0.92)] focus:outline-none focus:ring-4 focus:ring-cyan-400/10"
                  >
                    {(
                      config?.countryCodes || [
                        { code: "+1", label: "US" },
                        { code: "+82", label: "KR" },
                        { code: "+86", label: "CN" },
                        { code: "+81", label: "JP" },
                        { code: "+65", label: "SG" },
                      ]
                    ).map((item) => (
                      <option key={item.code} value={item.code}>
                        {item.code} {item.label}
                      </option>
                    ))}
                  </select>
                  <input
                    value={phone}
                    onChange={(event) => {
                      const next = event.target.value.replace(/[^0-9]/g, "");
                      setPhone(next);
                    }}
                    placeholder="Phone number"
                    autoComplete="tel-national"
                    className={inputClass}
                  />
                </div>
              ) : null}
              <input
                value={otpCode}
                onChange={(event) => setOtpCode(event.target.value)}
                placeholder="6-digit code"
                autoComplete="one-time-code"
                className={inputClass}
              />
            </>
          )}

          {step !== "otp" ? (
            <div className="flex items-center justify-between gap-4">
              <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-xs font-black text-white/82 sm:text-sm">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                  className="h-4 w-4 rounded border-white/20 accent-[#8B5CF6] sm:h-5 sm:w-5"
                />
                Remember me
              </label>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex min-h-11 items-center text-xs font-black text-[#F472B6] transition hover:text-white sm:text-sm"
              >
                Forgot password?
              </button>
            </div>
          ) : null}

          {step !== "otp" && googleAuthEnabled ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.08em] text-white/40">
                <div className={dividerClass} />
                <span>or</span>
                <div className={dividerClass} />
              </div>
              <SocialAuthButton
                provider="google"
                onSuccess={handleSocialSuccess}
                onError={handleSocialError}
              />
            </div>
          ) : null}
          </div>

        {errorMessage ? (
          <p className="mt-4 rounded-[22px] border border-rose-300/22 bg-[rgba(255,79,154,0.12)] px-4 py-2.5 text-xs font-semibold text-white shadow-[0_16px_32px_rgba(255,79,154,0.14)]">
            {errorMessage}
          </p>
        ) : null}

        {socialError ? (
          <p className="mt-4 rounded-[22px] border border-rose-300/22 bg-[rgba(255,79,154,0.12)] px-4 py-2.5 text-xs font-semibold text-white shadow-[0_16px_32px_rgba(255,79,154,0.14)]">
            {socialError}
          </p>
        ) : null}

        {step === "otp" ? (
          <div className="mt-3 text-xs font-medium text-white/60">
            {otpStatus}
            <button
              type="button"
              onClick={handleResendOtp}
              className="ml-2 font-semibold tracking-[0.02em] text-[#ffd879] transition-colors duration-200 hover:text-[#fff0bb]"
            >
              Resend
            </button>
          </div>
        ) : null}

        <button
          type="submit"
          className="mt-6 inline-flex min-h-[52px] w-full items-center justify-center gap-3 rounded-lg bg-[linear-gradient(90deg,#EC4899_0%,#A855F7_52%,#7C3AED_100%)] px-5 text-sm font-black text-white shadow-[0_1.3rem_3.2rem_rgba(168,85,247,0.28)] transition hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-[#EC4899]/45 sm:min-h-[60px] sm:rounded-xl sm:text-base"
        >
          {primaryLabel}
          <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
        </button>

        <div className="my-5 flex items-center gap-6 text-sm text-white/50 sm:my-8">
          <span className="h-px flex-1 bg-white/10" />
          <span>or</span>
          <span className="h-px flex-1 bg-white/10" />
        </div>

        <div className="grid gap-3 sm:gap-4">
          {allowRegister ? (
            <button
              type="button"
              onClick={() => setMode(isRegister ? "login" : "register")}
              className={secondaryActionClass}
            >
              <span className="flex items-center gap-3">
                <UserPlus
                  className="h-5 w-5 text-[#E879F9]"
                  strokeWidth={1.9}
                  aria-hidden="true"
                />
                {isRegister
                  ? "Already have a reader pass? Sign in"
                  : "Create account"}
              </span>
              <ArrowRight
                className="h-4 w-4 transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              />
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className={secondaryActionClass}
          >
            <span className="flex items-center gap-3">
              <Compass
                className="h-5 w-5 text-[#E879F9]"
                strokeWidth={1.9}
                aria-hidden="true"
              />
              Continue browsing
            </span>
            <ArrowRight
              className="h-4 w-4 transition-transform group-hover:translate-x-1"
              aria-hidden="true"
            />
          </button>
        </div>

        {resetStatus ? (
          <div className="mt-3 rounded-[22px] border border-cyan-300/22 bg-[rgba(92,228,255,0.12)] px-4 py-2.5 text-xs font-semibold text-white/78 shadow-[0_16px_32px_rgba(92,228,255,0.14)]">
            {resetStatus}
          </div>
        ) : null}
        </form>
      </div>
    </div>,
    document.body,
  );
}
