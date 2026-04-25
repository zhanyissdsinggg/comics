"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import EmailLinkActionShell from "../../../components/auth/EmailLinkActionShell";
import {
  StorefrontInfoCard,
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
} from "../../../components/common/StorefrontPagePrimitives";
import { apiPost } from "../../../lib/apiClient";

function StatusNotice({ tone = "neutral", title = "", message = "" }) {
  if (!title && !message) {
    return null;
  }

  const toneMap = {
    neutral:
      "rounded-[22px] border border-sky-200/70 bg-sky-50 text-black/70 shadow-[0_12px_24px_rgba(125,211,252,0.16)]",
    success:
      "rounded-[22px] border border-emerald-200/70 bg-emerald-50 text-black/70 shadow-[0_12px_24px_rgba(16,185,129,0.12)]",
    error:
      "rounded-[22px] border border-rose-200/70 bg-[linear-gradient(180deg,#fff6f8_0%,#fff1f3_100%)] text-black/70 shadow-[0_12px_24px_rgba(244,63,94,0.1)]",
  };

  return (
    <div
      className={`px-4 py-3 ${toneMap[tone] || toneMap.neutral}`}
    >
      {title ? (
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-black">
          {title}
        </p>
      ) : null}
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
    "w-full rounded-[20px] border border-black/10 bg-white px-4 py-3 text-sm font-medium text-black outline-none shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-black/32 focus:border-black/18 focus:bg-[#fcfcfd] focus:shadow-[0_12px_28px_rgba(15,23,42,0.1)]";

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
        message: shouldRefreshLink
          ? "Request a new email below."
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
      description=""
      asideTitle="Next"
      asideBody={
        hasToken ? "Set a new password." : "Send a reset link."
      }
    >
      <div className="space-y-6">
        <div className="relative">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-black/55">
            Password reset
          </p>
          <h2 className="mt-3 font-display text-2xl font-black uppercase tracking-[-0.05em] text-black">
            {hasToken ? "Choose a new password" : "Send another email?"}
          </h2>
          <p className="mt-3 text-sm leading-6 text-black/68">
            {hasToken ? "Link ready." : "Enter your email."}
          </p>
        </div>

        {hasToken ? (
          <div className="space-y-4">
            <StorefrontInfoCard
              title="Link loaded"
              description=""
              className="border-black/10 bg-[#f6f7f9]"
            />
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
              className={`w-full disabled:cursor-not-allowed disabled:opacity-60 ${storefrontPrimaryButtonClass}`}
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
              className={`w-full disabled:cursor-not-allowed disabled:opacity-60 ${storefrontSecondaryButtonClass}`}
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
              className={inputClassName}
            />
            <button
              type="button"
              disabled={submitting}
              onClick={handleSendResetLink}
              className={`w-full disabled:cursor-not-allowed disabled:opacity-60 ${storefrontPrimaryButtonClass}`}
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

        <StorefrontInfoCard title="More" className="border-black/10 bg-[#f6f7f9]">
          <p className="mt-3 text-sm leading-6 text-black/70">
            Go to{" "}
            <Link
              href="/account"
              className="font-semibold text-black underline decoration-black/25 underline-offset-4 hover:text-black/68"
            >
              Account
            </Link>
            .{" "}
            <Link
              href="/support"
              className="font-semibold text-black underline decoration-black/25 underline-offset-4 hover:text-black/68"
            >
              Support
            </Link>
            .
          </p>
        </StorefrontInfoCard>
      </div>
    </EmailLinkActionShell>
  );
}

export default function ResetPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen overflow-hidden bg-[#f6f7f9] text-black" />
      }
    >
      <ResetPageContent />
    </Suspense>
  );
}
