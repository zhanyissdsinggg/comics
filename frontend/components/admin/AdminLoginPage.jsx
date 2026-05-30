"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useAdminAuth } from "./AuthContext";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAdminAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    const result = await login(email, password, totpCode);

    if (result.success) {
      const next = searchParams?.get("next") || "/admin";
      if (next.startsWith("/admin")) {
        router.push(next);
      } else {
        router.push("/admin");
      }
    } else {
      setError(
        result.error ||
          "Sign-in failed. Check the admin email, password, or verification code.",
      );
    }

    setIsLoading(false);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--gush-page-bg)] px-4 py-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[24rem] bg-[radial-gradient(circle_at_16%_0%,rgba(255,79,154,0.12),transparent_24%),radial-gradient(circle_at_84%_4%,rgba(103,232,249,0.1),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,255,255,0.52),transparent_100%)]" />

      <div className="relative w-full max-w-md rounded-[32px] border border-[color:var(--gush-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(255,243,249,0.94))] p-8 shadow-[0_28px_64px_rgba(49,25,77,0.09)] ring-1 ring-white/80 backdrop-blur-xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[22px] border border-[color:var(--gush-border-strong)] bg-[linear-gradient(180deg,#ffffff,#fff1f8)] text-slate-950 shadow-[0_14px_34px_rgba(255,79,154,0.12)]">
            <ShieldCheck className="size-8" />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
            Admin
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            Sign in to Gush Control
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Use the admin email and password assigned to your operator account.
            Role access and two-step verification are resolved from the admin
            member directory.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <input
            type="text"
            name="username"
            autoComplete="username"
            value="admin"
            readOnly
            tabIndex={-1}
            aria-hidden="true"
            className="sr-only"
          />

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">
              Admin email
            </span>
            <input
              id="adminEmail"
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              className="h-12 w-full rounded-[20px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)]/76 px-4 text-sm text-slate-950 outline-none transition-[background-color,border-color,box-shadow] duration-200 focus:border-[color:var(--gush-border-strong)] focus:bg-white focus:ring-[3px] focus:ring-slate-200/70"
              placeholder="Enter an email address, for example admin@example.com"
              required
              disabled={isLoading}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">
              Admin password
            </span>
            <input
              id="adminPassword"
              name="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              className="h-12 w-full rounded-[20px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)]/76 px-4 text-sm text-slate-950 outline-none transition-[background-color,border-color,box-shadow] duration-200 focus:border-[color:var(--gush-border-strong)] focus:bg-white focus:ring-[3px] focus:ring-slate-200/70"
              placeholder="Enter the current password"
              required
              disabled={isLoading}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">
              6-digit verification code
            </span>
            <input
              id="totpCode"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={totpCode}
              onChange={(event) => {
                const next = event.target.value.replace(/\D/g, "").slice(0, 6);
                setTotpCode(next);
              }}
              autoComplete="one-time-code"
              className="h-12 w-full rounded-[20px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)]/76 px-4 text-sm text-slate-950 outline-none transition-[background-color,border-color,box-shadow] duration-200 focus:border-[color:var(--gush-border-strong)] focus:bg-white focus:ring-[3px] focus:ring-slate-200/70"
              placeholder="If two-step verification is enabled, enter the latest 6-digit code"
              disabled={isLoading}
            />
          </label>

          {error ? (
            <div className="rounded-[20px] border border-red-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(254,242,242,0.95))] px-4 py-3 text-sm text-red-700 shadow-[0_8px_18px_rgba(15,23,42,0.03)] ring-1 ring-black/[0.02]">
              {error}
            </div>
          ) : null}

          <Button type="submit" className="h-12 w-full" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <div className="mt-6 rounded-[22px] border border-[color:var(--gush-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,245,247,0.92))] px-4 py-4 text-sm leading-6 text-slate-600 shadow-[0_8px_18px_rgba(15,23,42,0.03)] ring-1 ring-black/[0.02]">
          Admin sessions are stored in secure cookies. If your operator account
          uses two-step verification, keep the latest 6-digit code ready before
          continuing.
        </div>
      </div>
    </div>
  );
}
