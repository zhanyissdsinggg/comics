"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import EmailLinkActionShell from "../../../components/auth/EmailLinkActionShell";
import { apiPost } from "../../../lib/apiClient";

function StatusNotice({ tone = "neutral", title = "", message = "" }) {
  if (!title && !message) {
    return null;
  }

  const toneMap = {
    neutral: "border-black/8 bg-[#f8f9fc] text-slate-600",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    error: "border-red-200 bg-red-50 text-red-600",
  };

  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneMap[tone] || toneMap.neutral}`}>
      {title ? <p className="text-sm font-semibold text-slate-950">{title}</p> : null}
      {message ? <p className="mt-1 text-sm leading-6">{message}</p> : null}
    </div>
  );
}

function ResetPageContent() {
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
  const inputClassName =
    "w-full rounded-2xl border border-black/8 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[rgba(47,107,255,0.18)] focus:ring-4 focus:ring-[rgba(47,107,255,0.08)]";
  const primaryButtonClass =
    "w-full rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60";
  const secondaryButtonClass =
    "w-full rounded-full border border-black/8 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[#f8f9fc] disabled:cursor-not-allowed disabled:opacity-60";

  const handleSendResetLink = async () => {
    const normalizedEmail = String(email || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setStatus({
        tone: "error",
        title: "Enter a valid email",
        message: "Use the address attached to your account so we can send a fresh password reset link.",
      });
      return;
    }

    setSubmitting(true);
    setStatus(null);
    const response = await apiPost("/api/auth/request-reset", { email: normalizedEmail });
    if (response.ok) {
      setStatus({
        tone: "success",
        title: "Check your inbox",
        message:
          "If that address is registered, we just sent a fresh password reset link. Open it on this device to finish in one step.",
      });
    } else {
      setStatus({
        tone: "error",
        title: "We could not send the link",
        message: response.error || "Please wait a moment and try again.",
      });
    }
    setSubmitting(false);
  };

  const handleResetPassword = async () => {
    if (!token) {
      setStatus({
        tone: "error",
        title: "This reset link is missing",
        message: "Request a fresh password reset email and reopen the newest link.",
      });
      return;
    }

    if (password.length < 6) {
      setStatus({
        tone: "error",
        title: "Choose a longer password",
        message: "Use at least 6 characters so the new password can be saved.",
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
        message: "Redirecting you to sign in so you can jump straight back into your library.",
      });
      setTimeout(() => router.push("/?openLogin=1"), 1100);
    } else {
      const message = response.error || "This reset link is no longer valid.";
      const shouldRefreshLink = /expired|invalid/i.test(message);
      setStatus({
        tone: "error",
        title: shouldRefreshLink ? "This link has expired" : "We could not reset the password",
        message: shouldRefreshLink
          ? "Request a fresh email below and open the newest reset link."
          : message,
      });
      if (shouldRefreshLink) {
        setToken("");
        setPassword("");
      }
    }
    setSubmitting(false);
  };

  return (
    <EmailLinkActionShell
      eyebrow="Account access"
      title="Reset your password"
      description="Get back into your account in a minute."
      asideTitle="What to do"
      asideBody={
        hasToken
          ? "Your reset link is already here. Choose a new password and we'll send you back to sign in."
          : "Enter your account email and we'll send a fresh reset link. For security, the message looks the same whether the address exists or not."
      }
    >
      <div className="space-y-6">
        <div className="relative">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
            Password reset
          </p>
          <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-slate-950">
            {hasToken ? "Choose a new password" : "Need another reset email?"}
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {hasToken
              ? "The reset link is already loaded from the email you opened."
              : "If the old link expired or opened on another device, send a new one here."}
          </p>
        </div>

        {hasToken ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-[rgba(47,107,255,0.14)] bg-[rgba(47,107,255,0.08)] px-4 py-3 text-sm text-slate-700">
              Reset link loaded from your email. No code field required.
            </div>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Choose a new password"
              autoComplete="new-password"
              className={inputClassName}
            />
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
              Send me a new reset email
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              autoComplete="email"
              className={inputClassName}
            />
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

        <StatusNotice tone={status?.tone} title={status?.title} message={status?.message} />

        <div className="rounded-2xl border border-black/8 bg-[#f8f9fc] px-4 py-4 text-sm leading-6 text-slate-600">
          Signed in already? Head back to{" "}
          <Link href="/account" className="font-semibold text-slate-950 hover:text-[var(--gush-accent,#2f6bff)]">
            your account
          </Link>
          . Need help with a missing email? Contact{" "}
          <Link href="/support" className="font-semibold text-slate-950 hover:text-[var(--gush-accent,#2f6bff)]">
            us
          </Link>
          .
        </div>
      </div>
    </EmailLinkActionShell>
  );
}

export default function ResetPage() {
  return (
    <Suspense fallback={<div className="gush-home-shell min-h-screen overflow-hidden"><div className="gush-page-ambient" /></div>}>
      <ResetPageContent />
    </Suspense>
  );
}
