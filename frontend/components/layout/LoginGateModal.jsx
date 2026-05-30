"use client";

import { useCallback, useEffect, useState } from "react";
import ModalBase from "../common/ModalBase";
import {
  LOGIN_GATE_DESCRIPTION,
  LOGIN_GATE_TITLE,
} from "../../lib/adultGateCopy";
import { apiPost } from "../../lib/apiClient";
import { useAuthStore } from "../../store/useAuthStore";
import { getCookie, setCookie } from "../../lib/cookies";
import { useRegionStore } from "../../store/useRegionStore";
import { isGoogleAuthEnabled } from "../../lib/socialAuthConfig";
import SocialAuthButton from "../auth/SocialAuthButton";
import {
  storefrontInputClass,
  storefrontNoticeClass,
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
} from "../common/StorefrontPagePrimitives";

export default function LoginGateModal({
  open,
  onClose,
  onSubmit,
  allowRegister = false,
  initialMode = "login",
  title = LOGIN_GATE_TITLE,
  description = LOGIN_GATE_DESCRIPTION,
  errorMessage = "",
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("login");
  const [step, setStep] = useState("login");
  const [otpCode, setOtpCode] = useState("");
  const [otpStatus, setOtpStatus] = useState("");
  const [otpChannel, setOtpChannel] = useState("email");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+1");
  const [resetStatus, setResetStatus] = useState("");
  const [socialError, setSocialError] = useState("");
  const { refresh } = useAuthStore();
  const { config } = useRegionStore();
  const googleAuthEnabled = isGoogleAuthEnabled();
  const inputClass = storefrontInputClass.replace("mt-2 ", "");
  const secondaryPillClass =
    "rounded-full border border-white/12 bg-[rgba(255,255,255,0.045)] text-white shadow-[0_14px_28px_rgba(8,6,20,0.18)] backdrop-blur-xl transition-all duration-150 hover:-translate-y-0.5 hover:border-cyan-300/28 hover:bg-[rgba(255,255,255,0.08)]";
  const activePillClass =
    "rounded-full border border-[rgba(255,214,130,0.24)] bg-[linear-gradient(135deg,#f6c25f_0%,#ffd77a_100%)] text-[#241608] shadow-[0_16px_30px_rgba(246,194,95,0.24)]";
  const dividerClass = "h-px flex-1 bg-white/10";

  useEffect(() => {
    if (open) {
      setEmail("");
      setPassword("");
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

  return (
    <ModalBase open={open} title={title} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {description ? (
          <p className={storefrontNoticeClass}>
            {description}
          </p>
        ) : null}
        <div className="mt-6 space-y-4">
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            autoComplete="email"
            className={inputClass}
          />

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
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              autoComplete={
                mode === "register" ? "new-password" : "current-password"
              }
              className={inputClass}
            />
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

        {allowRegister ? (
          <div className="mt-6 flex items-center gap-3 text-xs">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 px-4 py-2 font-semibold transition-all duration-300 ${
                mode === "login" ? activePillClass : secondaryPillClass
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`flex-1 px-4 py-2 font-semibold transition-all duration-300 ${
                mode === "register" ? activePillClass : secondaryPillClass
              }`}
            >
              Register
            </button>
          </div>
        ) : null}

        <div className="mt-4 text-xs">
          <button
            type="button"
            onClick={handleReset}
            className="font-semibold tracking-[0.01em] text-white/55 transition-colors duration-300 hover:text-white"
          >
            Forgot password?
          </button>
        </div>

        {resetStatus ? (
          <div className="mt-3 rounded-[22px] border border-cyan-300/22 bg-[rgba(92,228,255,0.12)] px-4 py-2.5 text-xs font-semibold text-white/78 shadow-[0_16px_32px_rgba(92,228,255,0.14)]">
            {resetStatus}
          </div>
        ) : null}

        <p className="mt-4 text-[11px] font-medium tracking-[0.04em] text-white/40">
          Need email verification? Use the link in your inbox.
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className={storefrontSecondaryButtonClass}
          >
            Cancel
          </button>
          <button type="submit" className={storefrontPrimaryButtonClass}>
            {mode === "register" ? "Register" : "Sign in"}
          </button>
        </div>
      </form>
    </ModalBase>
  );
}
