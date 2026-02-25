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

export default function OrdersPage() {
  const { request, error } = useAdminApi();
  const [orders, setOrders] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [pageLoading, setPageLoading] = useState(false);

  const fetchOrders = useCallback(
    async (filters = {}) => {
      setPageLoading(true);
      try {
        const params = new URLSearchParams();
        params.append("page", String(filters.page || 1));
        params.append("limit", String(filters.limit || 10));
        if (filters.search) params.append("search", filters.search);
        if (filters.status) params.append("status", filters.status);

        const data = await request(`/api/admin/orders?${params.toString()}`);
        const list = parseList(data, ["orders"]).map((item) => ({
          ...item,
          id: item.id || item.orderId,
          orderId: item.orderId || item.id,
        }));
        setOrders(list);
      } catch (err) {
        console.error("获取订单列表失败:", err);
      } finally {
        setPageLoading(false);
      }
    },
    [request]
  );

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleRefund = async (ids) => {
    if (!confirm(`确定要退款这 ${ids.length} 个订单吗？`)) {
      return;
    }

    setPageLoading(true);
    try {
      for (const id of ids) {
        const target = orders.find((o) => o.id === id || o.orderId === id);
        if (!target?.userId || !target?.orderId) {
          continue;
        }
        await request("/api/admin/orders/refund", {
          method: "POST",
          body: JSON.stringify({ userId: target.userId, orderId: target.orderId }),
        });
      }
      await fetchOrders();
      setSelectedIds([]);
      alert("退款成功");
    } catch (err) {
      console.error("退款失败:", err);
      alert("退款失败");
    } finally {
      setPageLoading(false);
    }
  };

  const handleExport = async (ids) => {
    try {
      const exportData = orders.filter((o) => ids.includes(o.id));
      const csv = [
        ["订单ID", "用户ID", "金额", "状态", "创建时间"].join(","),
        ...exportData.map((o) =>
          [
            o.orderId || o.id,
            o.userId,
            Number(o.amount || 0).toFixed(2),
            o.status,
            o.createdAt ? new Date(o.createdAt).toLocaleDateString("zh-CN") : "-",
          ].join(",")
        ),
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "orders.csv";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("导出失败:", err);
      alert("导出失败");
    }
  };

  const columns = [
    {
      key: "orderId",
      label: "订单ID",
      sortable: true,
    },
    {
      key: "userId",
      label: "用户ID",
      sortable: true,
    },
    {
      key: "amount",
      label: "金额",
      render: (value, row) => `${Number(value || 0).toFixed(2)} ${row.currency || ""}`.trim(),
    },
    {
      key: "status",
      label: "状态",
      render: (value) => {
        const statusMap = {
          PENDING: "待支付",
          PAID: "已支付",
          REFUNDED: "已退款",
          FAILED: "失败",
          pending: "待支付",
          completed: "已完成",
          refunded: "已退款",
          failed: "失败",
        };
        return statusMap[value] || value || "-";
      },
    },
    {
      key: "createdAt",
      label: "创建时间",
      render: (value) => (value ? new Date(value).toLocaleDateString("zh-CN") : "-"),
    },
  ];

  const filterOptions = [
    {
      id: "status",
      label: "订单状态",
      type: "select",
      options: [
        { label: "待支付", value: "PENDING" },
        { label: "已支付", value: "PAID" },
        { label: "已退款", value: "REFUNDED" },
        { label: "失败", value: "FAILED" },
      ],
    },
    {
      id: "createdAt",
      label: "创建时间",
      type: "dateRange",
    },
  ];

  return (
    <AdminLayout title="订单管理" subtitle="订单筛选、导出与退款处理。">
      <div className="space-y-6">
        <AdvancedFilter
          filters={filterOptions}
          onFilter={fetchOrders}
          loading={pageLoading}
        />

        <BulkActions
          selectedIds={selectedIds}
          onDelete={handleRefund}
          onExport={handleExport}
          loading={pageLoading}
        />

        <DataTable
          columns={columns}
          data={orders}
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
