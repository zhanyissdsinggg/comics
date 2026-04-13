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
  FAILED: "失败",
  QUEUED: "排队中",
  SENT: "已发送",
  SUCCESS: "成功",
};

const viewOptions = [
  { value: "all", label: "全部任务" },
  { value: "failed", label: "仅看失败任务" },
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
    return "从未尝试";
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
          message: response.error || response.message || "邮件任务加载失败。",
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
        setFeedback({ type: "success", message: "该任务已重新加入投递队列。" });
        await loadData({ preserveStatus: true });
      } else {
        setFeedback({
          type: "error",
          message: response.error || response.message || "重试投递失败。",
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
      <AdminPageSection title="投递队列" description="正在加载外发任务队列和最近的邮件尝试。">
        <p className="text-sm text-slate-500">正在加载邮件任务...</p>
      </AdminPageSection>
    );
  }

  if (!isAuthenticated) {
    return (
      <AdminPageSection title="投递队列" description="需要管理员权限后，才能查看邮件投递任务。">
        <p className="text-sm text-slate-500">请先以管理员身份登录，再查看邮件任务。</p>
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
        title="投递队列"
        description="把队列看清楚：发给了谁、当前状态如何、是否还需要继续重试。"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <AdminBadge tone={failedCount > 0 ? "warning" : "success"}>
              {failedCount > 0 ? `当前视图下有 ${failedCount} 条失败任务` : "当前视图下没有失败任务"}
            </AdminBadge>
            <Button type="button" variant="outline" onClick={handleExport} disabled={!jobs.length}>
              导出 CSV
            </Button>
          </div>
        }
      >
        <div className="mb-5 flex flex-col gap-4 rounded-[26px] border border-[color:var(--gush-border)] bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.035)] ring-1 ring-black/[0.02] lg:flex-row lg:items-center lg:justify-between">
          <AdminTabs items={viewOptions} value={view} onChange={setView} />
          <p className="text-sm text-slate-500">
            {view === "failed"
              ? "这里只保留失败投递，方便运营逐条重试。"
              : "所有排队中和已完成的投递任务都会在同一张安静的表格里展示。"}
          </p>
        </div>

        {jobs.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-[color:var(--gush-border)] bg-[color:var(--gush-surface)] p-8 text-center text-sm text-slate-500 ring-1 ring-black/[0.015]">
            当前视图下还没有匹配的邮件任务。
          </div>
        ) : (
          <AdminDataTable>
            <table className="min-w-full text-left text-sm">
              <AdminTableHeader>
                <tr>
                  <th className="px-4 py-4">状态</th>
                  <th className="px-4 py-4">收件人</th>
                  <th className="px-4 py-4">主题</th>
                  <th className="px-4 py-4">通道</th>
                  <th className="px-4 py-4">优先级</th>
                  <th className="px-4 py-4">重试次数</th>
                  <th className="px-4 py-4">最近尝试</th>
                  <th className="px-4 py-4">错误信息</th>
                  <th className="px-4 py-4">操作</th>
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
                          {STATUS_LABELS[status] || status || "未知状态"}
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
                            {retryingId === String(job.id) ? "重试中..." : "重新投递"}
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-400">无需操作</span>
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

