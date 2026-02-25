"use client";

import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "./AuthContext";
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
  MessageSquare,
  User,
  Eye,
  EyeOff,
  Star,
  Calculator,
  Grid,
  List,
  MessageCircle,
  CheckCircle,
  XCircle,
  Clock,
  CheckSquare,
  Square,
  Trash2,
  Download,
} from "lucide-react";

// 老王：优化 - 提取CommentCard组件并使用React.memo避免不必要的重渲染
const CommentCard = React.memo(({ comment, onToggleHidden, onRecalcRating, formatDate }) => {
  return (
    <div
      key={comment.id}
      className="group relative overflow-hidden rounded-[20px] border border-emerald-500/10 bg-neutral-900/50 backdrop-blur-xl p-4 shadow-sm transition-all hover:shadow-md"
    >
      {/* 评论头部 */}
      <div className="mb-3 flex items-start justify-between">
    <div className="flex-1">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-emerald-600" />
        <span className="text-sm font-semibold text-neutral-100">
          {comment.seriesId}
        </span>
        {comment.rating && (
          <div className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5">
            <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
            <span className="text-xs font-medium text-amber-700">
              {comment.rating}
            </span>
          </div>
        )}
      </div>
      <div className="mt-1 flex items-center gap-2 text-xs text-neutral-400">
        <User className="h-3 w-3" />
        <span>{comment.author || comment.userId}</span>
        <Clock className="h-3 w-3" />
        <span>{formatDate(comment.createdAt)}</span>
      </div>
    </div>
    {comment.hidden ? (
      <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
        <EyeOff className="h-3 w-3" />
        已屏蔽
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
        <Eye className="h-3 w-3" />
        正常
      </span>
    )}
      </div>

      {/* 评论内容 */}
      <div className="mb-3 rounded-[12px] bg-slate-50 p-3">
    <p className="text-sm text-slate-700">{comment.text}</p>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-2">
    <button
      onClick={() => onRecalcRating(comment.seriesId)}
      className="flex-1 flex items-center justify-center gap-1.5 rounded-[12px] border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
    >
      <Calculator className="h-3 w-3" />
      重算评分
    </button>
    <button
      onClick={() => onToggleHidden(comment)}
      className={`flex-1 flex items-center justify-center gap-1.5 rounded-[12px] border px-3 py-1.5 text-xs font-medium transition-colors ${
        comment.hidden
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
          : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
      }`}
    >
      {comment.hidden ? (
        <>
          <Eye className="h-3 w-3" />
          取消屏蔽
        </>
      ) : (
        <>
          <EyeOff className="h-3 w-3" />
          屏蔽
        </>
      )}
    </button>
      </div>
    </div>
  );
});
CommentCard.displayName = 'CommentCard';

// 老王：优化 - 提取CommentRow组件并使用React.memo避免不必要的重渲染
const CommentRow = React.memo(({ comment, onToggleHidden, onRecalcRating, isSelected, onToggleSelect, formatDate }) => {
  return (
    <tr key={comment.id} className="transition-colors hover:bg-slate-50">
      <td className="px-4 py-3">
    <button
      onClick={() => onToggleSelect(comment.id)}
      className="flex items-center justify-center w-5 h-5 rounded border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors"
    >
      {isSelected(comment.id) ? (
        <CheckSquare className="h-4 w-4 text-emerald-600" />
      ) : (
        <Square className="h-4 w-4 text-neutral-400" />
      )}
    </button>
      </td>
      <td className="px-4 py-3">
    <div className="flex items-center gap-2">
      <MessageSquare className="h-4 w-4 text-emerald-600" />
      <span className="font-medium text-neutral-100">
        {comment.seriesId}
      </span>
    </div>
      </td>
      <td className="px-4 py-3">
    <div className="flex items-center gap-1.5 text-neutral-300">
      <User className="h-3 w-3" />
      <span className="text-xs">
        {comment.author || comment.userId}
      </span>
    </div>
      </td>
      <td className="px-4 py-3">
    {comment.rating ? (
      <div className="flex items-center gap-1">
        <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
        <span className="font-semibold text-amber-900">
          {comment.rating}
        </span>
      </div>
    ) : (
      <span className="text-xs text-slate-400">-</span>
    )}
      </td>
      <td className="px-4 py-3">
    <p className="max-w-md truncate text-neutral-300">{comment.text}</p>
      </td>
      <td className="px-4 py-3 text-xs text-neutral-400">
    {formatDate(comment.createdAt)}
      </td>
      <td className="px-4 py-3">
    {comment.hidden ? (
      <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
        <EyeOff className="h-3 w-3" />
        已屏蔽
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
        <Eye className="h-3 w-3" />
        正常
      </span>
    )}
      </td>
      <td className="px-4 py-3">
    <div className="flex justify-end gap-2">
      <button
        onClick={() => onRecalcRating(comment.seriesId)}
        className="rounded-[12px] border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
        title="重算评分"
      >
        <Calculator className="h-3 w-3" />
      </button>
      <button
        onClick={() => onToggleHidden(comment)}
        className={`rounded-[12px] border px-2 py-1 text-xs font-medium transition-colors ${
          comment.hidden
            ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
        }`}
        title={comment.hidden ? "取消屏蔽" : "屏蔽"}
      >
        {comment.hidden ? (
          <Eye className="h-3 w-3" />
        ) : (
          <EyeOff className="h-3 w-3" />
        )}
      </button>
    </div>
      </td>
    </tr>
  );
});
CommentRow.displayName = 'CommentRow';

