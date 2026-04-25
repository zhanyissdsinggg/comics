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

export default function LoginGateModal({
  open,
  onClose,
  onSubmit,
  allowRegister = false,
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
  const inputClass =
    "w-full rounded-[20px] border border-black/10 bg-white px-4 py-3 text-sm font-medium text-black shadow-[0_10px_24px_rgba(15,23,42,0.08)] placeholder:text-black/35 transition-[border-color,box-shadow,background-color] duration-200 focus:border-black/18 focus:bg-[#fcfcfd] focus:shadow-[0_12px_28px_rgba(15,23,42,0.1)] focus:outline-none";
  const secondaryPillClass =
    "rounded-full border border-black/12 bg-white text-black/70 shadow-[0_8px_18px_rgba(15,23,42,0.06)] hover:border-black/18 hover:bg-black/[0.03] hover:text-black hover:shadow-[0_10px_20px_rgba(15,23,42,0.08)] active:translate-y-px";
  const secondaryButtonClass =
    "rounded-full border border-black/12 bg-white px-6 py-3 text-sm font-semibold tracking-[0.02em] text-black shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition-[background-color,border-color,box-shadow,transform] duration-200 hover:border-black/18 hover:bg-black/[0.03] hover:shadow-[0_12px_24px_rgba(15,23,42,0.1)] active:translate-y-px";
  const activePillClass =
    "rounded-full border border-black bg-black text-white shadow-[0_12px_28px_rgba(15,23,42,0.16)]";
  const dividerClass =
    "h-px flex-1 bg-black/10";
  const primaryButtonClass =
    "rounded-full border border-black bg-black px-6 py-3 text-sm font-semibold tracking-[0.02em] text-white shadow-[0_12px_28px_rgba(15,23,42,0.16)] transition-[background-color,box-shadow,transform] duration-200 hover:bg-black/90 hover:shadow-[0_10px_24px_rgba(15,23,42,0.14)] active:translate-y-px";

  useEffect(() => {
    if (open) {
      setEmail("");
      setPassword("");
      setMode("login");
      setStep("login");
      setOtpCode("");
      setOtpStatus("");
      setOtpChannel("email");
      setPhone("");
      setCountryCode("+1");
      setResetStatus("");
      setSocialError("");
    }
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
    setSocialError(
      "Google sign-in worked, but the session did not refresh.",
    );
  }, [onClose, refresh]);

  const handleSocialError = useCallback((message) => {
    setSocialError(message || "Social sign-in failed.");
  }, []);

  return (
    <ModalBase open={open} title={title} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {description ? (
          <p className="rounded-[22px] border border-sky-200/70 bg-sky-50 px-4 py-3 text-sm font-medium leading-6 text-black/72 shadow-[0_12px_24px_rgba(125,211,252,0.16)]">
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
                  otpChannel === "email"
                    ? activePillClass
                    : secondaryPillClass
                }`}
              >
                Email OTP
              </button>
              <button
                type="button"
                onClick={() => setOtpChannel("sms")}
                className={`rounded-full px-4 py-2 font-semibold transition-all duration-300 ${
                  otpChannel === "sms"
                    ? activePillClass
                    : secondaryPillClass
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
                    className="rounded-[20px] border border-black/10 bg-white px-3 py-3 text-sm font-medium text-black shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition-[border-color,box-shadow,background-color] duration-200 focus:border-black/18 focus:bg-[#fcfcfd] focus:shadow-[0_12px_28px_rgba(15,23,42,0.1)] focus:outline-none"
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
              <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.08em] text-black/40">
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
          <p className="mt-4 rounded-[20px] border border-rose-200/70 bg-[linear-gradient(180deg,#fff6f8_0%,#fff1f3_100%)] px-4 py-2 text-xs font-semibold text-black shadow-[0_12px_24px_rgba(244,63,94,0.1)]">
            {errorMessage}
          </p>
        ) : null}

        {socialError ? (
          <p className="mt-4 rounded-[20px] border border-rose-200/70 bg-[linear-gradient(180deg,#fff6f8_0%,#fff1f3_100%)] px-4 py-2 text-xs font-semibold text-black shadow-[0_12px_24px_rgba(244,63,94,0.1)]">
            {socialError}
          </p>
        ) : null}

        {step === "otp" ? (
          <div className="mt-3 text-xs font-medium text-black/55">
            {otpStatus}
            <button
              type="button"
              onClick={handleResendOtp}
              className="ml-2 font-semibold uppercase tracking-[0.08em] text-black transition-colors duration-200 hover:text-black/68"
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
                mode === "login"
                  ? activePillClass
                  : secondaryPillClass
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`flex-1 px-4 py-2 font-semibold transition-all duration-300 ${
                mode === "register"
                  ? activePillClass
                  : secondaryPillClass
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
              className="font-black uppercase tracking-[0.06em] text-black/55 transition-colors duration-300 hover:text-black"
          >
            Forgot password?
          </button>
        </div>

        {resetStatus ? (
          <div className="mt-3 rounded-[20px] border border-sky-200/70 bg-sky-50 px-4 py-2 text-xs font-semibold text-black/72 shadow-[0_12px_24px_rgba(125,211,252,0.16)]">
            {resetStatus}
          </div>
        ) : null}

        <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.08em] text-black/40">
          Need email verification? Use the link in your inbox.
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className={secondaryButtonClass}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={primaryButtonClass}
          >
            {mode === "register" ? "Register" : "Sign in"}
          </button>
        </div>
      </form>
    </ModalBase>
  );
}
