"use client";

import { useState, useEffect } from "react";
import { AdminLayout } from "../../../components/admin/AdminLayout";
import { DataTable } from "../../../components/admin/DataTable";
import { BulkActions } from "../../../components/admin/BulkActions";
import { AdvancedFilter } from "../../../components/admin/AdvancedFilter";
import { useAdminApi } from "../../../lib/hooks/useAdminApi";

/**
 * 老王注释：优化后的Notifications管理页面 - 使用新的组件和Hook
 */
export default function NotificationsPage() {
  const { request, loading, error } = useAdminApi();
  const [notifications, setNotifications] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [pageLoading, setPageLoading] = useState(false);

  const fetchNotifications = async (filters = {}) => {
    setPageLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", filters.page || 1);
      params.append("limit", filters.limit || 10);
      if (filters.search) params.append("search", filters.search);

      const data = await request(`/api/admin/notifications?${params.toString()}`);
      setNotifications(data.data || []);
    } catch (err) {
      console.error("获取通知列表失败:", err);
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleDelete = async (ids) => {
    if (!confirm(`确定要删除这 ${ids.length} 条通知吗？`)) return;

    setPageLoading(true);
    try {
      for (const id of ids) {
        await request(`/api/admin/notifications/${id}`, { method: "DELETE" });
      }
      setNotifications(notifications.filter((n) => !ids.includes(n.id)));
      setSelectedIds([]);
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
    { key: "content", label: "内容", render: (v) => v.substring(0, 50) + "..." },
    { key: "createdAt", label: "创建时间", render: (v) => new Date(v).toLocaleDateString("zh-CN") },
  ];

  return (
    <AdminLayout title="通知管理">
      <div className="space-y-6">
        <AdvancedFilter
          filters={[]}
          onFilter={(filters) => fetchNotifications(filters)}
          loading={pageLoading}
        />

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
          selectable={true}
          onSelectionChange={setSelectedIds}
          sortable={true}
          paginated={true}
          pageSize={10}
        />
      </div>
    </AdminLayout>
  );
}
