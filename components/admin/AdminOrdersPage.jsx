"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import AdminShell from "./AdminShell";
import { apiGet, apiPost } from "../../lib/apiClient";

const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || "admin";

export default function AdminOrdersPage() {
  const searchParams = useSearchParams();
  const key = searchParams.get("key") || "";
  const isAuthorized = key === ADMIN_KEY;
  const [orders, setOrders] = useState([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    const response = await apiGet(`/api/admin/orders?key=${key}`);
    if (response.ok) {
      setOrders(response.data?.orders || []);
    }
    setLoading(false);
  }, [key]);

  useEffect(() => {
    if (isAuthorized) {
      loadOrders();
    } else {
      setLoading(false);
    }
  }, [isAuthorized, loadOrders]);

  const filteredOrders = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesStatus =
        statusFilter === "all" ? true : order.status === statusFilter;
      const matchesQuery = normalizedQuery
        ? `${order.orderId} ${order.userId}`.toLowerCase().includes(normalizedQuery)
        : true;
      const createdAt = Date.parse(order.createdAt || order.paidAt || "");
      const fromTs = dateFrom ? Date.parse(dateFrom) : null;
      const toTs = dateTo ? Date.parse(dateTo) : null;
      const matchesFrom = fromTs ? createdAt >= fromTs : true;
      const matchesTo = toTs ? createdAt <= toTs + 24 * 60 * 60 * 1000 : true;
      return matchesStatus && matchesQuery;
    });
  }, [orders, query, statusFilter, dateFrom, dateTo]);

  const exportOrders = (format = "json") => {
    if (format === "csv") {
      const header = ["orderId", "userId", "amount", "currency", "status", "createdAt"];
      const rows = filteredOrders.map((order) =>
        [
          order.orderId,
          order.userId,
          order.amount,
          order.currency,
          order.status,
          order.createdAt,
        ].join(",")
      );
      const content = [header.join(","), ...rows].join("\n");
      const blob = new Blob([content], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "orders-export.csv";
      link.click();
      URL.revokeObjectURL(url);
      return;
    }
    const content = JSON.stringify(filteredOrders, null, 2);
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "orders-export.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleRefund = async (order) => {
    await apiPost("/api/admin/orders/refund", {
      key,
      userId: order.userId,
      orderId: order.orderId,
    });
    loadOrders();
  };

  const handleAdjust = async (order) => {
    const paidDelta = Number(window.prompt("补点（paid）", "0") || 0);
    const bonusDelta = Number(window.prompt("补点（bonus）", "0") || 0);
    await apiPost("/api/admin/orders/adjust", {
      key,
      userId: order.userId,
      paidDelta,
      bonusDelta,
    });
  };

  if (!isAuthorized) {
    return (
      <AdminShell title="403 Forbidden" subtitle="无效的管理员密钥">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">403 Forbidden</h2>
            <p className="mt-2 text-sm text-slate-500">Invalid admin key.</p>
          </div>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="订单管理" subtitle="订单查询 / 导出 / 退款">
      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索订单号或用户ID"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="all">全部状态</option>
              <option value="PAID">已支付</option>
              <option value="PENDING">待支付</option>
              <option value="FAILED">失败</option>
              <option value="REFUNDED">已退款</option>
            </select>
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600"
            />
            <button
              type="button"
              onClick={() => exportOrders("json")}
              className="rounded-full border border-slate-200 px-3 py-2 text-xs text-slate-600"
            >
              导出 JSON
            </button>
            <button
              type="button"
              onClick={() => exportOrders("csv")}
              className="rounded-full border border-slate-200 px-3 py-2 text-xs text-slate-600"
            >
              导出 CSV
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3">订单号</th>
                <th className="px-4 py-3">用户</th>
                <th className="px-4 py-3">金额</th>
                <th className="px-4 py-3">状态</th>
                <th className="px-4 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.map((order) => (
                <tr key={order.orderId}>
                  <td className="px-4 py-3 text-slate-700">{order.orderId}</td>
                  <td className="px-4 py-3 text-slate-500">{order.userId}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {order.amount} {order.currency}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{order.status}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleAdjust(order)}
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600"
                      >
                        补点
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRefund(order)}
                        className="rounded-full border border-red-200 px-3 py-1 text-xs text-red-600"
                        disabled={order.status !== "PAID"}
                      >
                        退款
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filteredOrders.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-sm text-slate-400" colSpan={5}>
                    暂无订单
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}
