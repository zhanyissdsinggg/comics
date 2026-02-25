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

export default function BillingPage() {
  const { request, error } = useAdminApi();
  const [packages, setPackages] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [pageLoading, setPageLoading] = useState(false);

  const fetchPackages = useCallback(
    async (filters = {}) => {
      setPageLoading(true);
      try {
        const params = new URLSearchParams();
        params.append("page", String(filters.page || 1));
        params.append("limit", String(filters.limit || 10));
        if (filters.search) params.append("search", filters.search);

        const data = await request(`/api/admin/billing?${params.toString()}`);
        const list = parseList(data, ["packages", "plans"]).map((item) => ({
          ...item,
          id: item.id || item.packageId || item.planId,
        }));
        setPackages(list);
      } catch (err) {
        console.error("获取充值包列表失败:", err);
      } finally {
        setPageLoading(false);
      }
    },
    [request]
  );

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  const handleDelete = async (ids) => {
    if (!confirm(`确定要删除这 ${ids.length} 个充值包吗？`)) return;

    setPageLoading(true);
    try {
      for (const id of ids) {
        await request(`/api/admin/billing/${id}`, { method: "DELETE" });
      }
      setSelectedIds([]);
      await fetchPackages();
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
    {
      key: "price",
      label: "价格",
      render: (v) => `${Number(v || 0).toFixed(2)}`,
    },
    { key: "points", label: "积分", sortable: true },
  ];

  return (
    <AdminLayout title="账单管理" subtitle="充值包与定价项管理。">
      <div className="space-y-6">
        <AdvancedFilter filters={[]} onFilter={fetchPackages} loading={pageLoading} />

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
