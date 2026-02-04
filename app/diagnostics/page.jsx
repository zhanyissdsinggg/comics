"use client";

import { useEffect, useState } from "react";
import SiteHeader from "../../components/layout/SiteHeader";
import { apiGet } from "../../lib/apiClient";

export default function DiagnosticsPage() {
  const [health, setHealth] = useState(null);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([apiGet("/api/health", { cacheMs: 0, bust: true }), apiGet("/api/meta/version")])
      .then(([healthResp, metaResp]) => {
        if (!mounted) {
          return;
        }
        setHealth(healthResp);
        setMeta(metaResp.ok ? metaResp.data : null);
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <SiteHeader />
      <div className="mx-auto max-w-4xl px-4 py-12 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Diagnostics</h1>
          <p className="mt-2 text-sm text-neutral-400">Backend health & version status.</p>
        </div>
        {loading ? (
          <div className="rounded-2xl border border-neutral-900 bg-neutral-900/50 p-6 text-sm text-neutral-400">
            Checking...
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-neutral-900 bg-neutral-900/50 p-6">
              <h2 className="text-sm font-semibold">Health</h2>
              <p className="mt-2 text-xs text-neutral-400">
                {health?.ok ? "OK" : `Failed (${health?.error || "unknown"})`}
              </p>
            </div>
            <div className="rounded-2xl border border-neutral-900 bg-neutral-900/50 p-6">
              <h2 className="text-sm font-semibold">Backend Version</h2>
              <p className="mt-2 text-xs text-neutral-400">
                {meta ? `${meta.name} v${meta.version}` : "Unavailable"}
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
