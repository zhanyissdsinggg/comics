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
    "w-full border-[3px] border-black bg-white px-4 py-3 text-sm font-semibold text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] placeholder:text-black/35 transition focus:translate-x-0.5 focus:translate-y-0.5 focus:bg-[#fff6cf] focus:shadow-none focus:outline-none";
  const secondaryPillClass =
    "border-[3px] border-black bg-white text-black/70 shadow-[3px_3px_0_0_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-[#eefcff] hover:text-black hover:shadow-none";
  const secondaryButtonClass =
    "border-[3px] border-black bg-white px-6 py-3 text-sm font-black uppercase tracking-[0.06em] text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-[#eefcff] hover:shadow-none active:scale-95";
  const activePillClass =
    "border-[3px] border-black bg-[#ffe500] text-black shadow-[3px_3px_0_0_rgba(0,0,0,1)]";
  const dividerClass =
    "h-[3px] flex-1 bg-black";
  const primaryButtonClass =
    "border-[3px] border-black bg-[#ff007a] px-6 py-3 text-sm font-black uppercase tracking-[0.06em] text-white shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all duration-300 hover:translate-x-[1px] hover:translate-y-[1px] hover:bg-[#e1006d] hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] active:scale-95";

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
    setSocialError(
      "Google sign-in succeeded, but session refresh failed. Please try again.",
    );
  }, [onClose, refresh]);

  const handleSocialError = useCallback((message) => {
    setSocialError(message || "Social sign-in failed. Please try again later.");
  }, []);

  return (
    <ModalBase open={open} title={title} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <p className="border-[3px] border-black bg-[#eefcff] px-4 py-3 text-sm font-semibold leading-6 text-black/72 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
          {description}
        </p>
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
                    className="border-[3px] border-black bg-white px-3 py-3 text-sm font-semibold text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition focus:outline-none"
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
                <span>or continue with</span>
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
          <p className="mt-4 border-[3px] border-black bg-[#fff1f7] px-4 py-2 text-xs font-semibold text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
            {errorMessage}
          </p>
        ) : null}

        {socialError ? (
          <p className="mt-4 border-[3px] border-black bg-[#fff1f7] px-4 py-2 text-xs font-semibold text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
            {socialError}
          </p>
        ) : null}

        {step === "otp" ? (
          <div className="mt-3 text-xs font-medium text-black/55">
            {otpStatus}
            <button
              type="button"
              onClick={handleResendOtp}
              className="ml-2 font-black uppercase tracking-[0.06em] text-[#ff007a] transition-colors duration-300 hover:text-black"
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
          <div className="mt-3 border-[3px] border-black bg-[#eefcff] px-4 py-2 text-xs font-semibold text-black/72 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
            {resetStatus}
          </div>
        ) : null}

        <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.08em] text-black/40">
          If your email is not verified yet, use the link in your inbox first.
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
