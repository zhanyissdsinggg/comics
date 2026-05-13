"use client";

export const dynamic = "force-dynamic";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import AdminShell from "@/components/admin/AdminShell";
import {
  LogsFiltersSection,
  LogsSummaryCards,
  LogsTableSection,
} from "@/components/admin/logs-workspace/sections";
import { getAdminIdentity } from "@/components/admin/logs-workspace/utils";
import { adminGet } from "@/lib/adminApiClient";

export default function AdminLogsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [adminFilter, setAdminFilter] = useState("");

  const logsQuery = useQuery({
    queryKey: ["admin", "logs", "readonly"],
    queryFn: async () => {
      const response = await adminGet("/api/admin/logs?page=1&pageSize=200");

      if (!response.ok) {
        throw new Error(response.error || "审计日志加载失败。");
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
        !term ||
        [
          log.id,
          log.action,
          log.resource,
          getAdminIdentity(log),
          log.resourceId,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));

      const matchesAction = !actionFilter || log.action === actionFilter;
      const matchesAdmin =
        !adminFilter || getAdminIdentity(log) === adminFilter;

      return matchesSearch && matchesAction && matchesAdmin;
    });
  }, [actionFilter, adminFilter, logs, searchTerm]);

  const actionOptions = useMemo(
    () => [...new Set(logs.map((log) => log.action).filter(Boolean))].sort(),
    [logs],
  );
  const adminOptions = useMemo(
    () =>
      [
        ...new Set(logs.map((log) => getAdminIdentity(log)).filter(Boolean)),
      ].sort(),
    [logs],
  );

  return (
    <AdminShell title="审计日志" subtitle="查看后台动作，确认是谁改了什么。">
      <div className="space-y-6">
        <LogsSummaryCards
          total={filteredLogs.length}
          actionCount={actionOptions.length}
          adminCount={adminOptions.length}
        />

        <LogsFiltersSection
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          actionFilter={actionFilter}
          onActionFilterChange={setActionFilter}
          adminFilter={adminFilter}
          onAdminFilterChange={setAdminFilter}
          actionOptions={actionOptions}
          adminOptions={adminOptions}
        />

        <LogsTableSection logsQuery={logsQuery} logs={filteredLogs} />
      </div>
    </AdminShell>
  );
}
