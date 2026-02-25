"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import SiteHeader from "../../../components/layout/SiteHeader";
import { apiPost } from "../../../lib/apiClient";

function ResetPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    const queryToken = searchParams.get("token") || "";
    if (queryToken) {
      setToken(queryToken);
    }
  }, [searchParams]);

  const handleReset = async () => {
    setStatus("");
    const response = await apiPost("/api/auth/reset", { token, password });
    if (response.ok) {
      setStatus("Password updated.");
      setTimeout(() => router.push("/"), 800);
    } else {
      setStatus(response.error || "Reset failed.");
    }
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <SiteHeader />
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="rounded-3xl border border-neutral-900 bg-neutral-900/50 p-6 space-y-4">
          <h1 className="text-xl font-semibold">Reset password</h1>
          <p className="text-sm text-neutral-400">Enter reset token and a new password.</p>
          <input
            value={token}
            onChange={(event) => setToken(event.target.value)}
            className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
            placeholder="Reset token"
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
            placeholder="New password"
          />
          {status ? <div className="text-xs text-emerald-300">{status}</div> : null}
          <button
            type="button"
            onClick={handleReset}
            className="w-full rounded-full bg-white px-4 py-2 text-sm font-semibold text-neutral-900"
          >
            Reset
          </button>
        </div>
      </div>
    </main>
  );
}

export default function ResetPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPageContent />
    </Suspense>
  );
}
