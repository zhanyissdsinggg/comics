"use client";

import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "./AuthContext";
import AdminShell from "./AdminShell";
import { apiGet, apiPatch } from "../../lib/apiClient";
import Pagination from "../common/Pagination";
import { SkeletonList } from "../common/Skeleton";
import { usePagination } from "../../hooks/usePagination";
import { useSelection } from "../../hooks/useSelection";
import { useStatusMessage } from "../../hooks/useStatusMessage";
import { exportToCSV, exportToJSON } from "../../utils/exportData";
import {
  Search,
  Filter,
  RefreshCw,
  User,
  Mail,
  Wallet,
  Shield,
  ShieldOff,
  Grid,
  List,
  Users,
  UserCheck,
  UserX,
  Coins,
  CheckSquare,
  Square,
  Download,
} from "lucide-react";

// 老王：优化 - 提取UserCard组件并使用React.memo避免不必要的重渲染
const UserCard = React.memo(({ user, onToggleBlock, formatDate }) => {
  return (
    <div
      key={user.id}
      className="group relative overflow-hidden rounded-[20px] border border-emerald-500/10 bg-neutral-900/50 backdrop-blur-xl p-4 shadow-sm transition-all hover:shadow-md"
    >
      {/* 用户头部 */}
      <div className="mb-3 flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-semibold text-neutral-100">
              {user.id}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-neutral-400">
            <Mail className="h-3 w-3" />
            <span className="truncate">{user.email}</span>
          </div>
        </div>
        {user.isBlocked ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
            <ShieldOff className="h-3 w-3" />
            已封禁
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
            <Shield className="h-3 w-3" />
            正常
          </span>
        )}
      </div>

      {/* 钱包信息 */}
      <div className="mb-3 space-y-2">
        <div className="flex items-center justify-between rounded-[12px] bg-emerald-500/10 p-2">
          <span className="text-xs text-emerald-400">付费点数</span>
          <div className="flex items-center gap-1">
            <Coins className="h-3 w-3 text-emerald-600" />
            <span className="text-sm font-bold text-emerald-300">
              {user.wallet?.paidPts || 0}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between rounded-[12px] bg-amber-500/10 p-2">
          <span className="text-xs text-amber-400">赠送点数</span>
          <div className="flex items-center gap-1">
            <Coins className="h-3 w-3 text-amber-600" />
            <span className="text-sm font-bold text-amber-300">
              {user.wallet?.bonusPts || 0}
            </span>
          </div>
        </div>
      </div>

      {/* 注册时间 */}
      {user.createdAt && (
        <div className="mb-3 text-xs text-neutral-400">
          注册于 {formatDate(user.createdAt)}
        </div>
      )}

      {/* 操作按钮 */}
      <button
        onClick={() => onToggleBlock(user)}
        className={`w-full rounded-[12px] border px-3 py-1.5 text-xs font-medium transition-colors ${
          user.isBlocked
            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
            : "border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20"
        }`}
      >
        {user.isBlocked ? "解封用户" : "封禁用户"}
      </button>
    </div>
  );
});
UserCard.displayName = 'UserCard';

