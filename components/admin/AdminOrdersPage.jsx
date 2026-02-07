"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "./AuthContext";
import AdminShell from "./AdminShell";
import { apiGet, apiPost } from "../../lib/apiClient";

export default function AdminOrdersPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAdminAuth();
  const [orders, setOrders] = useState([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  // 老王注释：添加补点模态框状态
  const [adjustModal, setAdjustModal] = useState({ open: false, order: null });
  const [adjustForm, setAdjustForm] = useState({ paidDelta: "", bonusDelta: "" });
  const [loading, setLoading] = useState(true);

  // 老王说：检查认证状态，未登录则重定向
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/admin/login");
    }
  }, [isAuthenticated, isLoading, router]);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    const response = await apiGet(`/api/admin/orders`);
    if (response.ok) {
      setOrders(response.data?.orders || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadOrders();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, loadOrders]);

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
      // 老王注释：修复日期筛选bug - 添加日期匹配条件
      return matchesStatus && matchesQuery && matchesFrom && matchesTo;
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

  // 老王注释：改进补点UI - 使用模态框替代window.prompt
  const handleAdjust = async (order) => {
    setAdjustModal({ open: true, order });
    setAdjustForm({ paidDelta: "", bonusDelta: "" });
  };

  const confirmAdjust = async () => {
    if (!adjustModal.order) return;

    const paidDelta = Number(adjustForm.paidDelta || 0);
    const bonusDelta = Number(adjustForm.bonusDelta || 0);

    // 前端验证
    if (paidDelta < 0 || bonusDelta < 0) {
      alert("❌ 补点数量不能为负数");
      return;
    }

    if (paidDelta > 10000 || bonusDelta > 10000) {
      alert("❌ 单次补点不能超过10000");
      return;
    }

    const response = await apiPost("/api/admin/orders/adjust", {
      key,
      userId: adjustModal.order.userId,
      paidDelta,
      bonusDelta,
    });

    if (response.ok) {
      alert("✅ 补点成功");
      setAdjustModal({ open: false, order: null });
      loadOrders();
    } else {
      alert(`❌ 补点失败：${response.error || "未知错误"}`);
    }
  };

  // 老王说：如果正在加载或未认证，显示加载状态
  if (isLoading || !isAuthenticated) {
    return null;
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

      {/* 老王注释：补点模态框 - 替代window.prompt，提供更好的用户体验 */}
      {adjustModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">补点</h3>
            <p className="mt-1 text-sm text-slate-500">
              用户ID: {adjustModal.order?.userId}
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  付费点数 (Paid Points)
                </label>
                <input
                  type="number"
                  min="0"
                  max="10000"
                  value={adjustForm.paidDelta}
                  onChange={(e) =>
                    setAdjustForm((prev) => ({ ...prev, paidDelta: e.target.value }))
                  }
                  placeholder="输入补点数量"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  赠送点数 (Bonus Points)
                </label>
                <input
                  type="number"
                  min="0"
                  max="10000"
                  value={adjustForm.bonusDelta}
                  onChange={(e) =>
                    setAdjustForm((prev) => ({ ...prev, bonusDelta: e.target.value }))
                  }
                  placeholder="输入补点数量"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                />
              </div>
              <p className="text-xs text-slate-500">
                ⚠️ 单次补点上限：10000点
              </p>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={confirmAdjust}
                className="flex-1 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                确认补点
              </button>
              <button
                onClick={() => setAdjustModal({ open: false, order: null })}
                className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
