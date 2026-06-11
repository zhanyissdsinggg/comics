"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiPost } from "../../../lib/apiClient";

const inputClass =
  "h-12 w-full rounded-2xl border border-white/10 bg-[#111421]/82 px-4 text-base font-semibold text-white outline-none transition placeholder:text-white/34 focus:border-[#EC4899]/70 focus:ring-2 focus:ring-[#EC4899]/18 sm:h-14";
const primaryButtonClass =
  "inline-flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-[linear-gradient(90deg,#EC4899_0%,#A855F7_52%,#7C3AED_100%)] px-5 text-sm font-black text-white shadow-[0_18px_44px_rgba(168,85,247,0.28)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60";
const secondaryButtonClass =
  "inline-flex min-h-[52px] w-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.035] px-5 text-sm font-black text-white/78 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-60";
const noticeBaseClass =
  "rounded-2xl border px-4 py-3.5 shadow-[0_18px_44px_rgba(0,0,0,0.22)]";

function StatusNotice({ tone = "neutral", title = "", message = "" }) {
  if (!title && !message) {
    return null;
  }

  const toneMap = {
    neutral:
      "border-cyan-300/22 bg-[linear-gradient(135deg,rgba(34,211,238,0.18)_0%,rgba(17,24,39,0.92)_100%)] text-white",
    success:
      "border-emerald-300/24 bg-[linear-gradient(135deg,rgba(16,185,129,0.2)_0%,rgba(17,24,39,0.92)_100%)] text-white",
    error:
      "border-rose-300/24 bg-[linear-gradient(135deg,rgba(244,63,94,0.2)_0%,rgba(17,24,39,0.94)_100%)] text-white",
  };

  return (
    <div className={`${noticeBaseClass} ${toneMap[tone] || toneMap.neutral}`}>
      {title ? (
        <p className="text-sm font-semibold tracking-[-0.02em]">{title}</p>
      ) : null}
      {message ? <p className="mt-1.5 text-sm leading-6 text-white/72">{message}</p> : null}
    </div>
  );
}

export default function ResetFormClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const queryToken = String(searchParams.get("token") || "").trim();
    setToken(queryToken);
  }, [searchParams]);

  const hasToken = Boolean(token);

  const handleSendResetLink = async () => {
    const normalizedEmail = String(email || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setStatus({
        tone: "error",
        title: "Enter a valid email",
        message: "Use your account email.",
      });
      return;
    }

    setSubmitting(true);
    setStatus(null);
    const response = await apiPost("/api/auth/request-reset", {
      email: normalizedEmail,
    });
    if (response.ok) {
      setStatus({
        tone: "success",
        title: "Check your inbox",
        message: "If that address is registered, we sent a fresh reset link.",
      });
    } else {
      setStatus({
        tone: "error",
        title: "We could not send the link",
        message: response.error || "Retry in a moment.",
      });
    }
    setSubmitting(false);
  };

  const handleResetPassword = async () => {
    if (!token) {
      setStatus({
        tone: "error",
        title: "This reset link is missing",
        message: "Request a new reset email.",
      });
      return;
    }

    if (password.length < 6) {
      setStatus({
        tone: "error",
        title: "Choose a longer password",
        message: "Use at least 6 characters.",
      });
      return;
    }

    setSubmitting(true);
    setStatus(null);
    const response = await apiPost("/api/auth/reset", { token, password });
    if (response.ok) {
      setStatus({
        tone: "success",
        title: "Password updated",
        message: "Redirecting you to sign in.",
      });
      setTimeout(() => router.push("/?openLogin=1"), 1100);
    } else {
      const message = response.error || "This reset link is no longer valid.";
      const shouldRefreshLink = /expired|invalid/i.test(message);
      setStatus({
        tone: "error",
        title: shouldRefreshLink
          ? "This link has expired"
          : "We could not reset the password",
        message: shouldRefreshLink ? "Request a new email below." : message,
      });
      if (shouldRefreshLink) {
        setToken("");
        setPassword("");
      }
    }
    setSubmitting(false);
  };

  return (
    <div className="space-y-5">
      {hasToken ? (
        <div className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-white/78">
              Password
            </span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Choose a new password"
              autoComplete="new-password"
              className={inputClass}
            />
          </label>
          <button
            type="button"
            disabled={submitting}
            onClick={handleResetPassword}
            className={primaryButtonClass}
          >
            {submitting ? "Saving..." : "Save new password"}
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => {
              setToken("");
              setPassword("");
              setStatus(null);
            }}
            className={secondaryButtonClass}
          >
            Send a new email
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-white/78">
              Email
            </span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              autoComplete="email"
              className={inputClass}
            />
          </label>
          <button
            type="button"
            disabled={submitting}
            onClick={handleSendResetLink}
            className={primaryButtonClass}
          >
            {submitting ? "Sending..." : "Email me a reset link"}
          </button>
        </div>
      )}

      <StatusNotice
        tone={status?.tone}
        title={status?.title}
        message={status?.message}
      />

      <div className="rounded-[22px] border border-white/10 bg-white/[0.035] px-4 py-4">
        <p className="text-sm font-semibold text-white">Account links</p>
        <p className="mt-3 text-sm leading-6 text-white/64">
          <Link
            href="/support"
            className="font-semibold text-[#00E5FF] underline decoration-[#00E5FF]/35 underline-offset-4 hover:text-[#7DF4FF]"
          >
            Support
          </Link>
          .{" "}
          <Link
            href="/terms-of-service"
            className="font-semibold text-[#FFE500] underline decoration-[#FFE500]/35 underline-offset-4 hover:text-[#FFF27A]"
          >
            Terms
          </Link>
          .{" "}
          <Link
            href="/privacy-policy"
            className="font-semibold text-[#F0ABFC] underline decoration-[#F0ABFC]/35 underline-offset-4 hover:text-[#F5D0FE]"
          >
            Privacy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
