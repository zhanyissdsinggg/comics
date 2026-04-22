"use client";

import { RefreshCw } from "lucide-react";

import { LoadingState } from "@/components/admin/common/LoadingState";
import {
  AdminBadge,
  AdminDataTable,
  AdminMetricCard,
  AdminPageSection,
  AdminTableHeader,
  AdminTableRow,
  adminInputClassName,
  adminSelectClassName,
} from "@/components/admin/common/AdminWorkspacePrimitives";
import { Button } from "@/components/ui/button";

import { buildLogsMetricCards, formatDateTime, getAdminIdentity, summarizeDetails } from "./utils";

export function LogsSummaryCards({ total, actionCount, adminCount }) {
  const cards = buildLogsMetricCards({ total, actionCount, adminCount });

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {cards.map((card) => (
        <AdminMetricCard key={card.label} {...card} />
      ))}
    </div>
  );
}

export function LogsFiltersSection({
  searchTerm,
  onSearchTermChange,
  actionFilter,
  onActionFilterChange,
  adminFilter,
  onAdminFilterChange,
  actionOptions,
  adminOptions,
}) {
  return (
    <AdminPageSection
      title="日志筛选"
      description="按动作或操作者筛选。"
      eyebrow="审计筛选"
    >
      <div className="grid gap-3 rounded-[26px] border border-[color:var(--gush-border)] bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.035)] ring-1 ring-black/[0.02] lg:grid-cols-[minmax(0,1.5fr)_220px_220px]">
        <input
          type="search"
          value={searchTerm}
          onChange={(event) => onSearchTermChange(event.target.value)}
          placeholder="搜索日志编号、动作、资源、目标或操作者"
          className={adminInputClassName}
        />
        <select
          value={actionFilter}
          onChange={(event) => onActionFilterChange(event.target.value)}
          className={adminSelectClassName}
        >
          <option value="">全部动作</option>
          {actionOptions.map((action) => (
            <option key={action} value={action}>
              {action}
            </option>
          ))}
        </select>
        <select
          value={adminFilter}
          onChange={(event) => onAdminFilterChange(event.target.value)}
          className={adminSelectClassName}
        >
          <option value="">全部操作者</option>
          {adminOptions.map((adminId) => (
            <option key={adminId} value={adminId}>
              {adminId}
            </option>
          ))}
        </select>
      </div>
    </AdminPageSection>
  );
}

export function LogsTableSection({ logsQuery, logs }) {
  return (
    <AdminPageSection
      title="操作记录"
      description="先看时间、操作者和动作摘要。"
      eyebrow="审计记录"
      action={
        <Button type="button" variant="outline" onClick={() => logsQuery.refetch()}>
          <RefreshCw className="size-4" />
          刷新
        </Button>
      }
    >
      {logsQuery.isLoading ? (
        <LoadingState.Spinner size="md" text="正在加载审计日志" />
      ) : logsQuery.error ? (
        <LoadingState.ErrorState error={logsQuery.error.message} onRetry={() => logsQuery.refetch()} />
      ) : logs.length === 0 ? (
        <LoadingState.EmptyState message="当前筛选下没有审计日志。" />
      ) : (
        <AdminDataTable>
          <table className="min-w-full text-sm">
            <AdminTableHeader>
              <tr>
                <th className="px-4 py-3">时间</th>
                <th className="px-4 py-3">操作者</th>
                <th className="px-4 py-3">动作</th>
                <th className="px-4 py-3">资源</th>
                <th className="px-4 py-3">目标</th>
                <th className="px-4 py-3">详情</th>
              </tr>
            </AdminTableHeader>
            <tbody>
              {logs.map((log) => (
                <AdminTableRow key={log.id}>
                  <td className="px-4 py-4 text-slate-600">
                    {formatDateTime(log.createdAt || log.timestamp)}
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-medium text-slate-950">{getAdminIdentity(log) || "未知操作者"}</div>
                    <div className="mt-1 text-xs text-slate-500">{log.ip || "未记录 IP"}</div>
                  </td>
                  <td className="px-4 py-4">
                    <AdminBadge tone="accent">{log.action || "未知动作"}</AdminBadge>
                  </td>
                  <td className="px-4 py-4 text-slate-700">{log.resource || "未知资源"}</td>
                  <td className="px-4 py-4 text-slate-700">{log.resourceId || "暂无目标编号"}</td>
                  <td className="max-w-[28rem] px-4 py-4 text-xs leading-6 text-slate-600">
                    {summarizeDetails(log.details)}
                  </td>
                </AdminTableRow>
              ))}
            </tbody>
          </table>
        </AdminDataTable>
      )}
    </AdminPageSection>
  );
}
