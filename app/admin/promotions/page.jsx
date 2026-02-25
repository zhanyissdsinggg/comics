"use client";

import { useState, useEffect } from "react";
import { AdminLayout } from "../../../components/admin/AdminLayout";
import { DataTable } from "../../../components/admin/DataTable";
import { BulkActions } from "../../../components/admin/BulkActions";
import { AdvancedFilter } from "../../../components/admin/AdvancedFilter";
import { useAdminApi } from "../../../lib/hooks/useAdminApi";

/**
 * 老王注释：优化后的Promotions管理页面 - 使用新的组件和Hook
 */
export default function PromotionsPage() {
  const { request, loading, error } = useAdminApi();
  const [promotions, setPromotions] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [pageLoading, setPageLoading] = useState(false);

  useEffect(() => {
    const fetchPromotions = async (filters = {}) => {
      setPageLoading(true);
      try {
        const params = new URLSearchParams();
        params.append("page", filters.page || 1);
        params.append("limit", filters.limit || 10);
        if (filters.search) params.append("search", filters.search);

        const data = await request(`/api/admin/promotions?${params.toString()}`);
        setPromotions(data.data || []);
      } catch (err) {
        console.error("获取促销列表失败:", err);
      } finally {
        setPageLoading(false);
      }
    };
    fetchPromotions();
  }, [request]);

  const handleDelete = async (ids) => {
    if (!confirm(`确定要删除这 ${ids.length} 个促销吗？`)) return;

    setPageLoading(true);
    try {
      for (const id of ids) {
        await request(`/api/admin/promotions/${id}`, { method: "DELETE" });
      }
      setPromotions(promotions.filter((p) => !ids.includes(p.id)));
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
    { key: "active", label: "状态", render: (v) => v ? "启用" : "禁用" },
    { key: "createdAt", label: "创建时间", render: (v) => new Date(v).toLocaleDateString("zh-CN") },
  ];

  return (
    <AdminLayout title="促销管理">
      <div className="space-y-6">
        <AdvancedFilter
          filters={[
            { id: "active", label: "状态", type: "select", options: [
              { label: "启用", value: "true" },
              { label: "禁用", value: "false" },
            ]}
          ]}
          onFilter={(filters) => fetchPromotions(filters)}
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
