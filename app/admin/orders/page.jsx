"use client";

import { useState, useEffect } from "react";
import { AdminLayout } from "../../../components/admin/AdminLayout";
import { DataTable } from "../../../components/admin/DataTable";
import { BulkActions } from "../../../components/admin/BulkActions";
import { AdvancedFilter } from "../../../components/admin/AdvancedFilter";
import { useAdminApi } from "../../../lib/hooks/useAdminApi";

/**
 * 老王注释：优化后的Orders管理页面 - 使用新的组件和Hook
 * 这个SB页面简洁多了，因为把复杂逻辑都提取到组件和Hook里了
 */
export default function OrdersPage() {
  const { request, loading, error } = useAdminApi();
  const [orders, setOrders] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [pageLoading, setPageLoading] = useState(false);

  // 老王说：初始化加载
  useEffect(() => {
    const fetchOrders = async (filters = {}) => {
      setPageLoading(true);
      try {
        const params = new URLSearchParams();
        params.append("page", filters.page || 1);
        params.append("limit", filters.limit || 10);
        if (filters.search) params.append("search", filters.search);
        if (filters.status) params.append("status", filters.status);

        const data = await request(`/api/admin/orders?${params.toString()}`);
        setOrders(data.data || []);
      } catch (err) {
        console.error("获取订单列表失败:", err);
      } finally {
        setPageLoading(false);
      }
    };
    fetchOrders();
  }, [request]);

  // 老王说：处理退款
  const handleRefund = async (ids) => {
    if (!confirm(`确定要退款这 ${ids.length} 个订单吗？`)) {
      return;
    }

    setPageLoading(true);
    try {
      for (const id of ids) {
        await request(`/api/admin/orders/${id}/refund`, {
          method: "POST",
        });
      }
      fetchOrders();
      setSelectedIds([]);
      alert("退款成功");
    } catch (err) {
      console.error("退款失败:", err);
      alert("退款失败");
    } finally {
      setPageLoading(false);
    }
  };

  // 老王说：处理导出
  const handleExport = async (ids) => {
    try {
      const exportData = orders.filter((o) => ids.includes(o.id));
      const csv = [
        ["订单ID", "用户ID", "金额", "状态", "创建时间"].join(","),
        ...exportData.map((o) =>
          [
            o.id,
            o.userId,
            `¥${(o.amount / 100).toFixed(2)}`,
            o.status,
            new Date(o.createdAt).toLocaleDateString("zh-CN"),
          ].join(",")
        ),
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "orders.csv";
      a.click();
    } catch (err) {
      console.error("导出失败:", err);
      alert("导出失败");
    }
  };

  // 老王说：表格列定义
  const columns = [
    {
      key: "id",
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
      render: (value) => `¥${(value / 100).toFixed(2)}`,
    },
    {
      key: "status",
      label: "状态",
      render: (value) => {
        const statusMap = {
          pending: "待支付",
          completed: "已完成",
          refunded: "已退款",
          failed: "失败",
        };
        return statusMap[value] || value;
      },
    },
    {
      key: "createdAt",
      label: "创建时间",
      render: (value) => new Date(value).toLocaleDateString("zh-CN"),
    },
  ];

  // 老王说：高级过滤选项
  const filterOptions = [
    {
      id: "status",
      label: "订单状态",
      type: "select",
      options: [
        { label: "待支付", value: "pending" },
        { label: "已完成", value: "completed" },
        { label: "已退款", value: "refunded" },
        { label: "失败", value: "failed" },
      ],
    },
    {
      id: "createdAt",
      label: "创建时间",
      type: "dateRange",
    },
  ];

  return (
    <AdminLayout title="订单管理">
      <div className="space-y-6">
        {/* 老王说：高级搜索过滤 */}
        <AdvancedFilter
          filters={filterOptions}
          onFilter={(filters) => fetchOrders(filters)}
          loading={pageLoading}
        />

        {/* 老王说：批量操作工具栏 */}
        <BulkActions
          selectedIds={selectedIds}
          onDelete={handleRefund}
          onExport={handleExport}
          loading={pageLoading}
        />

        {/* 老王说：数据表格 */}
        <DataTable
          columns={columns}
          data={orders}
          loading={pageLoading}
          error={error}
          selectable={true}
          onSelectionChange={setSelectedIds}
          sortable={true}
          paginated={true}
          pageSize={10}
          onRowClick={(row) => {
            // 老王说：点击行跳转到订单详情页
            window.location.href = `/admin/orders/${row.id}`;
          }}
        />
      </div>
    </AdminLayout>
  );
}
