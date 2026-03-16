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
    neutral: "border-white/10 bg-white/[0.04] text-neutral-300",
    success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
    error: "border-red-500/30 bg-red-500/10 text-red-200",
  };

  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneMap[tone] || toneMap.neutral}`}>
      {title ? <p className="text-sm font-semibold text-white">{title}</p> : null}
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
      eyebrow="Account recovery"
      title="Reset your password without the awkward extra steps."
      description="A top-tier reader site should let people recover access quickly, clearly, and without exposing raw tokens or confusing utility copy."
      asideTitle="What happens next"
      asideBody={
        hasToken
          ? "We detected a reset link from your email. Set a new password here, then we will send you back to sign in."
          : "Enter your account email and we will send a fresh reset link. For security, the message looks the same whether the address exists or not."
      }
    >
      <div className="space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-200/80">
            Password reset
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-white">
            {hasToken ? "Set a new password" : "Need a fresh reset email?"}
          </h2>
          <p className="mt-3 text-sm leading-6 text-neutral-400">
            {hasToken
              ? "Your reset link is already loaded from the email you opened. Enter the new password you want to use."
              : "If the previous link expired or opened on another device, send yourself a new one here."}
          </p>
        </div>

        {hasToken ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-neutral-300">
              Reset link detected from your email. No manual token entry needed.
            </div>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Choose a new password"
              autoComplete="new-password"
              className="w-full rounded-2xl border border-white/10 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-emerald-400/50"
            />
            <button
              type="button"
              disabled={submitting}
              onClick={handleResetPassword}
              className="w-full rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Saving your new password..." : "Save new password"}
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                setToken("");
                setPassword("");
                setStatus(null);
              }}
              className="w-full rounded-full border border-white/12 px-5 py-3 text-sm font-semibold text-neutral-200 transition hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Use a fresh reset email instead
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
              className="w-full rounded-2xl border border-white/10 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-emerald-400/50"
            />
            <button
              type="button"
              disabled={submitting}
              onClick={handleSendResetLink}
              className="w-full rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Sending reset email..." : "Email me a reset link"}
            </button>
          </div>
        )}

        <StatusNotice tone={status?.tone} title={status?.title} message={status?.message} />

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-6 text-neutral-400">
          Signed in already? Head back to{" "}
          <Link href="/account" className="font-semibold text-white hover:text-emerald-200">
            your account
          </Link>
          . Need help with a stuck email? Reach our{" "}
          <Link href="/support" className="font-semibold text-white hover:text-emerald-200">
            support team
          </Link>
          .
        </div>
      </div>
    </EmailLinkActionShell>
  );
}

export default function ResetPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#050816]" />}>
      <ResetPageContent />
    </Suspense>
  );
}
