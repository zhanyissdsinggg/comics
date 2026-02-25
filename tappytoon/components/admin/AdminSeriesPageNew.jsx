"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAdminAuth } from "./AuthContext";
import { apiDelete, apiGet, apiPost, apiPatch } from "../../lib/apiClient";
import { ConfirmModal } from "../common/Modal";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Copy,
  Filter,
  Grid,
  List,
  BookOpen,
  Eye,
  EyeOff,
  Image as ImageIcon,
} from "lucide-react";

/**
 * 老王重新设计：极简作品管理页面
 * 新增功能：
 * - 卡片/列表视图切换
 * - 显示作品缩略图
 * - 清晰的筛选和搜索
 * - emerald绿色主题
 */

const TYPE_TABS = [
  { label: "全部", value: "all", color: "bg-emerald-500" },
  { label: "漫画", value: "comic", color: "bg-blue-500" },
  { label: "小说", value: "novel", color: "bg-purple-500" },
];

const STATUS_MAP = {
  Ongoing: { label: "连载中", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  Completed: { label: "已完结", color: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  Hiatus: { label: "暂停", color: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
};

export default function AdminSeriesPageNew() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading } = useAdminAuth();
  const [seriesList, setSeriesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // grid or list
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    id: "",
    title: "",
    type: "comic",
    adult: false,
  });
  // 老王添加：确认对话框状态
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
    variant: "default",
  });
  // 老王添加：复制作品输入对话框状态
  const [duplicateDialog, setDuplicateDialog] = useState({
    isOpen: false,
    seriesData: null,
    newId: "",
  });

  // 老王修复：从URL参数读取type筛选，监听URL变化
  useEffect(() => {
    const typeParam = searchParams.get("type");
    if (typeParam === "comic" || typeParam === "novel") {
      setTypeFilter(typeParam);
    } else {
      setTypeFilter("all");
    }
  }, [searchParams]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/admin/login");
    }
  }, [isAuthenticated, isLoading, router]);

  const loadSeries = useCallback(async () => {
    setLoading(true);
    const response = await apiGet("/api/admin/series");
    if (response.ok) {
      // 老王修复：过滤掉null/undefined元素，防止访问null.type等属性报错
      setSeriesList((response.data?.series || []).filter(Boolean));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadSeries();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, loadSeries]);

  const handleCreate = async () => {
    if (!createForm.title) {
      setConfirmDialog({
        isOpen: true,
        title: "提示",
        message: "请填写标题！",
        onConfirm: () => {},
        variant: "warning",
      });
      return;
    }

    // 老王新增：ID冲突重试逻辑（最多重试3次）
    let retries = 3;
    let lastError = null;

    while (retries > 0) {
      // 老王修改：自动生成唯一ID
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const autoId = `series-${timestamp}-${randomStr}`;

      console.log(`创建作品，ID: ${autoId}，剩余重试次数: ${retries}`);
      console.log("表单数据:", createForm);

      const response = await apiPost("/api/admin/series", {
        series: {
          ...createForm,
          id: autoId,
          adult: Boolean(createForm.adult),
          genres: [],
          pricing: { currency: "POINTS", episodePrice: 5, discount: 0 },
          ttf: { enabled: true, intervalHours: 24 },
          isPublished: true,
          isFeatured: false,
        },
      });

      console.log("API响应:", response);

      if (response.ok) {
        setShowCreateModal(false);
        setCreateForm({ id: "", title: "", type: "comic", adult: false });
        loadSeries();
        setConfirmDialog({
          isOpen: true,
          title: "成功",
          message: "创建成功！",
          onConfirm: () => {},
          variant: "default",
        });
        return;
      } else if (response.status === 409) {
        // 老王新增：ID冲突，重试
        console.warn(`ID冲突，重新生成ID并重试... 剩余次数: ${retries - 1}`);
        lastError = response.error || "ID冲突";
        retries--;
        // 等待100ms后重试，避免时间戳重复
        await new Promise(resolve => setTimeout(resolve, 100));
        continue;
      } else {
        // 其他错误，直接返回
        console.error("创建失败，错误信息:", response.error);
        setConfirmDialog({
          isOpen: true,
          title: "错误",
          message: `创建失败：${response.error || "未知错误"}（查看控制台了解详情）`,
          onConfirm: () => {},
          variant: "danger",
        });
        return;
      }
    }

    // 重试次数用完
    setConfirmDialog({
      isOpen: true,
      title: "错误",
      message: `创建失败：${lastError}，请稍后重试`,
      onConfirm: () => {},
      variant: "danger",
    });
  };

  const handleDelete = async (seriesId) => {
    setConfirmDialog({
      isOpen: true,
      title: "确认删除",
      message: "确定要删除这个作品吗？",
      onConfirm: async () => {
        const response = await apiDelete(`/api/admin/series/${seriesId}`);
        if (response.ok) {
          loadSeries();
        } else {
          setConfirmDialog({
            isOpen: true,
            title: "错误",
            message: `删除失败：${response.error || "未知错误"}`,
            onConfirm: () => {},
            variant: "danger",
          });
        }
      },
      variant: "danger",
    });
  };

  const handleTogglePublish = async (series) => {
    const response = await apiPatch(`/api/admin/series/${series.id}`, {
      series: { ...series, isPublished: !series.isPublished },
    });
    if (response.ok) {
      loadSeries();
    }
  };

  const handleDuplicate = async (series) => {
    setDuplicateDialog({
      isOpen: true,
      seriesData: series,
      newId: `${series.id}_copy`,
    });
  };

  const executeDuplicate = async () => {
    const { seriesData, newId } = duplicateDialog;
    if (!newId) {
      setDuplicateDialog({ ...duplicateDialog, isOpen: false });
      return;
    }
    const response = await apiPost("/api/admin/series", {
      series: {
        ...seriesData,
        id: newId,
        title: `${seriesData.title}（复制）`,
      },
    });
    if (response.ok) {
      setDuplicateDialog({ isOpen: false, seriesData: null, newId: "" });
      loadSeries();
    } else {
      setDuplicateDialog({ isOpen: false, seriesData: null, newId: "" });
      setConfirmDialog({
        isOpen: true,
        title: "错误",
        message: `复制失败：${response.error || "未知错误"}`,
        onConfirm: () => {},
        variant: "danger",
      });
    }
  };

  // 过滤和搜索
  const filteredSeries = seriesList.filter((series) => {
    const matchesType = typeFilter === "all" || series.type === typeFilter;
    const matchesSearch =
      !searchQuery ||
      series.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      series.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  // 老王添加：卡片视图渲染
  const renderGridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredSeries.map((series) => (
        <div
          key={series.id}
          className="group relative rounded-[20px] border border-emerald-500/10 bg-neutral-900/50 backdrop-blur-xl overflow-hidden transition-all duration-300 hover:border-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/10 hover:scale-[1.02]"
        >
          {/* 老王添加：缩略图 */}
          <div className="relative h-48 bg-neutral-800/50 overflow-hidden">
            {series.coverImage ? (
              <img
                src={series.coverImage}
                alt={series.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon size={48} className="text-neutral-600" />
              </div>
            )}
            {/* 类型标签 */}
            <div className="absolute top-3 left-3">
              <span
                className={`px-3 py-1 rounded-[8px] text-xs font-medium backdrop-blur-xl ${
                  series.type === "novel"
                    ? "bg-purple-500/80 text-white border border-purple-400/50"
                    : "bg-blue-500/80 text-white border border-blue-400/50"
                }`}
              >
                {series.type === "novel" ? "小说" : "漫画"}
              </span>
            </div>
            {/* 成人标识 */}
            {series.adult && (
              <div className="absolute top-3 right-3">
                <span className="flex items-center gap-1 px-2 py-1 rounded-[8px] bg-rose-500/80 text-white border border-rose-400/50 text-xs backdrop-blur-xl">
                  <Eye size={12} />
                  18+
                </span>
              </div>
            )}
          </div>

          <div className="p-6">
            {/* 标题和ID */}
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-neutral-100 mb-1 line-clamp-2 group-hover:text-emerald-300 transition-colors duration-300">
                {series.title}
              </h3>
              <p className="text-xs text-neutral-500 font-mono">{series.id}</p>
            </div>

            {/* 老王添加：关键数据统计（章节数、更新时间） */}
            <div className="flex items-center gap-3 mb-4 text-xs">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] bg-emerald-500/10 border border-emerald-500/20">
                <Grid size={12} className="text-emerald-400" />
                <span className="text-emerald-300 font-medium">{series.episodeCount || 0} 章节</span>
              </div>
              {series.updatedAt && (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] bg-neutral-800/50 border border-neutral-700/30 text-neutral-400">
                  <span className="font-medium">更新：</span>
                  <span>{new Date(series.updatedAt).toLocaleDateString('zh-CN', {month: 'short', day: 'numeric'})}</span>
                </div>
              )}
            </div>

            {/* 状态标签 */}
            <div className="flex items-center gap-2 mb-4">
              <span
                className={`px-3 py-1 rounded-[8px] text-xs font-medium border ${
                  STATUS_MAP[series.status]?.color ||
                  "bg-neutral-500/20 text-neutral-300 border-neutral-500/30"
                }`}
              >
                {STATUS_MAP[series.status]?.label || series.status}
              </span>
              {!series.isPublished && (
                <span className="px-3 py-1 rounded-[8px] text-xs font-medium bg-neutral-500/20 text-neutral-400 border border-neutral-500/30">
                  未发布
                </span>
              )}
            </div>

            {/* 操作按钮 */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push(`/admin/series/${series.id}`)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-[10px] bg-emerald-500/20 text-emerald-300 text-xs font-medium hover:bg-emerald-500/30 transition-all duration-300"
              >
                <Edit size={14} />
                编辑
              </button>
              <button
                onClick={() => handleTogglePublish(series)}
                className={`px-3 py-2 rounded-[10px] text-xs font-medium transition-all duration-300 ${
                  series.isPublished
                    ? "bg-neutral-800/50 text-neutral-400 hover:text-neutral-200"
                    : "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                }`}
                title={series.isPublished ? "取消发布" : "发布"}
              >
                {series.isPublished ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
              <button
                onClick={() => handleDuplicate(series)}
                className="px-3 py-2 rounded-[10px] bg-neutral-800/50 text-neutral-400 hover:text-neutral-200 text-xs transition-all duration-300"
                title="复制"
              >
                <Copy size={14} />
              </button>
              <button
                onClick={() => handleDelete(series.id)}
                className="px-3 py-2 rounded-[10px] bg-neutral-800/50 text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 text-xs transition-all duration-300"
                title="删除"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  // 老王添加：列表视图渲染
  const renderListView = () => (
    <div className="space-y-3">
      {filteredSeries.map((series) => (
        <div
          key={series.id}
          className="group flex items-center gap-4 rounded-[16px] border border-emerald-500/10 bg-neutral-900/50 backdrop-blur-xl p-4 transition-all duration-300 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/10"
        >
          {/* 缩略图 */}
          <div className="relative w-24 h-24 rounded-[12px] bg-neutral-800/50 overflow-hidden flex-shrink-0">
            {series.coverImage ? (
              <img
                src={series.coverImage}
                alt={series.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon size={32} className="text-neutral-600" />
              </div>
            )}
          </div>

          {/* 信息区域 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-3 mb-2">
              <h3 className="text-base font-semibold text-neutral-100 group-hover:text-emerald-300 transition-colors duration-300 line-clamp-1">
                {series.title}
              </h3>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span
                  className={`px-2 py-1 rounded-[6px] text-xs font-medium ${
                    series.type === "novel"
                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                      : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                  }`}
                >
                  {series.type === "novel" ? "小说" : "漫画"}
                </span>
                {series.adult && (
                  <span className="flex items-center gap-1 px-2 py-1 rounded-[6px] bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs">
                    <Eye size={10} />
                    18+
                  </span>
                )}
              </div>
            </div>
            <p className="text-xs text-neutral-500 font-mono mb-2">{series.id}</p>

            {/* 老王添加：列表视图的关键数据 */}
            <div className="flex items-center gap-2 mb-3 text-xs">
              <div className="flex items-center gap-1 px-2 py-1 rounded-[6px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                <Grid size={12} />
                <span className="font-medium">{series.episodeCount || 0} 章</span>
              </div>
              {series.updatedAt && (
                <div className="text-neutral-500">
                  更新：{new Date(series.updatedAt).toLocaleDateString('zh-CN', {month: 'short', day: 'numeric'})}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-1 rounded-[6px] text-xs font-medium border ${
                  STATUS_MAP[series.status]?.color ||
                  "bg-neutral-500/20 text-neutral-300 border-neutral-500/30"
                }`}
              >
                {STATUS_MAP[series.status]?.label || series.status}
              </span>
              {!series.isPublished && (
                <span className="px-2 py-1 rounded-[6px] text-xs font-medium bg-neutral-500/20 text-neutral-400 border border-neutral-500/30">
                  未发布
                </span>
              )}
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => router.push(`/admin/series/${series.id}`)}
              className="flex items-center gap-2 px-4 py-2 rounded-[10px] bg-emerald-500/20 text-emerald-300 text-xs font-medium hover:bg-emerald-500/30 transition-all duration-300"
            >
              <Edit size={14} />
              编辑
            </button>
            <button
              onClick={() => handleTogglePublish(series)}
              className={`px-3 py-2 rounded-[10px] text-xs font-medium transition-all duration-300 ${
                series.isPublished
                  ? "bg-neutral-800/50 text-neutral-400 hover:text-neutral-200"
                  : "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
              }`}
              title={series.isPublished ? "取消发布" : "发布"}
            >
              {series.isPublished ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
            <button
              onClick={() => handleDuplicate(series)}
              className="px-3 py-2 rounded-[10px] bg-neutral-800/50 text-neutral-400 hover:text-neutral-200 text-xs transition-all duration-300"
              title="复制"
            >
              <Copy size={14} />
            </button>
            <button
              onClick={() => handleDelete(series.id)}
              className="px-3 py-2 rounded-[10px] bg-neutral-800/50 text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 text-xs transition-all duration-300"
              title="删除"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  if (loading || !isAuthenticated) {
    return (
      <div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="rounded-[20px] border border-emerald-500/10 bg-neutral-900/50 backdrop-blur-xl h-64 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        {/* 老王重新设计：筛选、搜索和视图切换栏 */}
        <div className="rounded-[20px] border border-emerald-500/10 bg-neutral-900/50 backdrop-blur-xl p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* 类型筛选 */}
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-neutral-400" />
              {TYPE_TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setTypeFilter(tab.value)}
                  className={`px-4 py-2 rounded-[10px] text-sm font-medium transition-all duration-300 ${
                    typeFilter === tab.value
                      ? `${tab.color} text-white shadow-lg`
                      : "bg-neutral-800/50 text-neutral-300 hover:bg-neutral-800 hover:text-emerald-300"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* 搜索框 */}
            <div className="flex-1 flex items-center gap-2 px-4 py-2 rounded-[12px] bg-neutral-800/50 border border-emerald-500/20">
              <Search size={16} className="text-neutral-400" />
              <input
                type="text"
                placeholder="搜索作品标题或ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-neutral-200 text-sm placeholder:text-neutral-500 focus:outline-none"
              />
            </div>

            {/* 老王添加：视图切换按钮 */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-[10px] transition-all duration-300 ${
                  viewMode === "grid"
                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                    : "bg-neutral-800/50 text-neutral-400 hover:text-neutral-200"
                }`}
                title="卡片视图"
              >
                <Grid size={18} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-[10px] transition-all duration-300 ${
                  viewMode === "list"
                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                    : "bg-neutral-800/50 text-neutral-400 hover:text-neutral-200"
                }`}
                title="列表视图"
              >
                <List size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* 老王添加：根据viewMode渲染不同视图 */}
        {viewMode === "grid" ? renderGridView() : renderListView()}

        {/* 空状态 */}
        {filteredSeries.length === 0 && !loading && (
          <div className="rounded-[20px] border border-emerald-500/10 bg-neutral-900/50 backdrop-blur-xl p-12 text-center">
            <BookOpen size={48} className="mx-auto text-neutral-600 mb-4" />
            <p className="text-neutral-400 mb-2">没有找到作品</p>
            <p className="text-sm text-neutral-500">
              {searchQuery || typeFilter !== "all"
                ? "尝试调整筛选条件或搜索关键词"
                : "点击右上角「添加作品」按钮创建第一个作品"}
            </p>
          </div>
        )}
      </div>

      {/* 老王添加：创建作品弹窗 */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="bg-neutral-900 rounded-[20px] border border-emerald-500/20 shadow-2xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-neutral-100 mb-6">添加新作品</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">作品标题 *</label>
                <input
                  type="text"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  placeholder="例如: 我的第一部漫画"
                  className="w-full px-4 py-3 rounded-[12px] bg-neutral-800/50 border border-emerald-500/20 text-neutral-200 text-sm placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500/50 transition-colors duration-300"
                />
                <p className="mt-1 text-xs text-neutral-500">ID将自动生成</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">作品类型</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCreateForm({ ...createForm, type: "comic" })}
                    className={`flex-1 px-4 py-3 rounded-[12px] text-sm font-medium transition-all duration-300 ${
                      createForm.type === "comic"
                        ? "bg-blue-500 text-white"
                        : "bg-neutral-800/50 text-neutral-300 hover:bg-neutral-800"
                    }`}
                  >
                    漫画
                  </button>
                  <button
                    onClick={() => setCreateForm({ ...createForm, type: "novel" })}
                    className={`flex-1 px-4 py-3 rounded-[12px] text-sm font-medium transition-all duration-300 ${
                      createForm.type === "novel"
                        ? "bg-purple-500 text-white"
                        : "bg-neutral-800/50 text-neutral-300 hover:bg-neutral-800"
                    }`}
                  >
                    小说
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="adult"
                  checked={createForm.adult}
                  onChange={(e) => setCreateForm({ ...createForm, adult: e.target.checked })}
                  className="w-4 h-4 rounded border-emerald-500/20 bg-neutral-800/50 text-emerald-500 focus:ring-emerald-500/50"
                />
                <label htmlFor="adult" className="text-sm text-neutral-300">
                  成人内容（18+）
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-3 rounded-[12px] bg-neutral-800/50 text-neutral-300 text-sm font-medium hover:bg-neutral-800 transition-all duration-300"
                >
                  取消
                </button>
                <button
                  onClick={handleCreate}
                  className="flex-1 px-4 py-3 rounded-[12px] bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-all duration-300 shadow-lg shadow-emerald-500/30"
                >
                  创建
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 老王添加：确认对话框 */}
      <ConfirmModal
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText="确定"
        cancelText="取消"
        variant={confirmDialog.variant}
      />

      {/* 老王添加：复制作品对话框 */}
      {duplicateDialog.isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setDuplicateDialog({ isOpen: false, seriesData: null, newId: "" })}
        >
          <div
            className="bg-neutral-900 rounded-[20px] border border-emerald-500/20 shadow-2xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-neutral-100 mb-6">复制作品</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">新作品ID *</label>
                <input
                  type="text"
                  value={duplicateDialog.newId}
                  onChange={(e) => setDuplicateDialog({ ...duplicateDialog, newId: e.target.value })}
                  placeholder="请输入新作品ID"
                  className="w-full px-4 py-3 rounded-[12px] bg-neutral-800/50 border border-emerald-500/20 text-neutral-200 text-sm placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500/50 transition-colors duration-300"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setDuplicateDialog({ isOpen: false, seriesData: null, newId: "" })}
                  className="flex-1 px-4 py-3 rounded-[12px] bg-neutral-800/50 text-neutral-300 text-sm font-medium hover:bg-neutral-800 transition-all duration-300"
                >
                  取消
                </button>
                <button
                  onClick={executeDuplicate}
                  className="flex-1 px-4 py-3 rounded-[12px] bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-all duration-300 shadow-lg shadow-emerald-500/30"
                >
                  复制
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