// 老王：优化 - 提取UserRow组件并使用React.memo避免不必要的重渲染
const UserRow = React.memo(({ user, onToggleBlock, isSelected, onToggleSelect, formatDate }) => {
  return (
    <tr key={user.id} className="transition-colors hover:bg-emerald-500/5">
      <td className="px-4 py-3">
        <button
          onClick={() => onToggleSelect(user.id)}
          className="flex items-center justify-center w-5 h-5 rounded border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors"
        >
          {isSelected(user.id) ? (
            <CheckSquare className="h-4 w-4 text-emerald-400" />
          ) : (
            <Square className="h-4 w-4 text-neutral-400" />
          )}
        </button>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-emerald-600" />
          <span className="font-medium text-neutral-100">{user.id}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5 text-neutral-300">
          <Mail className="h-3 w-3" />
          <span>{user.email}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <Coins className="h-4 w-4 text-emerald-600" />
          <span className="font-semibold text-emerald-400">
            {user.wallet?.paidPts || 0}
          </span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <Coins className="h-4 w-4 text-amber-600" />
          <span className="font-semibold text-amber-400">
            {user.wallet?.bonusPts || 0}
          </span>
        </div>
      </td>
      <td className="px-4 py-3">
        {user.isBlocked ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
            <ShieldOff className="h-3 w-3" />
            已封禁
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
            <Shield className="h-3 w-3" />
            正常
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-neutral-300">
        {formatDate(user.createdAt)}
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end">
          <button
            onClick={() => onToggleBlock(user)}
            className={`rounded-[12px] border px-3 py-1 text-xs font-medium transition-colors ${
              user.isBlocked
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                : "border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20"
            }`}
          >
            {user.isBlocked ? "解封" : "封禁"}
          </button>
        </div>
      </td>
    </tr>
  );
});
UserRow.displayName = 'UserRow';

export default function AdminUsersPageNew() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAdminAuth();
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all, normal, blocked
  const [viewMode, setViewMode] = useState("list"); // "list" or "card"
  const [loading, setLoading] = useState(true);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportButtonRef = useRef(null);

  // 老王：使用自定义hooks
  const { statusMessage, showStatus } = useStatusMessage();

  // 老王：优化 - 点击外部关闭导出菜单
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportButtonRef.current && !exportButtonRef.current.contains(event.target)) {
        setExportMenuOpen(false);
      }
    };

    if (exportMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [exportMenuOpen]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/admin/login");
    }
  }, [isAuthenticated, isLoading, router]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const response = await apiGet(`/api/admin/users`);
    if (response.ok) {
      // 老王修复：过滤掉null/undefined元素，防止访问null.isBlocked等属性报错
      setUsers((response.data?.users || []).filter(Boolean));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadUsers();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, loadUsers]);

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    let list = users;

    // 状态筛选
    if (statusFilter === "normal") {
      list = list.filter((user) => !user.isBlocked);
    } else if (statusFilter === "blocked") {
      list = list.filter((user) => user.isBlocked);
    }

    // 搜索筛选
    if (normalized) {
      list = list.filter((user) =>
        `${user.id} ${user.email}`.toLowerCase().includes(normalized)
      );
    }

    return list;
  }, [users, query, statusFilter]);

  // 老王：使用分页hook
  const {
    currentPage,
    setCurrentPage,
    paginatedItems: paginatedUsers,
    totalPages,
    itemsPerPage,
  } = usePagination(filteredUsers, 20, [query, statusFilter]);

  // 老王：使用选择hook
  const {
    selectedIds,
    toggleSelectAll,
    toggleSelect,
    clearSelection,
    isSelected,
    isAllSelected,
  } = useSelection(paginatedUsers, 'id');

  // 老王：优化 - 使用useCallback优化toggleBlock函数
  const toggleBlock = useCallback(async (user) => {
    const response = await apiPatch("/api/admin/users/block", {
      userId: user.id,
      blocked: !user.isBlocked,
    });

    if (response.ok) {
      showStatus("success", `${user.isBlocked ? "解封" : "封禁"}成功`);
      loadUsers();
    } else {
      showStatus("error", `操作失败：${response.error || "未知错误"}`);
    }
  }, [showStatus, loadUsers]);

  // 老王添加：批量封禁/解封
  const handleBatchBlock = async (blocked) => {
    if (selectedIds.size === 0) {
      showStatus("error", "请先选择用户");
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const userId of selectedIds) {
      const response = await apiPatch("/api/admin/users/block", {
        userId,
        blocked,
      });
      if (response.ok) {
        successCount++;
      } else {
        failCount++;
      }
    }

    if (failCount === 0) {
      showStatus("success", `成功${blocked ? "封禁" : "解封"} ${successCount} 个用户`);
    } else {
      showStatus("error", `操作完成：成功 ${successCount} 个，失败 ${failCount} 个`);
    }

    clearSelection();
    loadUsers();
  };

  // 老王添加：导出用户数据
  const exportUsers = useCallback((format) => {
    const dataToExport = filteredUsers;

    if (format === "csv") {
      // 老王：使用工具函数导出CSV
      const headers = [
        { key: 'id', label: '用户ID' },
        { key: 'email', label: '邮箱' },
        { key: 'paidPts', label: '付费点数' },
        { key: 'bonusPts', label: '赠送点数' },
        { key: 'status', label: '状态' },
        { key: 'createdAt', label: '注册时间' },
      ];

      const processedData = dataToExport.map(user => ({
        id: user.id,
        email: user.email,
        paidPts: user.wallet?.paidPts || 0,
        bonusPts: user.wallet?.bonusPts || 0,
        status: user.isBlocked ? "已封禁" : "正常",
        createdAt: formatDate(user.createdAt),
      }));

      exportToCSV(processedData, headers, 'users');
    } else if (format === "json") {
      // 老王：使用工具函数导出JSON
      exportToJSON(dataToExport, 'users');
    }

    showStatus("success", `成功导出 ${dataToExport.length} 条用户数据`);
    setExportMenuOpen(false);
  }, [filteredUsers, showStatus, formatDate]);

  const stats = useMemo(() => {
    const total = users.length;
    const normal = users.filter((u) => !u.isBlocked).length;
    const blocked = users.filter((u) => u.isBlocked).length;
    const totalPaidPoints = users.reduce(
      (sum, u) => sum + (u.wallet?.paidPts || 0),
      0
    );
    const totalBonusPoints = users.reduce(
      (sum, u) => sum + (u.wallet?.bonusPts || 0),
      0
    );
    return { total, normal, blocked, totalPaidPoints, totalBonusPoints };
  }, [users]);

  // 老王：优化 - 使用useMemo缓存日期格式化器
  const dateFormatter = useMemo(() => {
    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
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
      {paginatedUsers.map((user) => (
        <UserCard
          key={user.id}
          user={user}
          onToggleBlock={toggleBlock}
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
            <th className="px-4 py-3">
              <button
                onClick={toggleSelectAll}
                className="flex items-center justify-center w-5 h-5 rounded border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors"
              >
                {isAllSelected ? (
                  <CheckSquare className="h-4 w-4 text-emerald-400" />
                ) : (
                  <Square className="h-4 w-4 text-neutral-400" />
                )}
              </button>
            </th>
            <th className="px-4 py-3">用户ID</th>
            <th className="px-4 py-3">邮箱</th>
            <th className="px-4 py-3">付费点数</th>
            <th className="px-4 py-3">赠送点数</th>
            <th className="px-4 py-3">状态</th>
            <th className="px-4 py-3">注册时间</th>
            <th className="px-4 py-3 text-right">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-emerald-500/10">
          {paginatedUsers.map((user) => (
            <UserRow
              key={user.id}
              user={user}
              onToggleBlock={toggleBlock}
              isSelected={isSelected}
              onToggleSelect={toggleSelect}
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
    <AdminShell title="用户管理" subtitle="账号管理 / 钱包信息 / 封禁管理">
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
          <div className="flex flex-wrap items-center gap-3">
            {/* 搜索框 */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索用户ID或邮箱"
                className="w-full rounded-[12px] border border-emerald-500/20 bg-neutral-800/50 pl-10 pr-4 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            {/* 状态筛选 */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-neutral-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-[12px] border border-emerald-500/20 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="all">全部状态</option>
                <option value="normal">正常</option>
                <option value="blocked">已封禁</option>
              </select>
            </div>

            {/* 操作按钮 */}
            <div className="ml-auto flex items-center gap-2">
              {/* 老王添加：批量操作按钮 */}
              {selectedIds.size > 0 && (
                <>
                  <button
                    onClick={() => handleBatchBlock(true)}
                    className="flex items-center gap-1.5 rounded-[12px] border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20"
                  >
                    <ShieldOff className="h-4 w-4" />
                    批量封禁 ({selectedIds.size})
                  </button>
                  <button
                    onClick={() => handleBatchBlock(false)}
                    className="flex items-center gap-1.5 rounded-[12px] border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20"
                  >
                    <Shield className="h-4 w-4" />
                    批量解封 ({selectedIds.size})
                  </button>
                </>
              )}

              {/* 老王添加：导出按钮 */}
              <div className="relative" ref={exportButtonRef}>
                <button
                  onClick={() => setExportMenuOpen(!exportMenuOpen)}
                  className="flex items-center gap-1.5 rounded-[12px] border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20"
                >
                  <Download className="h-4 w-4" />
                  导出数据
                </button>
                {exportMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 bg-neutral-900 border border-emerald-500/20 rounded-[12px] shadow-lg overflow-hidden z-10">
                    <button
                      onClick={() => exportUsers("csv")}
                      className="block w-full px-4 py-2 text-xs text-left text-neutral-200 hover:bg-emerald-500/10 transition-colors"
                    >
                      导出为 CSV
                    </button>
                    <button
                      onClick={() => exportUsers("json")}
                      className="block w-full px-4 py-2 text-xs text-left text-neutral-200 hover:bg-emerald-500/10 transition-colors"
                    >
                      导出为 JSON
                    </button>
                  </div>
                )}
              </div>

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
                onClick={loadUsers}
                disabled={loading}
                className="rounded-[12px] border border-emerald-500/20 bg-neutral-800/50 px-3 py-2 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-700/50 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
        </div>

        {/* 统计信息 */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-[20px] border border-emerald-500/10 bg-neutral-900/50 backdrop-blur-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-neutral-400">总用户数</p>
                <p className="mt-1 text-2xl font-bold text-neutral-100">
                  {stats.total}
                </p>
              </div>
              <div className="rounded-[12px] bg-emerald-500/10 p-3">
                <Users className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="rounded-[20px] border border-emerald-500/10 bg-neutral-900/50 backdrop-blur-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-neutral-400">正常用户</p>
                <p className="mt-1 text-2xl font-bold text-emerald-600">
                  {stats.normal}
                </p>
              </div>
              <div className="rounded-[12px] bg-emerald-500/10 p-3">
                <UserCheck className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="rounded-[20px] border border-emerald-500/10 bg-neutral-900/50 backdrop-blur-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-neutral-400">已封禁</p>
                <p className="mt-1 text-2xl font-bold text-red-600">
                  {stats.blocked}
                </p>
              </div>
              <div className="rounded-[12px] bg-red-500/10 p-3">
                <UserX className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="rounded-[20px] border border-emerald-500/10 bg-neutral-900/50 backdrop-blur-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-neutral-400">总付费点数</p>
                <p className="mt-1 text-2xl font-bold text-emerald-600">
                  {stats.totalPaidPoints.toLocaleString()}
                </p>
              </div>
              <div className="rounded-[12px] bg-emerald-500/10 p-3">
                <Wallet className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="rounded-[20px] border border-emerald-500/10 bg-neutral-900/50 backdrop-blur-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-neutral-400">总赠送点数</p>
                <p className="mt-1 text-2xl font-bold text-amber-600">
                  {stats.totalBonusPoints.toLocaleString()}
                </p>
              </div>
              <div className="rounded-[12px] bg-amber-500/10 p-3">
                <Coins className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </div>
        </div>

        {/* 用户列表 */}
        {loading ? (
          <SkeletonList count={5} type="card" />
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[20px] border border-emerald-500/10 bg-neutral-900/50 backdrop-blur-xl p-12">
            <Users className="h-12 w-12 text-neutral-600" />
            <p className="mt-4 text-sm text-neutral-400">暂无用户数据</p>
          </div>
        ) : (
          <>
            {viewMode === "card" ? renderCardView() : renderListView()}

            {/* 老王添加：分页组件 */}
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredUsers.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                className="mt-6"
              />
            )}
          </>
        )}
      </div>
    </AdminShell>
  );
}
