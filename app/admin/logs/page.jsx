"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminLayout } from "../../../components/admin/AdminLayout";
import { DataTable } from "../../../components/admin/DataTable";
import { BulkActions } from "../../../components/admin/BulkActions";
import { AdvancedFilter } from "../../../components/admin/AdvancedFilter";
import { useAdminApi } from "../../../lib/hooks/useAdminApi";

function parseList(payload, keys = []) {
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) {
      return payload[key];
    }
  }
  if (Array.isArray(payload?.data)) {
    return payload.data;
  }
  return [];
}

export default function LogsPage() {
  const { request, error } = useAdminApi();
  const [logs, setLogs] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [pageLoading, setPageLoading] = useState(false);

  const fetchLogs = useCallback(
    async (filters = {}) => {
      setPageLoading(true);
      try {
        const params = new URLSearchParams();
        params.append("page", String(filters.page || 1));
        params.append("limit", String(filters.limit || 10));
        if (filters.search) params.append("search", filters.search);
        if (filters.action) params.append("action", filters.action);

        const data = await request(`/api/admin/logs?${params.toString()}`);
        const list = parseList(data, ["logs"]).map((item) => ({
          ...item,
          id: item.id || item.logId,
        }));
        setLogs(list);
      } catch (err) {
        console.error("获取日志列表失败:", err);
      } finally {
        setPageLoading(false);
      }
    },
    [request]
  );

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleDelete = async (ids) => {
    if (!confirm(`确定要删除这 ${ids.length} 条日志吗？`)) return;

    setPageLoading(true);
    try {
      for (const id of ids) {
        await request(`/api/admin/logs/${id}`, { method: "DELETE" });
      }
      setSelectedIds([]);
      await fetchLogs();
      alert("删除成功");
    } catch (err) {
      console.error("删除失败:", err);
      alert("删除失败");
    } finally {
      setPageLoading(false);
    }
  };

  const columns = [
    { key: "id", label: "ID", sortable: true },
    { key: "action", label: "操作", sortable: true },
    { key: "resource", label: "资源", sortable: true },
    { key: "userId", label: "用户ID", sortable: true },
    { key: "statusCode", label: "状态码", render: (v) => v ?? "-" },
    {
      key: "timestamp",
      label: "时间",
      render: (v, row) => {
        const value = v || row.createdAt;
        return value ? new Date(value).toLocaleDateString("zh-CN") : "-";
      },
    },
  ];

  return (
    <AdminLayout title="操作日志" subtitle="审计日志检索与批量删除。">
      <div className="space-y-6">
        <AdvancedFilter
          filters={[
            {
              id: "action",
              label: "操作类型",
              type: "select",
              options: [
                { label: "创建", value: "create" },
                { label: "更新", value: "update" },
                { label: "删除", value: "delete" },
                { label: "查询", value: "read" },
              ],
            },
          ]}
          onFilter={fetchLogs}
          loading={pageLoading}
        />

        <BulkActions
          selectedIds={selectedIds}
          onDelete={handleDelete}
          loading={pageLoading}
        />

        <DataTable
          columns={columns}
          data={logs}
          loading={pageLoading}
          error={error}
          selectable
          onSelectionChange={setSelectedIds}
          sortable
          paginated
          pageSize={10}
        />
      </div>
    </AdminLayout>
  );
}
