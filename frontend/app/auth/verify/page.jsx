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

function VerifyPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(null);
  const [autoTriggered, setAutoTriggered] = useState(false);

  useEffect(() => {
    const queryToken = String(searchParams.get("token") || "").trim();
    setToken(queryToken);
    setAutoTriggered(false);
  }, [searchParams]);

  const hasToken = Boolean(token);

  const handleSendVerifyLink = async () => {
    const normalizedEmail = String(email || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setStatus({
        tone: "error",
        title: "Enter a valid email",
        message: "Use the email on your account so we can send the newest verification link.",
      });
      return;
    }

    setSubmitting(true);
    setStatus(null);
    const response = await apiPost("/api/auth/request-verify", { email: normalizedEmail });
    if (response.ok) {
      setStatus({
        tone: "success",
        title: "Verification email sent",
        message:
          "If that address can receive account mail, a fresh verification link is on the way. Open the newest email on this device to finish instantly.",
      });
    } else {
      setStatus({
        tone: "error",
        title: "We could not send the email",
        message: response.error || "Please wait a moment and try again.",
      });
    }
    setSubmitting(false);
  };

  const handleVerify = async () => {
    if (!token) {
      setStatus({
        tone: "error",
        title: "Verification link missing",
        message: "Request a fresh email below and open the newest link.",
      });
      return;
    }

    setSubmitting(true);
    setStatus({
      tone: "neutral",
      title: "Verifying your email",
      message: "This usually takes a moment, then we will send you to your account.",
    });

    const response = await apiPost("/api/auth/verify", { token });
    if (response.ok) {
      setStatus({
        tone: "success",
        title: "Email verified",
        message: "Your account is confirmed. Redirecting you to your account dashboard now.",
      });
      setTimeout(() => router.push("/account"), 1100);
    } else {
      const message = response.error || "This verification link is no longer valid.";
      const shouldRefreshLink = /expired|invalid/i.test(message);
      setStatus({
        tone: "error",
        title: shouldRefreshLink ? "This link has expired" : "We could not verify this email",
        message: shouldRefreshLink
          ? "Request a fresh verification email below and open the newest link."
          : message,
      });
      if (shouldRefreshLink) {
        setToken("");
      }
    }
    setSubmitting(false);
  };

  useEffect(() => {
    if (!token || autoTriggered) {
      return;
    }
    setAutoTriggered(true);
    void handleVerify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, autoTriggered]);

  return (
    <EmailLinkActionShell
      eyebrow="Email verification"
      title="Turn verification into one clean click."
      description="Reader accounts feel more trustworthy when email confirmation behaves like a polished consumer product, not like a maintenance screen."
      asideTitle="What happens next"
      asideBody={
        hasToken
          ? "We loaded the verification link from your email and started processing it automatically."
          : "If your earlier email expired, send a fresh verification message and reopen the newest link from your inbox."
      }
    >
      <div className="space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-200/80">
            Account confirmation
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-white">
            {hasToken ? "We are verifying your email" : "Need another verification email?"}
          </h2>
          <p className="mt-3 text-sm leading-6 text-neutral-400">
            {hasToken
              ? "Keep this page open for a second while we confirm your account."
              : "Enter your account email and we will send the latest confirmation link."}
          </p>
        </div>

        {hasToken ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-neutral-300">
              Verification link detected from your email. No code field required.
            </div>
            <button
              type="button"
              disabled={submitting}
              onClick={handleVerify}
              className="w-full rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Verifying email..." : "Verify again"}
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                setToken("");
                setStatus(null);
              }}
              className="w-full rounded-full border border-white/12 px-5 py-3 text-sm font-semibold text-neutral-200 transition hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Send me a fresh verification email
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
              onClick={handleSendVerifyLink}
              className="w-full rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Sending verification email..." : "Send verification email"}
            </button>
          </div>
        )}

        <StatusNotice tone={status?.tone} title={status?.title} message={status?.message} />

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-6 text-neutral-400">
          Already verified? Go to{" "}
          <Link href="/account" className="font-semibold text-white hover:text-emerald-200">
            your account
          </Link>
          . Need a hand with delivery issues? Contact{" "}
          <Link href="/support" className="font-semibold text-white hover:text-emerald-200">
            support
          </Link>
          .
        </div>
      </div>
    </EmailLinkActionShell>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#050816]" />}>
      <VerifyPageContent />
    </Suspense>
  );
}
