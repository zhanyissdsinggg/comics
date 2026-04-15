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
    neutral:
      "border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] text-slate-600",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    error: "border-red-200 bg-red-50 text-red-600",
  };

  return (
    <div
      className={`rounded-2xl border px-4 py-3 ${toneMap[tone] || toneMap.neutral}`}
    >
      {title ? (
        <p className="text-sm font-semibold text-slate-950">{title}</p>
      ) : null}
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
  const inputClassName =
    "w-full rounded-2xl border border-[color:var(--gush-border)] bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[color:var(--gush-border-strong)] focus:ring-4 focus:ring-slate-200/80";
  const primaryButtonClass =
    "w-full rounded-full bg-[color:var(--gush-ink-strong)] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(15,23,42,0.08)] transition hover:bg-black/82 disabled:cursor-not-allowed disabled:opacity-60";
  const secondaryButtonClass =
    "w-full rounded-full border border-[color:var(--gush-border)] bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)] disabled:cursor-not-allowed disabled:opacity-60";

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
        message:
          "Use the email on your account so we can send the newest verification link.",
      });
      return;
    }

    setSubmitting(true);
    setStatus(null);
    const response = await apiPost("/api/auth/request-verify", {
      email: normalizedEmail,
    });
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
      message:
        "This usually takes a moment, then we will send you to your account.",
    });

    const response = await apiPost("/api/auth/verify", { token });
    if (response.ok) {
      setStatus({
        tone: "success",
        title: "Email verified",
        message: "Your account is confirmed. Taking you to your account now.",
      });
      setTimeout(() => router.push("/account"), 1100);
    } else {
      const message =
        response.error || "This verification link is no longer valid.";
      const shouldRefreshLink = /expired|invalid/i.test(message);
      setStatus({
        tone: "error",
        title: shouldRefreshLink
          ? "This link has expired"
          : "We could not verify this email",
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
      eyebrow="Account access"
      title="Confirm your email"
      description="One quick step and your account is ready."
      asideTitle="What to do"
      asideBody={
        hasToken
          ? "We found the verification link from your email and are checking it now."
          : "If your last email expired, send a new one and open the newest link from your inbox."
      }
    >
      <div className="space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
            Account confirmation
          </p>
          <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-slate-950">
            {hasToken
              ? "Verifying your email link"
              : "Need another verification email?"}
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {hasToken
              ? "Keep this page open for a moment while we confirm your account."
              : "Enter your account email and we will send the latest confirmation link."}
          </p>
        </div>

        {hasToken ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-4 py-3 text-sm text-slate-700">
              Verification link loaded from your email. No code field required.
            </div>
            <button
              type="button"
              disabled={submitting}
              onClick={handleVerify}
              className={primaryButtonClass}
            >
              {submitting ? "Verifying..." : "Verify again"}
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                setToken("");
                setStatus(null);
              }}
              className={secondaryButtonClass}
            >
              Send me a new verification email
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
              onClick={handleSendVerifyLink}
              className={primaryButtonClass}
            >
              {submitting ? "Sending..." : "Send verification email"}
            </button>
          </div>
        )}

        <StatusNotice
          tone={status?.tone}
          title={status?.title}
          message={status?.message}
        />

        <div className="rounded-2xl border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-4 py-4 text-sm leading-6 text-slate-600">
          Already confirmed? Go to{" "}
          <Link
            href="/account"
            className="font-semibold text-slate-950 hover:text-slate-700"
          >
            your account
          </Link>
          . Need help with a missing email? Contact{" "}
          <Link
            href="/support"
            className="font-semibold text-slate-950 hover:text-slate-700"
          >
            us
          </Link>
          .
        </div>
      </div>
    </EmailLinkActionShell>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="gush-home-shell min-h-screen overflow-hidden">
          <div className="gush-page-ambient" />
        </div>
      }
    >
      <VerifyPageContent />
    </Suspense>
  );
}
