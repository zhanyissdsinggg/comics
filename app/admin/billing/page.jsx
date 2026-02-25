"use client";

import { useState, useEffect } from "react";
import { AdminLayout } from "../../../components/admin/AdminLayout";
import { DataTable } from "../../../components/admin/DataTable";
import { BulkActions } from "../../../components/admin/BulkActions";
import { AdvancedFilter } from "../../../components/admin/AdvancedFilter";
import { useAdminApi } from "../../../lib/hooks/useAdminApi";

/**
 * 老王注释：优化后的Billing管理页面 - 使用新的组件和Hook
 */
export default function BillingPage() {
  const { request, loading, error } = useAdminApi();
  const [packages, setPackages] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [pageLoading, setPageLoading] = useState(false);

  useEffect(() => {
    const fetchPackages = async (filters = {}) => {
      setPageLoading(true);
      try {
        const params = new URLSearchParams();
        params.append("page", filters.page || 1);
        params.append("limit", filters.limit || 10);
        if (filters.search) params.append("search", filters.search);

        const data = await request(`/api/admin/billing?${params.toString()}`);
        setPackages(data.data || []);
      } catch (err) {
        console.error("获取充值包列表失败:", err);
      } finally {
        setPageLoading(false);
      }
    };
    fetchPackages();
  }, [request]);

  const handleDelete = async (ids) => {
    if (!confirm(`确定要删除这 ${ids.length} 个充值包吗？`)) return;

    setPageLoading(true);
    try {
      for (const id of ids) {
        await request(`/api/admin/billing/${id}`, { method: "DELETE" });
      }
      setPackages(packages.filter((p) => !ids.includes(p.id)));
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
    { key: "name", label: "名称", sortable: true },
    { key: "price", label: "价格", render: (v) => `¥${(v / 100).toFixed(2)}` },
    { key: "points", label: "积分", sortable: true },
  ];

  return (
    <AdminLayout title="账单管理">
      <div className="space-y-6">
        <AdvancedFilter
          filters={[]}
          onFilter={(filters) => fetchPackages(filters)}
          loading={pageLoading}
        />

        <BulkActions
          selectedIds={selectedIds}
          onDelete={handleDelete}
          loading={pageLoading}
        />

        <DataTable
          columns={columns}
          data={packages}
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
