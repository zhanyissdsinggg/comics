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

const STATUS_LABEL_MAP = {
  FAILED: "失败",
  QUEUED: "排队中",
  SENT: "已发送",
  SUCCESS: "成功",
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
    return "从未";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("zh-CN", {
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
      setStatus({ tone: "error", message: response.error || "邮件任务加载失败。" });
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
        setStatus({ tone: "success", message: "重试任务已成功加入队列。" });
        await loadData({ preserveStatus: true });
      } else {
        setStatus({ tone: "error", message: response.error || "重试失败。" });
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
        <p className="text-sm text-slate-500">正在加载邮件任务...</p>
      </section>
    );
  }

  if (!isAuthenticated) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
        需要管理员权限，请重新登录后刷新页面。
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-900">投递记录</h2>
          <p className="text-sm text-slate-500">
            查看后台邮件队列中的投递任务、失败记录与重试状态。
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
            全部任务
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
            仅失败任务
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={!jobs.length}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            导出 CSV
          </button>
        </div>
      </div>

      <StatusBanner state={status} />

      {jobs.length === 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          当前筛选下暂无邮件任务。
        </section>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">状态</th>
                  <th className="px-4 py-3">收件人</th>
                  <th className="px-4 py-3">主题</th>
                  <th className="px-4 py-3">服务商</th>
                  <th className="px-4 py-3">优先级</th>
                  <th className="px-4 py-3">重试次数</th>
                  <th className="px-4 py-3">最近尝试</th>
                  <th className="px-4 py-3">错误信息</th>
                  <th className="px-4 py-3">操作</th>
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
                          {STATUS_LABEL_MAP[job.status] || job.status || "未知"}
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
                            {retryingId === String(job.id) ? "重试中..." : "重试"}
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
