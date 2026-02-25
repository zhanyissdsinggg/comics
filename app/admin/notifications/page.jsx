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

export default function NotificationsPage() {
  const { request, error } = useAdminApi();
  const [notifications, setNotifications] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [pageLoading, setPageLoading] = useState(false);

  const fetchNotifications = useCallback(
    async (filters = {}) => {
      setPageLoading(true);
      try {
        const params = new URLSearchParams();
        params.append("page", String(filters.page || 1));
        params.append("limit", String(filters.limit || 10));
        if (filters.search) params.append("search", filters.search);

        const data = await request(`/api/admin/notifications?${params.toString()}`);
        const list = parseList(data, ["notifications"]).map((item) => ({
          ...item,
          id: item.id || item.notificationId,
        }));
        setNotifications(list);
      } catch (err) {
        console.error("获取通知列表失败:", err);
      } finally {
        setPageLoading(false);
      }
    },
    [request]
  );

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleDelete = async (ids) => {
    if (!confirm(`确定要删除这 ${ids.length} 条通知吗？`)) return;

    setPageLoading(true);
    try {
      for (const id of ids) {
        await request(`/api/admin/notifications/${id}`, { method: "DELETE" });
      }
      setSelectedIds([]);
      await fetchNotifications();
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
    { key: "title", label: "标题", sortable: true },
    {
      key: "content",
      label: "内容",
      render: (v) => {
        const text = v || "";
        return text.length > 50 ? `${text.slice(0, 50)}...` : text;
      },
    },
    {
      key: "createdAt",
      label: "创建时间",
      render: (v) => (v ? new Date(v).toLocaleDateString("zh-CN") : "-"),
    },
  ];

  return (
    <AdminLayout title="通知管理" subtitle="通知列表筛选与批量删除。">
      <div className="space-y-6">
        <AdvancedFilter filters={[]} onFilter={fetchNotifications} loading={pageLoading} />

        <BulkActions
          selectedIds={selectedIds}
          onDelete={handleDelete}
          loading={pageLoading}
        />

        <DataTable
          columns={columns}
          data={notifications}
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
