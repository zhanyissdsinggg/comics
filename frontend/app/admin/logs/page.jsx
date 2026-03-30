'use client';

export const dynamic = 'force-dynamic';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';

import AdminShell from '@/components/admin/AdminShell';
import { LoadingState } from '@/components/admin/common/LoadingState';
import {
  AdminBadge,
  AdminDataTable,
  AdminMetricCard,
  AdminPageSection,
  AdminTableHeader,
  AdminTableRow,
  adminInputClassName,
  adminSelectClassName,
} from '@/components/admin/common/AdminWorkspacePrimitives';
import { Button } from '@/components/ui/button';
import { adminGet } from '@/lib/adminApiClient';

function formatDateTime(value) {
  if (!value) {
    return '暂无';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '暂无';
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function summarizeDetails(value) {
  if (!value) {
    return '暂无详情';
  }

  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    const entries = Object.entries(parsed || {}).slice(0, 3);

    if (!entries.length) {
      return '暂无详情';
    }

    return entries.map(([key, item]) => `${key}: ${String(item)}`).join(' | ');
  } catch {
    return String(value).slice(0, 160);
  }
}

function getAdminIdentity(log) {
  return log.adminId || log.userId || '';
}

export default function AdminLogsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [adminFilter, setAdminFilter] = useState('');

  const logsQuery = useQuery({
    queryKey: ['admin', 'logs', 'readonly'],
    queryFn: async () => {
      const response = await adminGet('/api/admin/logs?page=1&pageSize=200');

      if (!response.ok) {
        throw new Error(response.error || '审计日志加载失败。');
      }

      return response.data || {};
    },
    staleTime: 60_000,
  });

  const logs = logsQuery.data?.logs || [];

  const filteredLogs = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return logs.filter((log) => {
      const matchesSearch =
        !term
        || [log.id, log.action, log.resource, getAdminIdentity(log), log.resourceId]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));

      const matchesAction = !actionFilter || log.action === actionFilter;
      const matchesAdmin = !adminFilter || getAdminIdentity(log) === adminFilter;

      return matchesSearch && matchesAction && matchesAdmin;
    });
  }, [actionFilter, adminFilter, logs, searchTerm]);

  const actionOptions = useMemo(
    () => [...new Set(logs.map((log) => log.action).filter(Boolean))].sort(),
    [logs],
  );
  const adminOptions = useMemo(
    () => [...new Set(logs.map((log) => getAdminIdentity(log)).filter(Boolean))].sort(),
    [logs],
  );

  return (
    <AdminShell
      title="审计日志"
      subtitle="用一个以阅读为先的安静记录页查看后台动作，先确认是谁改了什么，而不是再造一个吵闹的控制台。"
      actions={
        <Button type="button" variant="outline" onClick={() => logsQuery.refetch()}>
          <RefreshCw className="size-4" />
          刷新
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-3">
          <AdminMetricCard
            label="当前日志"
            value={String(filteredLogs.length)}
            detail="符合当前搜索和筛选条件的记录数量。"
            tone="accent"
          />
          <AdminMetricCard
            label="动作类型"
            value={String(actionOptions.length)}
            detail="当前数据里出现过的动作种类。"
          />
          <AdminMetricCard
            label="操作者"
            value={String(adminOptions.length)}
            detail="日志里出现过的后台账号或回退身份数量。"
          />
        </div>

        <AdminPageSection
          title="日志筛选"
          description="需要缩小时再按动作或操作者筛选，默认视图保持简单、易读。"
        >
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_220px_220px]">
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="搜索日志 ID、动作、资源、目标或操作者"
              className={adminInputClassName}
            />
            <select
              value={actionFilter}
              onChange={(event) => setActionFilter(event.target.value)}
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
              onChange={(event) => setAdminFilter(event.target.value)}
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

        <AdminPageSection
          title="操作记录"
          description="先看动作发生时间、是谁执行的，以及最短但足够有用的详情摘要。"
        >
          {logsQuery.isLoading ? (
            <LoadingState.Spinner size="md" text="正在加载审计日志" />
          ) : logsQuery.error ? (
            <LoadingState.ErrorState error={logsQuery.error.message} onRetry={() => logsQuery.refetch()} />
          ) : filteredLogs.length === 0 ? (
            <LoadingState.EmptyState message="当前视图下没有审计日志。" />
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
                  {filteredLogs.map((log) => (
                    <AdminTableRow key={log.id}>
                      <td className="px-4 py-4 text-slate-600">{formatDateTime(log.createdAt || log.timestamp)}</td>
                      <td className="px-4 py-4">
                        <div className="font-medium text-slate-950">{getAdminIdentity(log) || '未知操作者'}</div>
                        <div className="mt-1 text-xs text-slate-500">{log.ip || '未记录 IP'}</div>
                      </td>
                      <td className="px-4 py-4">
                        <AdminBadge tone="accent">{log.action || '未知动作'}</AdminBadge>
                      </td>
                      <td className="px-4 py-4 text-slate-700">{log.resource || '未知资源'}</td>
                      <td className="px-4 py-4 text-slate-700">{log.resourceId || '暂无目标 ID'}</td>
                      <td className="max-w-[28rem] px-4 py-4 text-xs leading-6 text-slate-600">{summarizeDetails(log.details)}</td>
                    </AdminTableRow>
                  ))}
                </tbody>
              </table>
            </AdminDataTable>
          )}
        </AdminPageSection>
      </div>
    </AdminShell>
  );
}
