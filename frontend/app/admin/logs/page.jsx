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
    return 'Not available';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Not available';
  }

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function summarizeDetails(value) {
  if (!value) {
    return 'No detail payload';
  }

  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    const entries = Object.entries(parsed || {}).slice(0, 3);

    if (!entries.length) {
      return 'No detail payload';
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
        throw new Error(response.error || 'Audit logs could not be loaded.');
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
      title="Audit logs"
      subtitle="A quiet, read-first history of backstage actions. Use it to confirm who changed what, not to create another noisy control panel."
      actions={
        <Button type="button" variant="outline" onClick={() => logsQuery.refetch()}>
          <RefreshCw className="size-4" />
          Refresh
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-3">
          <AdminMetricCard
            label="Logs in view"
            value={String(filteredLogs.length)}
            detail="Records that match the current search and filter state."
            tone="accent"
          />
          <AdminMetricCard
            label="Action types"
            value={String(actionOptions.length)}
            detail="Unique action labels currently represented in the dataset."
          />
          <AdminMetricCard
            label="Operators"
            value={String(adminOptions.length)}
            detail="Distinct admin or fallback user identities found in the logs."
          />
        </div>

        <AdminPageSection
          title="Audit filters"
          description="Filter by action or operator when you need to narrow the list, but keep the base view simple and readable."
        >
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_220px_220px]">
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search ID, action, resource, target, or operator"
              className={adminInputClassName}
            />
            <select
              value={actionFilter}
              onChange={(event) => setActionFilter(event.target.value)}
              className={adminSelectClassName}
            >
              <option value="">All actions</option>
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
              <option value="">All operators</option>
              {adminOptions.map((adminId) => (
                <option key={adminId} value={adminId}>
                  {adminId}
                </option>
              ))}
            </select>
          </div>
        </AdminPageSection>

        <AdminPageSection
          title="Change history"
          description="Start with when the action happened, who performed it, and the shortest useful detail summary."
        >
          {logsQuery.isLoading ? (
            <LoadingState.Spinner size="md" text="Loading audit logs" />
          ) : logsQuery.error ? (
            <LoadingState.ErrorState error={logsQuery.error.message} onRetry={() => logsQuery.refetch()} />
          ) : filteredLogs.length === 0 ? (
            <LoadingState.EmptyState message="No audit logs were found for this view." />
          ) : (
            <AdminDataTable>
              <table className="min-w-full text-sm">
                <AdminTableHeader>
                  <tr>
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3">Operator</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Resource</th>
                    <th className="px-4 py-3">Target</th>
                    <th className="px-4 py-3">Details</th>
                  </tr>
                </AdminTableHeader>
                <tbody>
                  {filteredLogs.map((log) => (
                    <AdminTableRow key={log.id}>
                      <td className="px-4 py-4 text-slate-600">{formatDateTime(log.createdAt || log.timestamp)}</td>
                      <td className="px-4 py-4">
                        <div className="font-medium text-slate-950">{getAdminIdentity(log) || 'Unknown operator'}</div>
                        <div className="mt-1 text-xs text-slate-500">{log.ip || 'No IP recorded'}</div>
                      </td>
                      <td className="px-4 py-4">
                        <AdminBadge tone="accent">{log.action || 'Unknown action'}</AdminBadge>
                      </td>
                      <td className="px-4 py-4 text-slate-700">{log.resource || 'Unknown resource'}</td>
                      <td className="px-4 py-4 text-slate-700">{log.resourceId || 'No target ID'}</td>
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
