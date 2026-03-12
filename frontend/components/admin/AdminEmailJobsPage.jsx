"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "./AuthContext";
import { adminGet, adminPost } from "../../lib/adminApiClient";

const STATUS_CLASS_MAP = {
  FAILED: "border-red-200 bg-red-50 text-red-700",
  QUEUED: "border-amber-200 bg-amber-50 text-amber-700",
  SENT: "border-emerald-200 bg-emerald-50 text-emerald-700",
  SUCCESS: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

function toCsv(rows) {
  const header = ["status", "to", "subject", "provider", "priority", "retries", "lastAttemptAt", "error"];
  const lines = [header.join(",")];

  rows.forEach((row) => {
    const values = header.map((key) => {
      const value = row?.[key] ?? "";
      const escaped = String(value).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    lines.push(values.join(","));
  });

  return lines.join("\n");
}

function formatAttemptAt(value) {
  if (!value) {
    return "Never";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function normalizeJobs(payload) {
  return Array.isArray(payload?.jobs) ? payload.jobs.filter(Boolean) : [];
}

function StatusBanner({ state }) {
  if (!state?.message) {
    return null;
  }

  const className =
    state.tone === "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return <div className={`rounded-2xl border px-4 py-3 text-sm ${className}`}>{state.message}</div>;
}

export default function AdminEmailJobsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAdminAuth();

  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [view, setView] = useState("all");
  const [retryingId, setRetryingId] = useState("");
  const [status, setStatus] = useState({ tone: "success", message: "" });
  const latestLoadIdRef = useRef(0);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/admin/login");
    }
  }, [isAuthenticated, isLoading, router]);

  const loadData = useCallback(async ({ preserveStatus = false } = {}) => {
    const loadId = latestLoadIdRef.current + 1;
    latestLoadIdRef.current = loadId;

    setLoading(true);
    if (!preserveStatus) {
      setStatus({ tone: "success", message: "" });
    }

    const endpoint = view === "failed" ? "/api/admin/email/jobs/failed" : "/api/admin/email/jobs";
    const response = await adminGet(endpoint);

    if (loadId !== latestLoadIdRef.current) {
      return;
    }

    if (response.ok) {
      setJobs(normalizeJobs(response.data));
      if (!preserveStatus) {
        setStatus({ tone: "success", message: "" });
      }
    } else {
      setJobs([]);
      setStatus({ tone: "error", message: response.error || "Failed to load email jobs." });
    }

    setLoading(false);
  }, [view]);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
      return;
    }

    if (!isLoading) {
      setLoading(false);
    }
  }, [isAuthenticated, isLoading, loadData]);

  const csvData = useMemo(() => toCsv(jobs), [jobs]);

  const handleRetry = async (jobId) => {
    setRetryingId(String(jobId));
    setStatus({ tone: "success", message: "" });

    try {
      const response = await adminPost("/api/admin/email/jobs/retry", { jobId });

      if (response.ok) {
        setStatus({ tone: "success", message: "Retry queued successfully." });
        await loadData({ preserveStatus: true });
      } else {
        setStatus({ tone: "error", message: response.error || "Retry failed." });
      }
    } finally {
      setRetryingId("");
    }
  };

  const handleExport = () => {
    if (!jobs.length) {
      return;
    }

    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `email-jobs-${view}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  if (isLoading || loading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-500">Loading email jobs...</p>
      </section>
    );
  }

  if (!isAuthenticated) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
        Admin access is required. Sign in again and reload this page.
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-900">Delivery history</h2>
          <p className="text-sm text-slate-500">
            Review outbound email jobs, failed attempts, and retry status from the admin queue.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setView("all")}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
              view === "all"
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
            }`}
          >
            All jobs
          </button>
          <button
            type="button"
            onClick={() => setView("failed")}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
              view === "failed"
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
            }`}
          >
            Failed only
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={!jobs.length}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Export CSV
          </button>
        </div>
      </div>

      <StatusBanner state={status} />

      {jobs.length === 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          No email jobs matched the current view.
        </section>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Recipient</th>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Provider</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Retries</th>
                  <th className="px-4 py-3">Last attempt</th>
                  <th className="px-4 py-3">Error</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => {
                  const statusClassName = STATUS_CLASS_MAP[job.status] || "border-slate-200 bg-slate-50 text-slate-700";
                  const canRetry = job.status === "FAILED";

                  return (
                    <tr key={job.id} className="border-t border-slate-100 align-top">
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClassName}`}>
                          {job.status || "Unknown"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{job.to || "-"}</td>
                      <td className="px-4 py-3 text-slate-700">{job.subject || "-"}</td>
                      <td className="px-4 py-3 text-slate-600">{job.provider || "-"}</td>
                      <td className="px-4 py-3 text-slate-600">{job.priority ?? "-"}</td>
                      <td className="px-4 py-3 text-slate-600">{job.retries ?? 0}</td>
                      <td className="px-4 py-3 text-slate-600">{formatAttemptAt(job.lastAttemptAt)}</td>
                      <td className="px-4 py-3 text-red-600">{job.error || "-"}</td>
                      <td className="px-4 py-3">
                        {canRetry ? (
                          <button
                            type="button"
                            onClick={() => handleRetry(job.id)}
                            disabled={retryingId === String(job.id)}
                            className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {retryingId === String(job.id) ? "Retrying..." : "Retry"}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </section>
  );
}
