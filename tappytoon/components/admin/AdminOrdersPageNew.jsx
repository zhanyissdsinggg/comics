"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "./AuthContext";
import { apiGet, apiPost } from "../../lib/apiClient";
import Pagination from "../common/Pagination";
import { usePagination } from "../../hooks/usePagination";
import { useStatusMessage } from "../../hooks/useStatusMessage";
import { exportToCSV, exportToJSON } from "../../utils/exportData";
import {
  Search,
  Filter,
  Download,
  RefreshCw,
  CreditCard,
  DollarSign,
  Calendar,
  User,
  Grid,
  List,
  CheckCircle,
  Clock,
  XCircle,
  RotateCcw,
} from "lucide-react";

// 老王：优化 - 提取OrderCard组件并使用React.memo避免不必要的重渲染
const OrderCard = React.memo(({ order, onAdjust, onRefund, getStatusBadge, formatDate }) => {
  return (
    <div
      key={order.orderId}
      className="group relative overflow-hidden rounded-[20px] border border-emerald-500/10 bg-neutral-900/50 backdrop-blur-xl p-4 shadow-sm transition-all hover:shadow-md"
    >
      {/* 订单头部 */}
      <div className="mb-3 flex items-start justify-between">
    <div className="flex-1">
      <div className="flex items-center gap-2">
        <CreditCard className="h-4 w-4 text-emerald-600" />
        <span className="text-sm font-semibold text-neutral-100">
          {order.orderId}
        </span>
      </div>
      <div className="mt-1 flex items-center gap-1.5 text-xs text-neutral-400">
        <User className="h-3 w-3" />
        <span>{order.userId}</span>
      </div>
    </div>
    {getStatusBadge(order.status)}
      </div>

      {/* 金额信息 */}
      <div className="mb-3 rounded-[12px] bg-emerald-500/10 p-3">
    <div className="flex items-center justify-between">
      <span className="text-xs text-emerald-400">订单金额</span>
      <div className="flex items-center gap-1">
        <DollarSign className="h-4 w-4 text-emerald-600" />
        <span className="text-lg font-bold text-emerald-300">
          {order.amount}
        </span>
        <span className="text-xs text-emerald-400">{order.currency}</span>
      </div>
    </div>
      </div>

      {/* 时间信息 */}
      <div className="mb-3 flex items-center gap-1.5 text-xs text-neutral-400">
    <Calendar className="h-3 w-3" />
    <span>{formatDate(order.createdAt || order.paidAt)}</span>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-2">
    <button
      onClick={() => onAdjust(order)}
      className="flex-1 rounded-[12px] border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20"
    >
      补点
    </button>
    <button
      onClick={() => onRefund(order)}
      disabled={order.status !== "PAID"}
      className="flex-1 rounded-[12px] border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
    >
      退款
    </button>
      </div>
    </div>
  );
});
OrderCard.displayName = 'OrderCard';

// 老王：优化 - 提取OrderRow组件并使用React.memo避免不必要的重渲染
const OrderRow = React.memo(({ order, onAdjust, onRefund, getStatusBadge, formatDate }) => {
  return (
    <tr key={order.orderId} className="transition-colors hover:bg-emerald-500/5">
      <td className="px-4 py-3">
    <div className="flex items-center gap-2">
      <CreditCard className="h-4 w-4 text-emerald-600" />
      <span className="font-medium text-neutral-100">{order.orderId}</span>
    </div>
      </td>
      <td className="px-4 py-3">
    <div className="flex items-center gap-1.5 text-neutral-300">
      <User className="h-3 w-3" />
      <span>{order.userId}</span>
    </div>
      </td>
      <td className="px-4 py-3">
    <div className="flex items-center gap-1">
      <DollarSign className="h-4 w-4 text-emerald-600" />
      <span className="font-semibold text-emerald-300">{order.amount}</span>
      <span className="text-xs text-neutral-400">{order.currency}</span>
    </div>
      </td>
      <td className="px-4 py-3">{getStatusBadge(order.status)}</td>
      <td className="px-4 py-3 text-neutral-300">
    {formatDate(order.createdAt || order.paidAt)}
      </td>
      <td className="px-4 py-3">
    <div className="flex justify-end gap-2">
      <button
        onClick={() => onAdjust(order)}
        className="rounded-[12px] border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20"
      >
        补点
      </button>
      <button
        onClick={() => onRefund(order)}
        disabled={order.status !== "PAID"}
        className="rounded-[12px] border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        退款
      </button>
    </div>
      </td>
    </tr>
  );
});
OrderRow.displayName = 'OrderRow';

