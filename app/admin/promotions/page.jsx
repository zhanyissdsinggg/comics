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

export default function PromotionsPage() {
  const { request, error } = useAdminApi();
  const [promotions, setPromotions] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [pageLoading, setPageLoading] = useState(false);

  const fetchPromotions = useCallback(
    async (filters = {}) => {
      setPageLoading(true);
      try {
        const params = new URLSearchParams();
        params.append("page", String(filters.page || 1));
        params.append("limit", String(filters.limit || 10));
        if (filters.search) params.append("search", filters.search);
        if (filters.active) params.append("active", filters.active);

        const data = await request(`/api/admin/promotions?${params.toString()}`);
        const list = parseList(data, ["promotions"]).map((item) => ({
          ...item,
          id: item.id || item.promotionId,
        }));
        setPromotions(list);
      } catch (err) {
        console.error("获取活动列表失败:", err);
      } finally {
        setPageLoading(false);
      }
    },
    [request]
  );

  useEffect(() => {
    fetchPromotions();
  }, [fetchPromotions]);

  const handleDelete = async (ids) => {
    if (!confirm(`确定要删除这 ${ids.length} 个活动吗？`)) return;

    setPageLoading(true);
    try {
      for (const id of ids) {
        await request(`/api/admin/promotions/${id}`, { method: "DELETE" });
      }
      setSelectedIds([]);
      await fetchPromotions();
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
      key: "active",
      label: "状态",
      render: (v) => (v ? "启用" : "禁用"),
    },
    {
      key: "createdAt",
      label: "创建时间",
      render: (v) => (v ? new Date(v).toLocaleDateString("zh-CN") : "-"),
    },
  ];

  return (
    <AdminLayout title="促销管理" subtitle="促销活动的筛选与批量删除。">
      <div className="space-y-6">
        <AdvancedFilter
          filters={[
            {
              id: "active",
              label: "状态",
              type: "select",
              options: [
                { label: "启用", value: "true" },
                { label: "禁用", value: "false" },
              ],
            },
          ]}
          onFilter={fetchPromotions}
          loading={pageLoading}
        />

        <BulkActions
          selectedIds={selectedIds}
          onDelete={handleDelete}
          loading={pageLoading}
        />

        <DataTable
          columns={columns}
          data={promotions}
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
