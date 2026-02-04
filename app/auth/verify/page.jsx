"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import SiteHeader from "../../../components/layout/SiteHeader";
import { apiPost } from "../../../lib/apiClient";

export default function VerifyPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [token, setToken] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    const queryToken = searchParams.get("token") || "";
    if (queryToken) {
      setToken(queryToken);
    }
  }, [searchParams]);

  const handleVerify = async () => {
    setStatus("");
    const response = await apiPost("/api/auth/verify", { token });
    if (response.ok) {
      setStatus("Email verified.");
      setTimeout(() => router.push("/account"), 800);
    } else {
      setStatus(response.error || "Verify failed.");
    }
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <SiteHeader />
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="rounded-3xl border border-neutral-900 bg-neutral-900/50 p-6 space-y-4">
          <h1 className="text-xl font-semibold">Verify email</h1>
          <p className="text-sm text-neutral-400">Paste your verification token.</p>
          <input
            value={token}
            onChange={(event) => setToken(event.target.value)}
            className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
            placeholder="Verification token"
          />
          {status ? <div className="text-xs text-emerald-300">{status}</div> : null}
          <button
            type="button"
            onClick={handleVerify}
            className="w-full rounded-full bg-white px-4 py-2 text-sm font-semibold text-neutral-900"
          >
            Verify
          </button>
        </div>
      </div>
    </main>
  );
}
