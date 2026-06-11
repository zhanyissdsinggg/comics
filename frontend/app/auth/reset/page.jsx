"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiPost } from "../../../lib/apiClient";
import { siteConfig } from "../../../lib/siteConfig";

const inputClass =
  "h-12 w-full rounded-2xl border border-white/10 bg-[#111421]/82 px-4 text-base font-semibold text-white outline-none transition placeholder:text-white/34 focus:border-[#EC4899]/70 focus:ring-2 focus:ring-[#EC4899]/18 sm:h-14";
const primaryButtonClass =
  "inline-flex items-center justify-center rounded-2xl bg-[linear-gradient(90deg,#EC4899_0%,#A855F7_52%,#7C3AED_100%)] px-5 text-sm font-black text-white shadow-[0_18px_44px_rgba(168,85,247,0.28)] transition hover:scale-[1.01]";
const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.035] px-5 text-sm font-black text-white/78 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white";
const noticeBaseClass =
  "rounded-2xl border px-4 py-3.5 shadow-[0_18px_44px_rgba(0,0,0,0.22)]";

function ResetRouteChrome() {
  useEffect(() => {
    document.body.classList.add("gush-auth-reset-route");

    return () => {
      document.body.classList.remove("gush-auth-reset-route");
    };
  }, []);

  return (
    <style jsx global>{`
      body.gush-auth-reset-route .gush-app-shell > header,
      body.gush-auth-reset-route .gush-app-shell > footer {
        display: none;
      }

      body.gush-auth-reset-route [data-mobile-bottom-nav="1"] {
        display: none;
      }

      body.gush-auth-reset-route.has-mobile-bottom-nav {
        padding-bottom: 0;
      }
    `}</style>
  );
}

function ResetActionShell({ children }) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#070A13] font-[Inter,Geist,Satoshi,'SF_Pro_Display',system-ui,sans-serif] text-white">
      <ResetRouteChrome />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-12rem] top-[-10rem] h-[30rem] w-[30rem] rounded-full bg-[#EC4899]/12 blur-3xl" />
        <div className="absolute right-[-10rem] bottom-[-12rem] h-[32rem] w-[32rem] rounded-full bg-[#7C3AED]/12 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(9,11,22,0.18),rgba(7,10,19,0.98))]" />
      </div>

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1120px] flex-col justify-center px-5 py-8 sm:px-8 lg:px-12">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(360px,0.72fr)] lg:items-center">
          <section className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.26em] text-white/46">
              Account access
            </p>
            <h1 className="mt-4 max-w-[560px] text-[2.45rem] font-black leading-[0.98] tracking-[-0.06em] text-white sm:text-[3.8rem]">
              Reset your password
            </h1>
            <p className="mt-5 max-w-[560px] text-base leading-7 text-white/68 sm:text-lg sm:leading-8">
              Request a fresh reset email or set a new password from the secure link in your URL.
            </p>
          </section>

          <section className="min-w-0 rounded-[28px] border border-white/12 bg-white/[0.045] p-5 text-white shadow-[0_30px_90px_rgba(0,0,0,0.34)] backdrop-blur-2xl sm:p-8">
            {children}
          </section>
        </div>

        <footer className="mt-8 flex flex-col gap-3 text-xs text-white/46 sm:flex-row sm:items-center sm:justify-between">
          <p>Copyright 2026 {siteConfig.companyName}</p>
          <nav className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/support" className="min-h-11 transition-colors hover:text-white">
              Support
            </Link>
            <Link href="/terms-of-service" className="min-h-11 transition-colors hover:text-white">
              Terms
            </Link>
            <Link href="/privacy-policy" className="min-h-11 transition-colors hover:text-white">
              Privacy
            </Link>
          </nav>
        </footer>
      </main>
    </div>
  );
}

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
      className={`${noticeBaseClass} ${toneMap[tone] || toneMap.neutral}`}
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
    <ResetActionShell>
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
              className={`min-h-[52px] w-full disabled:cursor-not-allowed disabled:opacity-60 ${primaryButtonClass}`}
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
              className={`min-h-[52px] w-full disabled:cursor-not-allowed disabled:opacity-60 ${secondaryButtonClass}`}
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
              className={`min-h-[52px] w-full disabled:cursor-not-allowed disabled:opacity-60 ${primaryButtonClass}`}
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
    </ResetActionShell>
  );
}

export default function ResetPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#070A13] px-5 py-8 text-white">
          <div className="mx-auto mt-24 h-56 w-full max-w-[640px] animate-pulse rounded-[32px] border border-white/10 bg-white/[0.045]" />
        </div>
      }
    >
      <ResetPageContent />
    </Suspense>
  );
}
