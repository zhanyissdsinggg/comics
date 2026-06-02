"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import EmailLinkActionShell from "../../../components/auth/EmailLinkActionShell";
import {
  StorefrontInfoCard,
  storefrontBadgeClass,
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
        message: "Use your account email.",
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
          "If that address can receive account mail, a fresh link is on the way.",
      });
    } else {
      setStatus({
        tone: "error",
        title: "We could not send the email",
        message: response.error || "Retry in a moment.",
      });
    }
    setSubmitting(false);
  };

  const handleVerify = async () => {
    if (!token) {
      setStatus({
        tone: "error",
        title: "Verification link missing",
        message: "Request a new email below.",
      });
      return;
    }

    setSubmitting(true);
    setStatus({
      tone: "neutral",
      title: "Verifying your email",
      message: "This only takes a moment.",
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
          ? "Request a new verification email below."
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
      description=""
      asideTitle="Next"
      asideBody={hasToken ? "Check the link." : "Send a new link."}
    >
      <div className="space-y-6">
        <div>
          <p className={storefrontBadgeClass}>
            Account confirmation
          </p>
          <h2 className="mt-4 font-display text-[1.9rem] font-semibold leading-[0.94] tracking-[-0.06em] text-white sm:text-[2.15rem]">
            {hasToken ? "Verifying your email link" : "Send another email?"}
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-7 text-white/68">
            {hasToken ? "Checking your account." : "Enter your email."}
          </p>
        </div>

        {hasToken ? (
          <div className="space-y-4">
            <StorefrontInfoCard
              eyebrow="Ready"
              title="Verification link loaded"
              description="No extra code needed. We only need to confirm this token."
              className="border-cyan-300/16 bg-[linear-gradient(135deg,rgba(34,211,238,0.08)_0%,rgba(255,255,255,0.04)_100%)]"
            />
            <p className="text-sm font-semibold leading-6 text-white/68">
              No code field required.
            </p>
            <button
              type="button"
              disabled={submitting}
              onClick={handleVerify}
              className={`w-full min-h-[48px] disabled:cursor-not-allowed disabled:opacity-60 ${storefrontPrimaryButtonClass}`}
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
              onClick={handleSendVerifyLink}
              className={`w-full min-h-[48px] disabled:cursor-not-allowed disabled:opacity-60 ${storefrontPrimaryButtonClass}`}
            >
              {submitting ? "Sending..." : "Send email"}
            </button>
          </div>
        )}

        <StatusNotice
          tone={status?.tone}
          title={status?.title}
          message={status?.message}
        />

        <StorefrontInfoCard title="More">
          <p className="mt-3 text-sm leading-6 text-white/70">
            Go to{" "}
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
        </StorefrontInfoCard>
      </div>
    </EmailLinkActionShell>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <StorefrontPage accentClass="from-[rgba(103,232,249,0.16)] via-[rgba(167,139,250,0.08)] to-[rgba(255,79,154,0.08)]">
          <div className="mx-auto w-full max-w-[960px]">
            <div className="h-56 animate-pulse rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(22,18,30,0.92)_0%,rgba(13,12,23,0.86)_100%)] shadow-[0_24px_58px_rgba(8,6,20,0.34)]" />
          </div>
        </StorefrontPage>
      }
    >
      <VerifyPageContent />
    </Suspense>
  );
}
