"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAdminAuth } from "./AuthContext";
import { Button } from "@/components/ui/button";

export default function AdminLoginPage() {
  const [adminKey, setAdminKey] = useState("");
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

    const result = await login(adminKey, totpCode);

    if (result.success) {
      const next = searchParams?.get("next") || "/admin";
      if (next.startsWith("/admin")) {
        router.push(next);
      } else {
        router.push("/admin");
      }
    } else {
      setError(result.error || "Sign-in failed.");
    }

    setIsLoading(false);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--gush-page-bg)] px-4 py-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[24rem] bg-[radial-gradient(circle_at_14%_0%,rgba(47,88,198,0.08),transparent_22%),radial-gradient(circle_at_86%_4%,rgba(255,255,255,0.7),transparent_18%),linear-gradient(180deg,rgba(248,245,239,0.96),rgba(244,241,234,0.2))]" />

      <div className="relative w-full max-w-md rounded-[32px] border border-black/8 bg-white/92 p-8 shadow-[var(--gush-shadow-panel)]">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[22px] border border-[rgba(47,88,198,0.12)] bg-[rgba(47,88,198,0.08)] text-[var(--gush-accent,#2f58c6)]">
            <ShieldCheck className="size-8" />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
            Admin
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            Sign in to the publishing workspace
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Use your admin key to manage stories, creator credits, and editorial surfaces.
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
            <span className="text-sm font-medium text-slate-700">Admin key</span>
            <input
              id="adminKey"
              name="password"
              type="password"
              value={adminKey}
              onChange={(event) => setAdminKey(event.target.value)}
              autoComplete="current-password"
              className="h-12 w-full rounded-[20px] border border-black/8 bg-[rgba(250,247,241,0.9)] px-4 text-sm text-slate-950 outline-none transition focus:border-[var(--gush-accent,#2f58c6)]"
              placeholder="Enter your admin key"
              required
              disabled={isLoading}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Authenticator code</span>
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
              className="h-12 w-full rounded-[20px] border border-black/8 bg-[rgba(250,247,241,0.9)] px-4 text-sm text-slate-950 outline-none transition focus:border-[var(--gush-accent,#2f58c6)]"
              placeholder="Optional 6-digit code"
              disabled={isLoading}
            />
          </label>

          {error ? (
            <div className="rounded-[20px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <Button type="submit" className="h-12 w-full" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <div className="mt-6 rounded-[22px] border border-black/6 bg-[rgba(250,247,241,0.82)] px-4 py-4 text-sm leading-6 text-slate-600">
          Admin sessions are stored with secure cookies. If two-factor access is enabled, add the current authenticator code before you continue.
        </div>
      </div>
    </div>
  );
}
