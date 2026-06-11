"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import EmailLinkActionShell from "../../../components/auth/EmailLinkActionShell";
import {
  storefrontInputClass,
  storefrontNoticeClass,
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
} from "../../../components/common/StorefrontPagePrimitives";
import { apiPost } from "../../../lib/apiClient";
import { StorefrontPage } from "../../../components/storefront/StorefrontScaffold";

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
    <div
      className={`${storefrontNoticeClass} px-4 py-3.5 ${toneMap[tone] || toneMap.neutral}`}
    >
      {title ? (
        <p className="text-sm font-semibold tracking-[-0.02em]">{title}</p>
      ) : null}
      {message ? <p className="mt-1.5 text-sm leading-6 text-white/72">{message}</p> : null}
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
    <EmailLinkActionShell
      eyebrow="Account access"
      title="Reset your password"
      description="Request a fresh reset email or set a new password from the secure link in your URL."
      minimal
    >
      <div className="space-y-5">
        {hasToken ? (
          <div className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Choose a new password"
              autoComplete="new-password"
              className={storefrontInputClass}
            />
            <button
              type="button"
              disabled={submitting}
              onClick={handleResetPassword}
              className={`w-full min-h-[48px] disabled:cursor-not-allowed disabled:opacity-60 ${storefrontPrimaryButtonClass}`}
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
              className={`w-full min-h-[48px] disabled:cursor-not-allowed disabled:opacity-60 ${storefrontSecondaryButtonClass}`}
            >
              Send a new email
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
              className={storefrontInputClass}
            />
            <button
              type="button"
              disabled={submitting}
              onClick={handleSendResetLink}
              className={`w-full min-h-[48px] disabled:cursor-not-allowed disabled:opacity-60 ${storefrontPrimaryButtonClass}`}
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
              href="/account"
              className="font-semibold text-[#00E5FF] underline decoration-[#00E5FF]/35 underline-offset-4 hover:text-[#7DF4FF]"
            >
              Account
            </Link>
            .{" "}
            <Link
              href="/support"
              className="font-semibold text-[#FFE500] underline decoration-[#FFE500]/35 underline-offset-4 hover:text-[#FFF27A]"
            >
              Support
            </Link>
            .
          </p>
        </div>
      </div>
    </EmailLinkActionShell>
  );
}

export default function ResetPage() {
  return (
    <Suspense
      fallback={
        <StorefrontPage accentClass="from-[rgba(103,232,249,0.14)] via-[rgba(167,139,250,0.08)] to-[rgba(255,79,154,0.1)]">
          <div className="mx-auto w-full max-w-[960px]">
            <div className="h-56 animate-pulse rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(22,18,30,0.92)_0%,rgba(13,12,23,0.86)_100%)] shadow-[0_24px_58px_rgba(8,6,20,0.34)]" />
          </div>
        </StorefrontPage>
      }
    >
      <ResetPageContent />
    </Suspense>
  );
}
