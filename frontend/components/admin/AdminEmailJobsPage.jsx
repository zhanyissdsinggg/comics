"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { AdminFeedbackBanner } from "@/components/admin/common/AdminFeedbackBanner";
import {
  AdminBadge,
  AdminDataTable,
  AdminPageSection,
  AdminTableHeader,
  AdminTableRow,
  AdminTabs,
} from "@/components/admin/common/AdminWorkspacePrimitives";
import { useAdminAuth } from "./AuthContext";
import { adminGet, adminPost } from "../../lib/adminApiClient";

const STATUS_TONES = {
  FAILED: "danger",
  QUEUED: "warning",
  SENT: "success",
  SUCCESS: "success",
};

const STATUS_LABELS = {
  FAILED: "Failed",
  QUEUED: "Queued",
  SENT: "Sent",
  SUCCESS: "Success",
};

const viewOptions = [
  { value: "all", label: "All jobs" },
  { value: "failed", label: "Failed only" },
];

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

export default function AdminEmailJobsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAdminAuth();

  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [view, setView] = useState("all");
  const [retryingId, setRetryingId] = useState("");
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const latestLoadIdRef = useRef(0);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/admin/login");
    }
  }, [isAuthenticated, isLoading, router]);

  const loadData = useCallback(
    async ({ preserveStatus = false } = {}) => {
      const loadId = latestLoadIdRef.current + 1;
      latestLoadIdRef.current = loadId;

      setLoading(true);
      if (!preserveStatus) {
        setFeedback({ type: "", message: "" });
      }

      const endpoint = view === "failed" ? "/api/admin/email/jobs/failed" : "/api/admin/email/jobs";
      const response = await adminGet(endpoint);

      if (loadId !== latestLoadIdRef.current) {
        return;
      }

      if (response.ok) {
        setJobs(normalizeJobs(response.data));
        if (!preserveStatus) {
          setFeedback({ type: "", message: "" });
        }
      } else {
        setJobs([]);
        setFeedback({
          type: "error",
          message: response.error || response.message || "Email jobs could not be loaded.",
        });
      }

      setLoading(false);
    },
    [view],
  );

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
  const failedCount = useMemo(
    () => jobs.filter((job) => String(job.status || "").toUpperCase() === "FAILED").length,
    [jobs],
  );

  const handleRetry = async (jobId) => {
    setRetryingId(String(jobId));
    setFeedback({ type: "", message: "" });

    try {
      const response = await adminPost("/api/admin/email/jobs/retry", { jobId });

      if (response.ok) {
        setFeedback({ type: "success", message: "The job was queued for another delivery attempt." });
        await loadData({ preserveStatus: true });
      } else {
        setFeedback({
          type: "error",
          message: response.error || response.message || "The retry request failed.",
        });
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
      <AdminPageSection title="Delivery queue" description="Loading the outbound job queue and recent email attempts.">
        <p className="text-sm text-slate-500">Loading email jobs...</p>
      </AdminPageSection>
    );
  }

  if (!isAuthenticated) {
    return (
      <AdminPageSection title="Delivery queue" description="Admin access is required before email operations can be reviewed.">
        <p className="text-sm text-slate-500">Sign in as an admin to review delivery jobs.</p>
      </AdminPageSection>
    );
  }

  return (
    <div className="space-y-6">
      <AdminFeedbackBanner
        feedback={feedback}
        onDismiss={() => setFeedback({ type: "", message: "" })}
      />

      <AdminPageSection
        title="Delivery queue"
        description="Keep this queue readable: what was sent, where it went, and whether another delivery attempt is still needed."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <AdminBadge tone={failedCount > 0 ? "warning" : "success"}>
              {failedCount > 0 ? `${failedCount} failed in this view` : "No failures in this view"}
            </AdminBadge>
            <Button type="button" variant="outline" onClick={handleExport} disabled={!jobs.length}>
              Export CSV
            </Button>
          </div>
        }
      >
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <AdminTabs items={viewOptions} value={view} onChange={setView} />
          <p className="text-sm text-slate-500">
            {view === "failed"
              ? "Only failed deliveries stay in view here so operators can retry cleanly."
              : "All queued and completed delivery jobs stay visible in one calm table."}
          </p>
        </div>

        {jobs.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-black/10 bg-[rgba(250,247,241,0.82)] p-8 text-center text-sm text-slate-500">
            No email jobs match this view yet.
          </div>
        ) : (
          <AdminDataTable>
            <table className="min-w-full text-left text-sm">
              <AdminTableHeader>
                <tr>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4">Recipient</th>
                  <th className="px-4 py-4">Subject</th>
                  <th className="px-4 py-4">Provider</th>
                  <th className="px-4 py-4">Priority</th>
                  <th className="px-4 py-4">Retries</th>
                  <th className="px-4 py-4">Last attempt</th>
                  <th className="px-4 py-4">Error</th>
                  <th className="px-4 py-4">Action</th>
                </tr>
              </AdminTableHeader>
              <tbody>
                {jobs.map((job) => {
                  const status = String(job.status || "").toUpperCase();
                  const canRetry = status === "FAILED";

                  return (
                    <AdminTableRow key={job.id}>
                      <td className="px-4 py-4">
                        <AdminBadge tone={STATUS_TONES[status] || "default"}>
                          {STATUS_LABELS[status] || status || "Unknown"}
                        </AdminBadge>
                      </td>
                      <td className="px-4 py-4 text-slate-700">{job.to || "-"}</td>
                      <td className="px-4 py-4 text-slate-700">{job.subject || "-"}</td>
                      <td className="px-4 py-4 text-slate-600">{job.provider || "-"}</td>
                      <td className="px-4 py-4 text-slate-600">{job.priority ?? "-"}</td>
                      <td className="px-4 py-4 text-slate-600">{job.retries ?? 0}</td>
                      <td className="px-4 py-4 text-slate-600">{formatAttemptAt(job.lastAttemptAt)}</td>
                      <td className="px-4 py-4 text-sm text-red-600">{job.error || "-"}</td>
                      <td className="px-4 py-4">
                        {canRetry ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleRetry(job.id)}
                            disabled={retryingId === String(job.id)}
                          >
                            {retryingId === String(job.id) ? "Retrying..." : "Retry"}
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-400">No action needed</span>
                        )}
                      </td>
                    </AdminTableRow>
                  );
                })}
              </tbody>
            </table>
          </AdminDataTable>
        )}
      </AdminPageSection>
    </div>
  );
}
