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
      "border-[3px] border-black bg-[#dffcff] text-black/70",
    success: "border-[3px] border-black bg-[#d9fff0] text-black/70",
    error: "border-[3px] border-black bg-[#ffe7ec] text-black/70",
  };

  return (
    <div
      className={`border-[3px] px-4 py-3 shadow-[5px_5px_0_0_rgba(0,0,0,1)] ${toneMap[tone] || toneMap.neutral}`}
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

function VerifyPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(null);
  const [autoTriggered, setAutoTriggered] = useState(false);
  const inputClassName =
    "w-full border-[3px] border-black bg-white px-4 py-3 text-sm font-medium text-black outline-none transition placeholder:text-black/32 focus:translate-x-0.5 focus:translate-y-0.5 focus:bg-[#fffef7] focus:shadow-none";

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
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-black/55">
            Account confirmation
          </p>
          <h2 className="mt-3 font-display text-2xl font-black uppercase tracking-[-0.05em] text-black">
            {hasToken
              ? "Verifying your email link"
              : "Need another verification email?"}
          </h2>
          <p className="mt-3 text-sm leading-6 text-black/68">
            {hasToken
              ? "Keep this page open for a moment while we confirm your account."
              : "Enter your account email and we will send the latest confirmation link."}
          </p>
        </div>

        {hasToken ? (
          <div className="space-y-4">
            <StorefrontInfoCard
              title="Verification link loaded"
              description="Verification link loaded from your email. No code field required."
              className="bg-[#dffcff]"
            />
            <button
              type="button"
              disabled={submitting}
              onClick={handleVerify}
              className={`w-full disabled:cursor-not-allowed disabled:opacity-60 ${storefrontPrimaryButtonClass} bg-[#00e5ff] text-black hover:bg-[#00b7d1]`}
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
              className={`w-full disabled:cursor-not-allowed disabled:opacity-60 ${storefrontPrimaryButtonClass} bg-[#00e5ff] text-black hover:bg-[#00b7d1]`}
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

        <StorefrontInfoCard title="Already confirmed?" className="bg-[#fff6cf]">
          <p className="mt-3 text-sm leading-6 text-black/70">
            Go to{" "}
            <Link
              href="/account"
              className="font-semibold text-black underline decoration-black/25 underline-offset-4 hover:text-[#00b7d1]"
            >
              your account
            </Link>
            . Need help with a missing email? Contact{" "}
            <Link
              href="/support"
              className="font-semibold text-black underline decoration-black/25 underline-offset-4 hover:text-[#00b7d1]"
            >
              us
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
        <div className="min-h-screen overflow-hidden bg-black text-black" />
      }
    >
      <VerifyPageContent />
    </Suspense>
  );
}
