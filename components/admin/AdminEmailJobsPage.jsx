"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "./AuthContext";
import AdminShell from "./AdminShell";
import { apiGet, apiPost } from "../../lib/apiClient";

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
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [view, setView] = useState("all");

  // 老王说：检查认证状态，未登录则重定向
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/admin/login");
    }
  }, [isAuthenticated, isLoading, router]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const endpoint =
      view === "failed"
        ? `/api/admin/email/jobs/failed`
        : `/api/admin/email/jobs`;
    const response = await apiGet(endpoint);
    if (response.ok) {
      setJobs(response.data?.jobs || []);
    }
    setLoading(false);
  }, [key, view]);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, loadData]);

  const handleRetry = async (jobId) => {
    await apiPost(`/api/admin/email/jobs/retry`, { jobId });
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
      title="邮件发送记录"
      subtitle="查看失败重试情况"
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setView("all")}
            className={`rounded-lg border px-3 py-2 text-xs ${
              view === "all" ? "border-slate-900 text-slate-900" : "border-slate-200 text-slate-500"
            }`}
          >
            全部
          </button>
          <button
            type="button"
            onClick={() => setView("failed")}
            className={`rounded-lg border px-3 py-2 text-xs ${
              view === "failed" ? "border-slate-900 text-slate-900" : "border-slate-200 text-slate-500"
            }`}
          >
            仅失败
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
          >
            导出CSV
          </button>
        </div>
      }
    >
      {!isAuthorized ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          403 无权限，请在地址栏附加 ?key=ADMIN_KEY
        </div>
      ) : loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-slate-400">加载中...</div>
      ) : jobs.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">
          暂无邮件记录
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3">状态</th>
                <th className="px-4 py-3">收件人</th>
                <th className="px-4 py-3">主题</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">优先级</th>
                <th className="px-4 py-3">重试</th>
                <th className="px-4 py-3">最近尝试</th>
                <th className="px-4 py-3">错误</th>
                <th className="px-4 py-3">操作</th>
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
                        重试
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
