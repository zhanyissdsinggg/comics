"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import AdminShell from "./AdminShell";
import { apiGet, apiPost } from "../../lib/apiClient";

const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || "admin";

function toCsv(rows) {
  const header = ["status", "to", "subject", "provider", "priority", "retries", "lastAttemptAt", "error"];
  const lines = [header.join(",")];
  rows.forEach((row) => {
    const values = header.map((key) => {
      const value = row[key] ?? "";
      const escaped = String(value).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    lines.push(values.join(","));
  });
  return lines.join("\n");
}

export default function AdminEmailJobsPage() {
  const searchParams = useSearchParams();
  const key = searchParams.get("key") || "";
  const isAuthorized = key === ADMIN_KEY;
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [view, setView] = useState("all");

  const loadData = useCallback(async () => {
    setLoading(true);
    const endpoint =
      view === "failed"
        ? `/api/admin/email/jobs/failed?key=${key}`
        : `/api/admin/email/jobs?key=${key}`;
    const response = await apiGet(endpoint);
    if (response.ok) {
      setJobs(response.data?.jobs || []);
    }
    setLoading(false);
  }, [key, view]);

  useEffect(() => {
    if (isAuthorized) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [isAuthorized, loadData]);

  const handleRetry = async (jobId) => {
    await apiPost(`/api/admin/email/jobs/retry?key=${key}`, { jobId, key });
    loadData();
  };

  const csvData = useMemo(() => toCsv(jobs), [jobs]);

  const handleExport = () => {
    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `email-jobs-${view}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminShell
      title="ÓÊ¼þ·¢ËÍ¼ÇÂ¼"
      subtitle="²é¿´Ê§°ÜÖØÊÔÇé¿ö"
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setView("all")}
            className={`rounded-lg border px-3 py-2 text-xs ${
              view === "all" ? "border-slate-900 text-slate-900" : "border-slate-200 text-slate-500"
            }`}
          >
            È«²¿
          </button>
          <button
            type="button"
            onClick={() => setView("failed")}
            className={`rounded-lg border px-3 py-2 text-xs ${
              view === "failed" ? "border-slate-900 text-slate-900" : "border-slate-200 text-slate-500"
            }`}
          >
            ½öÊ§°Ü
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
          >
            µ¼³öCSV
          </button>
        </div>
      }
    >
      {!isAuthorized ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          403 ÎÞÈ¨ÏÞ£¬ÇëÔÚµØÖ·À¸¸½¼Ó ?key=ADMIN_KEY
        </div>
      ) : loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-slate-400">¼ÓÔØÖÐ...</div>
      ) : jobs.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">
          ÔÝÎÞÓÊ¼þ¼ÇÂ¼
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3">×´Ì¬</th>
                <th className="px-4 py-3">ÊÕ¼þÈË</th>
                <th className="px-4 py-3">Ö÷Ìâ</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">ÓÅÏÈ¼¶</th>
                <th className="px-4 py-3">ÖØÊÔ</th>
                <th className="px-4 py-3">×î½ü³¢ÊÔ</th>
                <th className="px-4 py-3">´íÎó</th>
                <th className="px-4 py-3">²Ù×÷</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 text-xs font-semibold">{job.status}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{job.to}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{job.subject}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{job.provider}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{job.priority}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{job.retries}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{job.lastAttemptAt}</td>
                  <td className="px-4 py-3 text-xs text-red-600">{job.error}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {job.status === "FAILED" ? (
                      <button
                        type="button"
                        onClick={() => handleRetry(job.id)}
                        className="rounded-full border border-slate-200 px-3 py-1"
                      >
                        ÖØÊÔ
                      </button>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