export default function AdminCommentsPageNew() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAdminAuth();
  const [comments, setComments] = useState([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all, visible, hidden
  const [viewMode, setViewMode] = useState("card"); // "list" or "card"
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

  const loadComments = useCallback(async () => {
    setLoading(true);
    const response = await apiGet(`/api/admin/comments`);
    if (response.ok) {
      // 老王修复：过滤掉null/undefined元素，防止访问null.hidden等属性报错
      setComments((response.data?.comments || []).filter(Boolean));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadComments();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, loadComments]);

  const filteredComments = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    let list = comments;

    // 状态筛选
    if (statusFilter === "visible") {
      list = list.filter((comment) => !comment.hidden);
    } else if (statusFilter === "hidden") {
      list = list.filter((comment) => comment.hidden);
    }

    // 搜索筛选
    if (normalized) {
      list = list.filter((item) =>
    `${item.seriesId} ${item.text} ${item.author || item.userId}`
      .toLowerCase()
      .includes(normalized)
      );
    }

    return list;
  }, [comments, query, statusFilter]);

  // 老王：使用分页hook
  const {
    currentPage,
    setCurrentPage,
    paginatedItems: paginatedComments,
    totalPages,
    itemsPerPage,
  } = usePagination(filteredComments, 20, [query, statusFilter]);

  // 老王：使用选择hook
  const {
    selectedIds,
    toggleSelectAll,
    toggleSelect,
    clearSelection,
    isSelected,
    isAllSelected,
  } = useSelection(paginatedComments, 'id');

  // 老王：优化 - 使用useCallback优化toggleHidden函数
  const toggleHidden = useCallback(async (comment) => {
    const response = await apiPatch("/api/admin/comments/hide", {
      seriesId: comment.seriesId,
      commentId: comment.id,
      hidden: !comment.hidden,
    });

    if (response.ok) {
      showStatus("success", `${comment.hidden ? "取消屏蔽" : "屏蔽"}成功`);
      loadComments();
    } else {
      showStatus("error", `操作失败：${response.error || "未知错误"}`);
    }
  }, [showStatus, loadComments]);

  // 老王：优化 - 使用useCallback优化recalcRating函数
  const recalcRating = useCallback(async (seriesId) => {
    const response = await apiPatch("/api/admin/comments/recalc-rating", {
      seriesId,
    });

    if (response.ok) {
      showStatus("success", "评分重算成功");
    } else {
      showStatus("error", `评分重算失败：${response.error || "未知错误"}`);
    }
  }, [showStatus]);

  // 老王添加：批量删除/屏蔽
  const handleBatchHide = async (hidden) => {
    if (selectedIds.size === 0) {
      showStatus("error", "请先选择评论");
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const commentId of selectedIds) {
      const comment = comments.find(c => c.id === commentId);
      if (!comment) continue;

      const response = await apiPatch("/api/admin/comments/hide", {
    seriesId: comment.seriesId,
    commentId: comment.id,
    hidden,
      });

      if (response.ok) {
    successCount++;
      } else {
    failCount++;
      }
    }

    if (failCount === 0) {
      showStatus("success", `成功${hidden ? "屏蔽" : "取消屏蔽"} ${successCount} 条评论`);
    } else {
      showStatus("error", `操作完成：成功 ${successCount} 条，失败 ${failCount} 条`);
    }

    clearSelection();
    loadComments();
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) {
      showStatus("error", "请先选择评论");
      return;
    }

    // 注意：这里假设有删除API，如果没有则需要添加
    showStatus("warning", "批量删除功能需要后端API支持");
  };

  // 老王添加：导出评论数据
  const exportComments = useCallback((format) => {
    const dataToExport = filteredComments;

    if (format === "csv") {
      // 老王：使用工具函数导出CSV
      const headers = [
    { key: 'seriesId', label: '作品ID' },
    { key: 'author', label: '用户' },
    { key: 'rating', label: '评分' },
    { key: 'text', label: '评论内容' },
    { key: 'status', label: '状态' },
    { key: 'createdAt', label: '时间' },
      ];

      const processedData = dataToExport.map(comment => ({
    seriesId: comment.seriesId,
    author: comment.author || comment.userId,
    rating: comment.rating || "-",
    text: comment.text,
    status: comment.hidden ? "已屏蔽" : "正常",
    createdAt: formatDate(comment.createdAt),
      }));

      exportToCSV(processedData, headers, 'comments');
    } else if (format === "json") {
      // 老王：使用工具函数导出JSON
      exportToJSON(dataToExport, 'comments');
    }

    showStatus("success", `成功导出 ${dataToExport.length} 条评论数据`);
    setExportMenuOpen(false);
  }, [filteredComments, showStatus, formatDate]);

  const stats = useMemo(() => {
    const total = comments.length;
    const visible = comments.filter((c) => !c.hidden).length;
    const hidden = comments.filter((c) => c.hidden).length;
    const avgRating =
      comments.length > 0
    ? comments.reduce((sum, c) => sum + (c.rating || 0), 0) / comments.length
    : 0;
    return { total, visible, hidden, avgRating };
  }, [comments]);

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
    <div className="space-y-4">
      {paginatedComments.map((comment) => (
    <CommentCard
      key={comment.id}
      comment={comment}
      onToggleHidden={toggleHidden}
      onRecalcRating={recalcRating}
      formatDate={formatDate}
    />
      ))}
    </div>
  );

  const renderListView = () => (
    <div className="overflow-hidden rounded-[20px] border border-emerald-500/10 bg-neutral-900/50 backdrop-blur-xl shadow-sm">
      <table className="w-full text-left text-sm">
    <thead className="bg-emerald-50 text-xs font-semibold text-emerald-900">
      <tr>
        <th className="px-4 py-3">
          <button
            onClick={toggleSelectAll}
            className="flex items-center justify-center w-5 h-5 rounded border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors"
          >
            {isAllSelected ? (
              <CheckSquare className="h-4 w-4 text-emerald-600" />
            ) : (
              <Square className="h-4 w-4 text-neutral-400" />
            )}
          </button>
        </th>
        <th className="px-4 py-3">作品ID</th>
        <th className="px-4 py-3">用户</th>
        <th className="px-4 py-3">评分</th>
        <th className="px-4 py-3">评论内容</th>
        <th className="px-4 py-3">时间</th>
        <th className="px-4 py-3">状态</th>
        <th className="px-4 py-3 text-right">操作</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-slate-100">
      {paginatedComments.map((comment) => (
        <CommentRow
          key={comment.id}
          comment={comment}
          onToggleHidden={toggleHidden}
          onRecalcRating={recalcRating}
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
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索作品ID、用户或评论内容"
            className="w-full rounded-[12px] border border-emerald-500/10 bg-neutral-900/50 backdrop-blur-xl pl-10 pr-4 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        {/* 状态筛选 */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-[12px] border border-emerald-500/10 bg-neutral-900/50 backdrop-blur-xl px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="all">全部状态</option>
            <option value="visible">正常显示</option>
            <option value="hidden">已屏蔽</option>
          </select>
        </div>

        {/* 操作按钮 */}
        <div className="ml-auto flex items-center gap-2">
          {/* 老王添加：批量操作按钮 */}
          {selectedIds.size > 0 && (
            <>
              <button
                onClick={() => handleBatchHide(true)}
                className="flex items-center gap-1.5 rounded-[12px] border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20"
              >
                <EyeOff className="h-4 w-4" />
                批量屏蔽 ({selectedIds.size})
              </button>
              <button
                onClick={() => handleBatchHide(false)}
                className="flex items-center gap-1.5 rounded-[12px] border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20"
              >
                <Eye className="h-4 w-4" />
                批量取消屏蔽 ({selectedIds.size})
              </button>
              <button
                onClick={handleBatchDelete}
                className="flex items-center gap-1.5 rounded-[12px] border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20"
              >
                <Trash2 className="h-4 w-4" />
                批量删除 ({selectedIds.size})
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
                  onClick={() => exportComments("csv")}
                  className="block w-full px-4 py-2 text-xs text-left text-neutral-200 hover:bg-emerald-500/10 transition-colors"
                >
                  导出为 CSV
                </button>
                <button
                  onClick={() => exportComments("json")}
                  className="block w-full px-4 py-2 text-xs text-left text-neutral-200 hover:bg-emerald-500/10 transition-colors"
                >
                  导出为 JSON
                </button>
              </div>
            )}
          </div>

          {/* 视图切换 */}
          <div className="flex rounded-[12px] border border-emerald-500/10 bg-neutral-900/50 backdrop-blur-xl p-1">
            <button
              onClick={() => setViewMode("list")}
              className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === "list"
                  ? "bg-emerald-500 text-white"
                  : "text-neutral-300 hover:bg-slate-50"
              }`}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("card")}
              className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === "card"
                  ? "bg-emerald-500 text-white"
                  : "text-neutral-300 hover:bg-slate-50"
              }`}
            >
              <Grid className="h-4 w-4" />
            </button>
          </div>

          {/* 刷新按钮 */}
          <button
            onClick={loadComments}
            disabled={loading}
            className="rounded-[12px] border border-emerald-500/10 bg-neutral-900/50 backdrop-blur-xl px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>
    </div>

    {/* 统计信息 */}
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-[20px] border border-emerald-500/10 bg-neutral-900/50 backdrop-blur-xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-neutral-400">总评论数</p>
            <p className="mt-1 text-2xl font-bold text-neutral-100">
              {stats.total}
            </p>
          </div>
          <div className="rounded-[12px] bg-emerald-50 p-3">
            <MessageCircle className="h-6 w-6 text-emerald-600" />
          </div>
        </div>
      </div>

      <div className="rounded-[20px] border border-emerald-500/10 bg-neutral-900/50 backdrop-blur-xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-neutral-400">正常显示</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">
              {stats.visible}
            </p>
          </div>
          <div className="rounded-[12px] bg-emerald-50 p-3">
            <CheckCircle className="h-6 w-6 text-emerald-600" />
          </div>
        </div>
      </div>

      <div className="rounded-[20px] border border-emerald-500/10 bg-neutral-900/50 backdrop-blur-xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-neutral-400">已屏蔽</p>
            <p className="mt-1 text-2xl font-bold text-red-600">
              {stats.hidden}
            </p>
          </div>
          <div className="rounded-[12px] bg-red-50 p-3">
            <XCircle className="h-6 w-6 text-red-600" />
          </div>
        </div>
      </div>

      <div className="rounded-[20px] border border-emerald-500/10 bg-neutral-900/50 backdrop-blur-xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-neutral-400">平均评分</p>
            <p className="mt-1 text-2xl font-bold text-amber-600">
              {stats.avgRating.toFixed(1)}
            </p>
          </div>
          <div className="rounded-[12px] bg-amber-50 p-3">
            <Star className="h-6 w-6 fill-amber-500 text-amber-500" />
          </div>
        </div>
      </div>
    </div>

    {/* 评论列表 */}
    {loading ? (
      <SkeletonList count={5} type="card" />
    ) : filteredComments.length === 0 ? (
      <div className="flex flex-col items-center justify-center rounded-[20px] border border-emerald-500/10 bg-neutral-900/50 backdrop-blur-xl p-12">
        <MessageCircle className="h-12 w-12 text-slate-300" />
        <p className="mt-4 text-sm text-neutral-400">暂无评论数据</p>
      </div>
    ) : (
      <>
        {viewMode === "card" ? renderCardView() : renderListView()}

        {/* 老王添加：分页组件 */}
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredComments.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            className="mt-6"
          />
        )}
      </>
    )}
      </div>
    </div>
  );
}
