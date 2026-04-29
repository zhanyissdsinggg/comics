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
      "rounded-[22px] border-2 border-black bg-[#00E5FF] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
    success:
      "rounded-[22px] border-2 border-black bg-[#00C767] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
    error:
      "rounded-[22px] border-2 border-black bg-[#FF007A] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
  };

  return (
    <div
      className={`px-4 py-3 ${toneMap[tone] || toneMap.neutral}`}
    >
      {title ? (
        <p className="text-sm font-black uppercase tracking-[0.14em]">
          {title}
        </p>
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
    "w-full rounded-[20px] border-2 border-white/20 bg-black px-4 py-3 text-sm font-semibold text-white outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform duration-150 ease-out placeholder:text-white/35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFE500]";

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
        message: "If that address can receive account mail, a fresh link is on the way.",
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
      asideBody={
        hasToken ? "Check the link." : "Send a new link."
      }
    >
      <div className="space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-white/55">
            Account confirmation
          </p>
          <h2 className="mt-3 font-display text-2xl font-black uppercase tracking-[-0.05em] text-white">
            {hasToken
              ? "Verifying your email link"
              : "Send another email?"}
          </h2>
          <p className="mt-3 text-sm leading-6 text-white/68">
            {hasToken ? "Checking your account." : "Enter your email."}
          </p>
        </div>

        {hasToken ? (
          <div className="space-y-4">
            <StorefrontInfoCard
              title="Link loaded"
              description=""
              className="border-[#00E5FF]/50 bg-[#00E5FF]/12"
            />
            <p className="text-sm font-semibold leading-6 text-white/68">
              No code field required.
            </p>
            <button
              type="button"
              disabled={submitting}
              onClick={handleVerify}
              className={`w-full disabled:cursor-not-allowed disabled:opacity-60 ${storefrontPrimaryButtonClass}`}
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
              onClick={handleSendVerifyLink}
              className={`w-full disabled:cursor-not-allowed disabled:opacity-60 ${storefrontPrimaryButtonClass}`}
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
        <div className="min-h-screen overflow-hidden bg-black text-white" />
      }
    >
      <VerifyPageContent />
    </Suspense>
  );
}
