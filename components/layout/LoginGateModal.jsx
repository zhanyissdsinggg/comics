"use client";

import { useEffect, useState } from "react";
import ModalBase from "../common/ModalBase";
import {
  LOGIN_GATE_DESCRIPTION,
  LOGIN_GATE_TITLE,
} from "../../lib/adultGateCopy";
import { apiPost } from "../../lib/apiClient";
import { useAuthStore } from "../../store/useAuthStore";
import { getCookie } from "../../lib/cookies";
import { useRegionStore } from "../../store/useRegionStore";

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
  const [resetToken, setResetToken] = useState("");
  const { refresh } = useAuthStore();
  const { config } = useRegionStore();

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
      setResetToken("");
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

  const handleSubmit = async () => {
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
      return;
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
    } else {
      if (response.error === "INVALID_REQUEST") {
        setOtpStatus("Invalid phone number.");
      } else {
        setOtpStatus(response.error || "Resend failed.");
      }
    }
  };

  const handleReset = async () => {
    if (!email) {
      setResetStatus("Please enter your email first.");
      return;
    }
    const response = await apiPost("/api/auth/request-reset", { email });
    if (response.ok) {
      setResetStatus("Reset link sent (dev: token shown below).");
      setResetToken(response.data?.token || "");
    } else {
      setResetStatus(response.error || "Reset failed.");
      setResetToken("");
    }
  };

  return (
    <ModalBase open={open} title={title} onClose={onClose}>
      <p className="text-neutral-400">{description}</p>
      <div className="mt-6 space-y-4">
        {/* 老王注释：Email输入框 - 品牌色focus效果 + 发光阴影 */}
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email"
          className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-white placeholder-neutral-500 transition-all duration-300 focus:border-brand-primary/50 focus:bg-neutral-900 focus:shadow-glow-sm focus:outline-none"
        />
        {step === "otp" ? (
          <div className="flex items-center gap-3 text-xs">
            <button
              type="button"
              onClick={() => setOtpChannel("email")}
              className={`rounded-full px-4 py-2 font-semibold transition-all duration-300 ${
                otpChannel === "email"
                  ? "bg-brand-gradient text-white shadow-glow-sm"
                  : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white"
              }`}
            >
              Email OTP
            </button>
            <button
              type="button"
              onClick={() => setOtpChannel("sms")}
              className={`rounded-full px-4 py-2 font-semibold transition-all duration-300 ${
                otpChannel === "sms"
                  ? "bg-brand-gradient text-white shadow-glow-sm"
                  : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white"
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
            className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-white placeholder-neutral-500 transition-all duration-300 focus:border-brand-primary/50 focus:bg-neutral-900 focus:shadow-glow-sm focus:outline-none"
          />
        ) : (
          <>
            {otpChannel === "sms" ? (
              <div className="flex items-center gap-2">
                <select
                  value={countryCode}
                  onChange={(event) => setCountryCode(event.target.value)}
                  className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-3 text-sm text-neutral-200 transition-all duration-300 focus:border-brand-primary/50 focus:bg-neutral-900 focus:shadow-glow-sm focus:outline-none"
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
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-white placeholder-neutral-500 transition-all duration-300 focus:border-brand-primary/50 focus:bg-neutral-900 focus:shadow-glow-sm focus:outline-none"
                />
              </div>
            ) : null}
            <input
              value={otpCode}
              onChange={(event) => setOtpCode(event.target.value)}
              placeholder="6-digit code"
              className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-white placeholder-neutral-500 transition-all duration-300 focus:border-brand-primary/50 focus:bg-neutral-900 focus:shadow-glow-sm focus:outline-none"
            />
          </>
        )}
      </div>
      {errorMessage ? (
        <p className="mt-4 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-2 text-xs text-red-300">
          {errorMessage}
        </p>
      ) : null}
      {step === "otp" ? (
        <div className="mt-3 text-xs text-neutral-400">
          {otpStatus}
          <button
            type="button"
            onClick={handleResendOtp}
            className="ml-2 font-semibold text-brand-primary hover:text-brand-secondary transition-colors duration-300"
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
                ? "bg-brand-gradient text-white shadow-glow-sm"
                : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white"
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`flex-1 rounded-full px-4 py-2 font-semibold transition-all duration-300 ${
              mode === "register"
                ? "bg-brand-gradient text-white shadow-glow-sm"
                : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white"
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
          className="font-semibold text-neutral-400 hover:text-brand-primary transition-colors duration-300"
        >
          Forgot password?
        </button>
      </div>
      {resetStatus ? (
        <div className="mt-3 rounded-lg bg-brand-primary/10 border border-brand-primary/30 px-4 py-2 text-xs text-neutral-300">
          {resetStatus}
          {resetToken ? (
            <div className="mt-2 break-all rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-[11px] text-neutral-300 font-mono">
              {resetToken}
            </div>
          ) : null}
        </div>
      ) : null}
      <p className="mt-4 text-[11px] text-neutral-500">
        If sign in fails due to email not verified, please verify from the email link.
      </p>
      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-neutral-700 px-6 py-2.5 text-sm font-semibold text-neutral-300 transition-all duration-300 hover:border-neutral-600 hover:bg-neutral-800 active:scale-95"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="rounded-full bg-brand-gradient px-6 py-2.5 text-sm font-semibold text-white shadow-glow-sm transition-all duration-300 hover:shadow-glow-md hover:scale-105 active:scale-95"
        >
          {mode === "register" ? "Register" : "Sign in"}
        </button>
      </div>
    </ModalBase>
  );
}
