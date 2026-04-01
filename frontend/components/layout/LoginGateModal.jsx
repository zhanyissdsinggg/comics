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
      (typeof window !== "undefined" ? window.localStorage.getItem("mn_region") : null) ||
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
        setOtpStatus(response.error || "OTP failed.");
      }
      return;
    }

    const response = await onSubmit?.({ email, password, mode });
    if (response?.status === 202 || response?.data?.requiresOtp) {
      setStep("otp");
      setOtpStatus("We sent a code to your email.");
    }
  };

  const handleResendOtp = async () => {
    if (!email) {
      setOtpStatus("Please enter your email first.");
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
      setResetStatus("Please enter your email first.");
      return;
    }
    const response = await apiPost("/api/auth/request-reset", { email });
    if (response.ok) {
      setResetStatus("Reset link sent. Please check your email.");
    } else {
      setResetStatus(response.error || "Reset failed.");
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
    setSocialError("Google sign-in succeeded, but session refresh failed. Please try again.");
  }, [onClose, refresh]);

  const handleSocialError = useCallback((message) => {
    setSocialError(message || "Social sign-in failed. Please try again later.");
  }, []);

  return (
    <ModalBase open={open} title={title} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <p className="text-slate-500">{description}</p>
        <div className="mt-6 space-y-4">
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email"
          autoComplete="email"
          className="w-full rounded-xl border border-black/8 bg-[#f8f9fc] px-4 py-3 text-sm text-slate-800 placeholder-slate-400 transition-all duration-300 focus:border-[var(--gush-accent,#2f6bff)] focus:bg-white focus:outline-none"
        />

        {step === "otp" ? (
          <div className="flex items-center gap-3 text-xs">
            <button
              type="button"
              onClick={() => setOtpChannel("email")}
              className={`rounded-full px-4 py-2 font-semibold transition-all duration-300 ${
                otpChannel === "email"
                  ? "bg-slate-950 text-white"
                  : "border border-black/8 bg-white text-slate-500 hover:border-black/12 hover:bg-[#f8f9fc] hover:text-slate-950"
              }`}
            >
              Email OTP
            </button>
            <button
              type="button"
              onClick={() => setOtpChannel("sms")}
              className={`rounded-full px-4 py-2 font-semibold transition-all duration-300 ${
                otpChannel === "sms"
                  ? "bg-slate-950 text-white"
                  : "border border-black/8 bg-white text-slate-500 hover:border-black/12 hover:bg-[#f8f9fc] hover:text-slate-950"
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
            autoComplete={mode === "register" ? "new-password" : "current-password"}
            className="w-full rounded-xl border border-black/8 bg-[#f8f9fc] px-4 py-3 text-sm text-slate-800 placeholder-slate-400 transition-all duration-300 focus:border-[var(--gush-accent,#2f6bff)] focus:bg-white focus:outline-none"
          />
        ) : (
          <>
            {otpChannel === "sms" ? (
              <div className="flex items-center gap-2">
                <select
                  value={countryCode}
                  onChange={(event) => setCountryCode(event.target.value)}
                  className="rounded-xl border border-black/8 bg-[#f8f9fc] px-3 py-3 text-sm text-slate-700 transition-all duration-300 focus:border-[var(--gush-accent,#2f6bff)] focus:bg-white focus:outline-none"
                >
                  {(config?.countryCodes || [
                    { code: "+1", label: "US" },
                    { code: "+82", label: "KR" },
                    { code: "+86", label: "CN" },
                    { code: "+81", label: "JP" },
                    { code: "+65", label: "SG" },
                  ]).map((item) => (
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
                  className="w-full rounded-xl border border-black/8 bg-[#f8f9fc] px-4 py-3 text-sm text-slate-800 placeholder-slate-400 transition-all duration-300 focus:border-[var(--gush-accent,#2f6bff)] focus:bg-white focus:outline-none"
                />
              </div>
            ) : null}
            <input
              value={otpCode}
              onChange={(event) => setOtpCode(event.target.value)}
              placeholder="6-digit code"
              autoComplete="one-time-code"
              className="w-full rounded-xl border border-black/8 bg-[#f8f9fc] px-4 py-3 text-sm text-slate-800 placeholder-slate-400 transition-all duration-300 focus:border-[var(--gush-accent,#2f6bff)] focus:bg-white focus:outline-none"
            />
          </>
        )}

        {step !== "otp" && googleAuthEnabled ? (
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <div className="h-px flex-1 bg-black/8" />
              <span>or continue with</span>
              <div className="h-px flex-1 bg-black/8" />
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
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-600">
          {errorMessage}
        </p>
      ) : null}

      {socialError ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-600">
          {socialError}
        </p>
      ) : null}

      {step === "otp" ? (
        <div className="mt-3 text-xs text-slate-500">
          {otpStatus}
          <button
            type="button"
            onClick={handleResendOtp}
            className="ml-2 font-semibold text-[var(--gush-accent,#2f6bff)] transition-colors duration-300 hover:text-[#255af0]"
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
            className={`flex-1 rounded-full px-4 py-2 font-semibold transition-all duration-300 ${
              mode === "login"
                ? "bg-slate-950 text-white"
                : "border border-black/8 bg-white text-slate-500 hover:border-black/12 hover:bg-[#f8f9fc] hover:text-slate-950"
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`flex-1 rounded-full px-4 py-2 font-semibold transition-all duration-300 ${
              mode === "register"
                ? "bg-slate-950 text-white"
                : "border border-black/8 bg-white text-slate-500 hover:border-black/12 hover:bg-[#f8f9fc] hover:text-slate-950"
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
          className="font-semibold text-slate-500 transition-colors duration-300 hover:text-[var(--gush-accent,#2f6bff)]"
        >
          Forgot password?
        </button>
      </div>

      {resetStatus ? (
        <div className="mt-3 rounded-lg border border-[rgba(47,107,255,0.14)] bg-[rgba(47,107,255,0.06)] px-4 py-2 text-xs text-slate-600">
          {resetStatus}
        </div>
      ) : null}

      <p className="mt-4 text-[11px] text-slate-400">
        If your email is not verified yet, use the link in your inbox first.
      </p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-black/8 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 transition-all duration-300 hover:border-black/12 hover:bg-[#f8f9fc] active:scale-95"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-full bg-slate-950 px-6 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:scale-105 hover:bg-slate-800 active:scale-95"
          >
            {mode === "register" ? "Register" : "Sign in"}
          </button>
        </div>
      </form>
    </ModalBase>
  );
}