export default function AdminOrdersPageNew() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAdminAuth();
  const [orders, setOrders] = useState([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [viewMode, setViewMode] = useState("list"); // "list" or "card"
  const [adjustModal, setAdjustModal] = useState({ open: false, order: null });
  const [adjustForm, setAdjustForm] = useState({ paidDelta: "", bonusDelta: "" });
  const [loading, setLoading] = useState(true);

  // 老王：使用自定义hooks
  const { statusMessage, showStatus } = useStatusMessage();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/admin/login");
    }
  }, [isAuthenticated, isLoading, router]);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    const response = await apiGet(`/api/admin/orders`);
    if (response.ok) {
      // 老王修复：过滤掉null/undefined元素，防止访问null.status等属性报错
      setOrders((response.data?.orders || []).filter(Boolean));
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
      return matchesStatus && matchesQuery && matchesFrom && matchesTo;
    });
  }, [orders, query, statusFilter, dateFrom, dateTo]);

  // 老王：使用分页hook
  const {
    currentPage,
    setCurrentPage,
    paginatedItems: paginatedOrders,
    totalPages,
    itemsPerPage,
  } = usePagination(filteredOrders, 20, [query, statusFilter, dateFrom, dateTo]);

  const exportOrders = useCallback((format = "json") => {
    if (format === "csv") {
      // 老王：使用工具函数导出CSV
      const headers = [
    { key: 'orderId', label: 'orderId' },
    { key: 'userId', label: 'userId' },
    { key: 'amount', label: 'amount' },
    { key: 'currency', label: 'currency' },
    { key: 'status', label: 'status' },
    { key: 'createdAt', label: 'createdAt' },
      ];
      exportToCSV(filteredOrders, headers, 'orders');
      return;
    }
    // 老王：使用工具函数导出JSON
    exportToJSON(filteredOrders, 'orders');
  }, [filteredOrders]);

  const handleRefund = useCallback(async (order) => {
    const response = await apiPost("/api/admin/orders/refund", {
      userId: order.userId,
      orderId: order.orderId,
    });

    if (response.ok) {
      showStatus("success", "退款成功");
      loadOrders();
    } else {
      showStatus("error", `退款失败：${response.error || "未知错误"}`);
    }
  }, [showStatus, loadOrders]);

  const handleAdjust = useCallback(async (order) => {
    setAdjustModal({ open: true, order });
    setAdjustForm({ paidDelta: "", bonusDelta: "" });
  }, []);

  const confirmAdjust = async () => {
    if (!adjustModal.order) return;

    const paidDelta = Number(adjustForm.paidDelta || 0);
    const bonusDelta = Number(adjustForm.bonusDelta || 0);

    if (paidDelta < 0 || bonusDelta < 0) {
      showStatus("error", "补点数量不能为负数");
      return;
    }

    if (paidDelta > 10000 || bonusDelta > 10000) {
      showStatus("error", "单次补点不能超过10000");
      return;
    }

    const response = await apiPost("/api/admin/orders/adjust", {
      userId: adjustModal.order.userId,
      paidDelta,
      bonusDelta,
    });

    if (response.ok) {
      showStatus("success", "补点成功");
      setAdjustModal({ open: false, order: null });
      loadOrders();
    } else {
      showStatus("error", `补点失败：${response.error || "未知错误"}`);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "PAID":
    return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case "PENDING":
    return <Clock className="h-4 w-4 text-amber-500" />;
      case "FAILED":
    return <XCircle className="h-4 w-4 text-red-500" />;
      case "REFUNDED":
    return <RotateCcw className="h-4 w-4 text-slate-500" />;
      default:
    return null;
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      PAID: "bg-emerald-50 text-emerald-700 border-emerald-200",
      PENDING: "bg-amber-50 text-amber-700 border-amber-200",
      FAILED: "bg-red-50 text-red-700 border-red-200",
      REFUNDED: "bg-slate-50 text-slate-700 border-slate-200",
    };
    const labels = {
      PAID: "已支付",
      PENDING: "待支付",
      FAILED: "失败",
      REFUNDED: "已退款",
    };
    return (
      <span
    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
      styles[status] || "bg-slate-50 text-slate-700 border-slate-200"
    }`}
      >
    {getStatusIcon(status)}
    {labels[status] || status}
      </span>
    );
  };

  // 老王：优化 - 使用useMemo缓存日期格式化器
  const dateFormatter = useMemo(() => {
    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  // 老王：优化 - 使用useCallback优化formatDate函数
  const formatDate = useCallback((dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return dateFormatter.format(date);
  }, [dateFormatter]);

  const renderCardView = () => (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {paginatedOrders.map((order) => (
    <OrderCard
      key={order.orderId}
      order={order}
      onAdjust={handleAdjust}
      onRefund={handleRefund}
      getStatusBadge={getStatusBadge}
      formatDate={formatDate}
    />
      ))}
    </div>
  );

  const renderListView = () => (
    <div className="overflow-hidden rounded-[20px] border border-emerald-500/10 bg-neutral-900/50 backdrop-blur-xl shadow-sm">
      <table className="w-full text-left text-sm">
    <thead className="bg-emerald-500/10 text-xs font-semibold text-emerald-400">
      <tr>
        <th className="px-4 py-3">订单号</th>
        <th className="px-4 py-3">用户ID</th>
        <th className="px-4 py-3">金额</th>
        <th className="px-4 py-3">状态</th>
        <th className="px-4 py-3">创建时间</th>
        <th className="px-4 py-3 text-right">操作</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-emerald-500/10">
      {paginatedOrders.map((order) => (
        <OrderRow
          key={order.orderId}
          order={order}
          onAdjust={handleAdjust}
          onRefund={handleRefund}
          getStatusBadge={getStatusBadge}
          formatDate={formatDate}
        />
      ))}
    </tbody>
      </table>
    </div>
  );

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <div className="space-y-6">
    {/* 状态通知 */}
    {statusMessage.text && (
      <div
        className={`rounded-[12px] border px-4 py-3 ${
          statusMessage.type === "success"
            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
            : "border-red-500/20 bg-red-500/10 text-red-400"
        }`}
      >
        {statusMessage.text}
      </div>
    )}

    {/* 筛选和操作栏 */}
    <div className="rounded-[20px] border border-emerald-500/10 bg-neutral-900/50 backdrop-blur-xl p-4 shadow-sm">
      <div className="space-y-4">
        {/* 第一行：搜索和状态筛选 */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索订单号或用户ID"
              className="w-full rounded-[12px] border border-emerald-500/20 bg-neutral-800/50 pl-10 pr-4 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-neutral-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-[12px] border border-emerald-500/20 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="all">全部状态</option>
              <option value="PAID">已支付</option>
              <option value="PENDING">待支付</option>
              <option value="FAILED">失败</option>
              <option value="REFUNDED">已退款</option>
            </select>
          </div>
        </div>

        {/* 第二行：日期筛选和操作按钮 */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-neutral-400" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-[12px] border border-emerald-500/20 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            <span className="text-sm text-neutral-400">至</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-[12px] border border-emerald-500/20 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* 视图切换 */}
            <div className="flex rounded-[12px] border border-emerald-500/20 bg-neutral-800/50 p-1">
              <button
                onClick={() => setViewMode("list")}
                className={`rounded-[8px] px-3 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === "list"
                    ? "bg-emerald-500 text-white"
                    : "text-neutral-400 hover:bg-neutral-700/50"
                }`}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("card")}
                className={`rounded-[8px] px-3 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === "card"
                    ? "bg-emerald-500 text-white"
                    : "text-neutral-400 hover:bg-neutral-700/50"
                }`}
              >
                <Grid className="h-4 w-4" />
              </button>
            </div>

            {/* 刷新按钮 */}
            <button
              onClick={loadOrders}
              disabled={loading}
              className="rounded-[12px] border border-emerald-500/20 bg-neutral-800/50 px-3 py-2 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-700/50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>

            {/* 导出按钮 */}
            <button
              onClick={() => exportOrders("json")}
              className="flex items-center gap-2 rounded-[12px] border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20"
            >
              <Download className="h-4 w-4" />
              JSON
            </button>
            <button
              onClick={() => exportOrders("csv")}
              className="flex items-center gap-2 rounded-[12px] border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20"
            >
              <Download className="h-4 w-4" />
              CSV
            </button>
          </div>
        </div>
      </div>
    </div>

    {/* 统计信息 */}
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-[20px] border border-emerald-500/10 bg-neutral-900/50 backdrop-blur-xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-neutral-400">总订单数</p>
            <p className="mt-1 text-2xl font-bold text-neutral-100">
              {filteredOrders.length}
            </p>
          </div>
          <div className="rounded-[12px] bg-emerald-500/10 p-3">
            <CreditCard className="h-6 w-6 text-emerald-600" />
          </div>
        </div>
      </div>

      <div className="rounded-[20px] border border-emerald-500/10 bg-neutral-900/50 backdrop-blur-xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-neutral-400">已支付</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">
              {filteredOrders.filter((o) => o.status === "PAID").length}
            </p>
          </div>
          <div className="rounded-[12px] bg-emerald-500/10 p-3">
            <CheckCircle className="h-6 w-6 text-emerald-600" />
          </div>
        </div>
      </div>

      <div className="rounded-[20px] border border-emerald-500/10 bg-neutral-900/50 backdrop-blur-xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-neutral-400">待支付</p>
            <p className="mt-1 text-2xl font-bold text-amber-600">
              {filteredOrders.filter((o) => o.status === "PENDING").length}
            </p>
          </div>
          <div className="rounded-[12px] bg-amber-500/10 p-3">
            <Clock className="h-6 w-6 text-amber-600" />
          </div>
        </div>
      </div>

      <div className="rounded-[20px] border border-emerald-500/10 bg-neutral-900/50 backdrop-blur-xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-neutral-400">总金额</p>
            <p className="mt-1 text-2xl font-bold text-neutral-100">
              {filteredOrders
                .filter((o) => o.status === "PAID")
                .reduce((sum, o) => sum + (o.amount || 0), 0)
                .toFixed(2)}
            </p>
          </div>
          <div className="rounded-[12px] bg-emerald-500/10 p-3">
            <DollarSign className="h-6 w-6 text-emerald-600" />
          </div>
        </div>
      </div>
    </div>

    {/* 订单列表 */}
    {loading ? (
      <div className="flex items-center justify-center rounded-[20px] border border-emerald-500/10 bg-neutral-900/50 backdrop-blur-xl p-12">
        <RefreshCw className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    ) : filteredOrders.length === 0 ? (
      <div className="flex flex-col items-center justify-center rounded-[20px] border border-emerald-500/10 bg-neutral-900/50 backdrop-blur-xl p-12">
        <CreditCard className="h-12 w-12 text-neutral-600" />
        <p className="mt-4 text-sm text-neutral-400">暂无订单数据</p>
      </div>
    ) : (
      <>
        {viewMode === "card" ? renderCardView() : renderListView()}

        {/* 老王添加：分页组件 */}
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredOrders.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            className="mt-6"
          />
        )}
      </>
    )}
      </div>

      {/* 补点模态框 */}
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-[20px] border border-emerald-500/10 bg-neutral-900/95 backdrop-blur-xl p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-neutral-100">补点</h3>
        <p className="mt-1 text-sm text-neutral-400">
          用户ID: {adjustModal.order?.userId}
        </p>
        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-neutral-300">
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
              className="mt-1 w-full rounded-[12px] border border-emerald-500/20 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-300">
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
              className="mt-1 w-full rounded-[12px] border border-emerald-500/20 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <p className="text-xs text-neutral-400">
            ⚠️ 单次补点上限：10000点
          </p>
        </div>
        <div className="mt-6 flex gap-3">
          <button
            onClick={confirmAdjust}
            className="flex-1 rounded-[12px] bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            确认补点
          </button>
          <button
            onClick={() => setAdjustModal({ open: false, order: null })}
            className="flex-1 rounded-[12px] border border-emerald-500/20 px-4 py-2 text-sm font-semibold text-neutral-300 transition-colors hover:bg-neutral-800/50"
          >
            取消
          </button>
        </div>
      </div>
    </div>
      )}
    </div>
  );
}
