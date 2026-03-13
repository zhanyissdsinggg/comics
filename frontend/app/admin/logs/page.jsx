'use client';

export const dynamic = 'force-dynamic';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { EmptyState, ErrorState, LoadingState } from '@/components/admin/common/LoadingState';
import { adminGet } from '@/lib/adminApiClient';

function formatDateTime(value) {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function summarizeDetails(value) {
  if (!value) {
    return '-';
  }

  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    const entries = Object.entries(parsed || {}).slice(0, 3);
    if (!entries.length) {
      return '-';
    }
    return entries.map(([key, item]) => `${key}: ${String(item)}`).join(' | ');
  } catch {
    return String(value).slice(0, 120);
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
      return response.data;
    },
    staleTime: 60_000,
  });

  const logs = logsQuery.data?.logs || [];

  const filteredLogs = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return logs.filter((log) => {
      const matchesSearch = !term || [
        log.id,
        log.action,
        log.resource,
        getAdminIdentity(log),
        log.resourceId,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));

      const matchesAction = !actionFilter || log.action === actionFilter;
      const matchesAdmin = !adminFilter || getAdminIdentity(log) === adminFilter;
      return matchesSearch && matchesAction && matchesAdmin;
    });
  }, [actionFilter, adminFilter, logs, searchTerm]);

  const actionOptions = useMemo(() => {
    return [...new Set(logs.map((log) => log.action).filter(Boolean))].sort();
  }, [logs]);

  const adminOptions = useMemo(() => {
    return [...new Set(logs.map((log) => getAdminIdentity(log)).filter(Boolean))].sort();
  }, [logs]);

  return (
    <div className="min-h-screen bg-neutral-900 p-6 text-neutral-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">审计日志</h1>
            <p className="mt-2 text-sm text-neutral-400">
              仅追加的后台操作流水。此页默认不提供删除能力。
            </p>
          </div>
          <button
            type="button"
            onClick={() => logsQuery.refetch()}
            className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-neutral-200 transition hover:border-white/20 hover:bg-white/10"
          >
            刷新
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="text-xs uppercase tracking-[0.2em] text-neutral-500">当前可见</div>
            <div className="mt-3 text-3xl font-semibold text-white">{filteredLogs.length}</div>
            <div className="mt-1 text-sm text-neutral-400">当前视图记录数</div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="text-xs uppercase tracking-[0.2em] text-neutral-500">操作类型</div>
            <div className="mt-3 text-3xl font-semibold text-white">{actionOptions.length}</div>
            <div className="mt-1 text-sm text-neutral-400">不同操作种类</div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="text-xs uppercase tracking-[0.2em] text-neutral-500">操作员</div>
            <div className="mt-3 text-3xl font-semibold text-white">{adminOptions.length}</div>
            <div className="mt-1 text-sm text-neutral-400">不同操作员身份</div>
          </div>
        </div>

        <div className="grid gap-3 rounded-3xl border border-white/10 bg-white/5 p-4 lg:grid-cols-[minmax(0,1.5fr)_220px_220px]">
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="搜索 ID、操作、资源、目标或操作员"
            className="rounded-2xl border border-white/10 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-emerald-400/50"
          />
          <select
            value={actionFilter}
            onChange={(event) => setActionFilter(event.target.value)}
            className="rounded-2xl border border-white/10 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400/50"
          >
            <option value="">全部操作</option>
            {actionOptions.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>
          <select
            value={adminFilter}
            onChange={(event) => setAdminFilter(event.target.value)}
            className="rounded-2xl border border-white/10 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400/50"
          >
            <option value="">全部操作员</option>
            {adminOptions.map((adminId) => (
              <option key={adminId} value={adminId}>
                {adminId}
              </option>
            ))}
          </select>
        </div>

        {logsQuery.isLoading ? (
          <LoadingState isLoading type="skeleton" count={8} height="h-16" />
        ) : logsQuery.error ? (
          <ErrorState
            error={logsQuery.error.message}
            onRetry={() => logsQuery.refetch()}
          />
        ) : filteredLogs.length === 0 ? (
          <EmptyState
            title="未找到审计日志"
            description="可以放宽筛选条件，或先执行一次新的后台操作。"
          />
        ) : (
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-white/5 text-xs uppercase tracking-[0.2em] text-neutral-500">
                  <tr>
                    <th className="px-4 py-3">时间</th>
                    <th className="px-4 py-3">操作员</th>
                    <th className="px-4 py-3">操作</th>
                    <th className="px-4 py-3">资源</th>
                    <th className="px-4 py-3">目标</th>
                    <th className="px-4 py-3">详情</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="border-t border-white/5 align-top text-neutral-200">
                      <td className="px-4 py-4 text-neutral-400">{formatDateTime(log.createdAt || log.timestamp)}</td>
                      <td className="px-4 py-4">
                        <div className="font-medium text-white">{getAdminIdentity(log) || '-'}</div>
                        <div className="mt-1 text-xs text-neutral-500">{log.ip || '-'}</div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                          {log.action || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-neutral-300">{log.resource || '-'}</td>
                      <td className="px-4 py-4 text-neutral-300">{log.resourceId || '-'}</td>
                      <td className="max-w-[320px] px-4 py-4 text-xs text-neutral-400">{summarizeDetails(log.details)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
