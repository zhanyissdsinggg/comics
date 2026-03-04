"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { useAdminAuth } from "./AuthContext";
import { apiDelete, apiGet, apiPost, apiPatch } from "../../lib/apiClient";
import { ConfirmModal } from "../common/Modal";
import BulkActionsToolbar from "./BulkActionsToolbar";
import AdvancedFilters from "./AdvancedFilters";
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
  Upload,
  X,
} from "lucide-react";

/**
 * 老王重新设计：iOS 26风格作品管理页面
 * 新增功能：
 * - 批量选择和批量操作（发布/取消发布/删除）
 * - 高级筛选（状态、发布状态、成人内容、排序）
 * - 拖拽上传封面图片
 * - 卡片/列表视图切换
 * - iOS 26设计系统（圆角、阴影、颜色、动画）
 */

const TYPE_TABS = [
  { label: "全部", value: "all", color: "bg-ios-blue" },
  { label: "漫画", value: "comic", color: "bg-ios-purple" },
  { label: "小说", value: "novel", color: "bg-ios-green" },
];

const STATUS_MAP = {
  Ongoing: { label: "连载中", color: "bg-ios-green/20 text-ios-green border-ios-green/30" },
  Completed: { label: "已完结", color: "bg-ios-blue/20 text-ios-blue border-ios-blue/30" },
  Hiatus: { label: "暂停", color: "bg-ios-orange/20 text-ios-orange border-ios-orange/30" },
};

const passthroughImageLoader = ({ src }) => src;

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
    coverImage: null, // 老王添加：封面图片
  });
  // 老王添加：批量选择状态
  const [selectedSeries, setSelectedSeries] = useState([]);
  // 老王添加：高级筛选状态
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({
    status: "all",
    publishStatus: "all",
    adultContent: "all",
    sortBy: "createdAt_desc",
  });
  // 老王添加：拖拽上传状态
  const [isDragging, setIsDragging] = useState(false);
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

  // 老王优化：使用useCallback避免每次render都创建新函数
  const handleEditClick = useCallback((seriesId) => {
    router.push(`/admin/series/${seriesId}`);
  }, [router]);

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

      const response = await apiPost("/api/admin/series", {
        series: {
          ...createForm,
          id: autoId,
          adult: Boolean(createForm.adult),
          coverImage: createForm.coverImage || undefined, // 老王添加：保存封面图片
          genres: [],
          pricing: { currency: "POINTS", episodePrice: 5, discount: 0 },
          ttf: { enabled: true, intervalHours: 24 },
          isPublished: true,
          isFeatured: false,
        },
      });

      if (response.ok) {
        setShowCreateModal(false);
        setCreateForm({ id: "", title: "", type: "comic", adult: false, coverImage: null });
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
        lastError = response.error || "ID冲突";
        retries--;
        // 等待100ms后重试，避免时间戳重复
        await new Promise(resolve => setTimeout(resolve, 100));
        continue;
      } else {
        // 其他错误，直接返回
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

  // 老王添加：批量选择处理
  const handleSelectAll = () => {
    if (selectedSeries.length === filteredSeries.length) {
      setSelectedSeries([]);
    } else {
      setSelectedSeries(filteredSeries.map((s) => s.id));
    }
  };

  const handleSelectSeries = (seriesId) => {
    setSelectedSeries((prev) =>
      prev.includes(seriesId)
        ? prev.filter((id) => id !== seriesId)
        : [...prev, seriesId]
    );
  };

  // 老王添加：批量发布
  const handleBulkPublish = async () => {
    const promises = selectedSeries.map((id) => {
      const series = seriesList.find((s) => s.id === id);
      return apiPatch(`/api/admin/series/${id}`, {
        series: { ...series, isPublished: true },
      });
    });
    await Promise.all(promises);
    setSelectedSeries([]);
    loadSeries();
  };

  // 老王添加：批量取消发布
  const handleBulkUnpublish = async () => {
    const promises = selectedSeries.map((id) => {
      const series = seriesList.find((s) => s.id === id);
      return apiPatch(`/api/admin/series/${id}`, {
        series: { ...series, isPublished: false },
      });
    });
    await Promise.all(promises);
    setSelectedSeries([]);
    loadSeries();
  };

  // 老王添加：批量删除
  const handleBulkDelete = async () => {
    setConfirmDialog({
      isOpen: true,
      title: "确认批量删除",
      message: `确定要删除选中的 ${selectedSeries.length} 个作品吗？此操作不可撤销！`,
      onConfirm: async () => {
        const promises = selectedSeries.map((id) =>
          apiDelete(`/api/admin/series/${id}`)
        );
        await Promise.all(promises);
        setSelectedSeries([]);
        loadSeries();
      },
      variant: "danger",
    });
  };

  // 老王添加：拖拽上传处理
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const file = files[0];
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setCreateForm({ ...createForm, coverImage: e.target.result });
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCreateForm({ ...createForm, coverImage: e.target.result });
      };
      reader.readAsDataURL(file);
    }
  };

  // 老王优化：过滤、搜索和排序
  const filteredSeries = seriesList
    .filter((series) => {
      const matchesType = typeFilter === "all" || series.type === typeFilter;
      const matchesSearch =
        !searchQuery ||
        series.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        series.id.toLowerCase().includes(searchQuery.toLowerCase());

      // 老王添加：高级筛选
      const matchesStatus =
        advancedFilters.status === "all" || series.status === advancedFilters.status;
      const matchesPublishStatus =
        advancedFilters.publishStatus === "all" ||
        (advancedFilters.publishStatus === "published" && series.isPublished) ||
        (advancedFilters.publishStatus === "unpublished" && !series.isPublished);
      const matchesAdultContent =
        advancedFilters.adultContent === "all" ||
        (advancedFilters.adultContent === "adult" && series.adult) ||
        (advancedFilters.adultContent === "general" && !series.adult);

      return matchesType && matchesSearch && matchesStatus && matchesPublishStatus && matchesAdultContent;
    })
    .sort((a, b) => {
      // 老王添加：排序逻辑
      const [field, order] = advancedFilters.sortBy.split("_");
      let comparison = 0;

      if (field === "createdAt" || field === "updatedAt") {
        const dateA = new Date(a[field] || 0);
        const dateB = new Date(b[field] || 0);
        comparison = dateA - dateB;
      } else if (field === "title") {
        comparison = a.title.localeCompare(b.title);
      }

      return order === "desc" ? -comparison : comparison;
    });

  // 老王优化：卡片视图渲染（iOS 26风格 + 批量选择）
  const renderGridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredSeries.map((series) => {
        const isSelected = selectedSeries.includes(series.id);
        return (
          <div
            key={series.id}
            className={`group relative rounded-5xl border backdrop-blur-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] animate-scale-in ${
              isSelected
                ? "border-ios-blue shadow-ios-glow bg-ios-blue/10"
                : "border-ios-gray-700/30 bg-ios-gray-900/50 hover:border-ios-blue/30 hover:shadow-ios"
            }`}
          >
            {/* 老王添加：批量选择复选框 */}
            <div className="absolute top-4 left-4 z-10">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => handleSelectSeries(series.id)}
                className="w-5 h-5 rounded-lg border-2 border-ios-gray-600 bg-ios-gray-800/80 backdrop-blur-xl checked:bg-ios-blue checked:border-ios-blue transition-all duration-200 cursor-pointer"
              />
            </div>

            {/* 老王添加：缩略图 */}
            <div className="relative h-48 bg-ios-gray-800/50 overflow-hidden">
              {series.coverImage ? (
                <Image
                  src={series.coverImage}
                  alt={series.title}
                  fill
                  unoptimized
                  loader={passthroughImageLoader}
                  sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon size={48} className="text-ios-gray-600" />
                </div>
              )}
              {/* 类型标签 */}
              <div className="absolute top-4 right-4">
                <span
                  className={`px-3 py-1.5 rounded-3xl text-xs font-semibold backdrop-blur-2xl shadow-ios-sm ${
                    series.type === "novel"
                      ? "bg-ios-purple/90 text-white border border-ios-purple/50"
                      : "bg-ios-blue/90 text-white border border-ios-blue/50"
                  }`}
                >
                  {series.type === "novel" ? "小说" : "漫画"}
                </span>
              </div>
              {/* 成人标识 */}
              {series.adult && (
                <div className="absolute bottom-4 right-4">
                  <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-3xl bg-ios-red/90 text-white border border-ios-red/50 text-xs font-semibold backdrop-blur-2xl shadow-ios-sm">
                    <Eye size={12} />
                    18+
                  </span>
                </div>
              )}
            </div>

            <div className="p-6">
              {/* 标题和ID */}
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-white mb-1.5 line-clamp-2 group-hover:text-ios-blue transition-colors duration-300">
                  {series.title}
                </h3>
                <p className="text-xs text-ios-gray-500 font-mono">{series.id}</p>
              </div>

              {/* 老王添加：关键数据统计（章节数、更新时间） */}
              <div className="flex items-center gap-3 mb-4 text-xs">
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-3xl bg-ios-blue/10 border border-ios-blue/20 backdrop-blur-xl">
                  <Grid size={12} className="text-ios-blue" />
                  <span className="text-ios-blue font-semibold">{series.episodeCount || 0} 章节</span>
                </div>
                {series.updatedAt && (
                  <div className="flex items-center gap-1.5 px-3 py-2 rounded-3xl bg-ios-gray-800/50 border border-ios-gray-700/30 text-ios-gray-400 backdrop-blur-xl">
                    <span className="font-medium">更新：</span>
                    <span>{new Date(series.updatedAt).toLocaleDateString('zh-CN', {month: 'short', day: 'numeric'})}</span>
                  </div>
                )}
              </div>

              {/* 状态标签 */}
              <div className="flex items-center gap-2 mb-4">
                <span
                  className={`px-3 py-1.5 rounded-3xl text-xs font-semibold border backdrop-blur-xl ${
                    STATUS_MAP[series.status]?.color ||
                    "bg-ios-gray-500/20 text-ios-gray-300 border-ios-gray-500/30"
                  }`}
                >
                  {STATUS_MAP[series.status]?.label || series.status}
                </span>
                {!series.isPublished && (
                  <span className="px-3 py-1.5 rounded-3xl text-xs font-semibold bg-ios-gray-500/20 text-ios-gray-400 border border-ios-gray-500/30 backdrop-blur-xl">
                    未发布
                  </span>
                )}
              </div>

              {/* 操作按钮 */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEditClick(series.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-3xl bg-ios-blue/20 text-ios-blue text-xs font-semibold hover:bg-ios-blue/30 transition-all duration-300 shadow-ios-sm"
                >
                  <Edit size={14} />
                  编辑
                </button>
                <button
                  onClick={() => handleTogglePublish(series)}
                  className={`px-3 py-2.5 rounded-3xl text-xs font-semibold transition-all duration-300 shadow-ios-sm ${
                    series.isPublished
                      ? "bg-ios-gray-800/50 text-ios-gray-400 hover:text-white"
                      : "bg-ios-green/20 text-ios-green hover:bg-ios-green/30"
                  }`}
                  title={series.isPublished ? "取消发布" : "发布"}
                >
                  {series.isPublished ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
                <button
                  onClick={() => handleDuplicate(series)}
                  className="px-3 py-2.5 rounded-3xl bg-ios-gray-800/50 text-ios-gray-400 hover:text-white text-xs transition-all duration-300 shadow-ios-sm"
                  title="复制"
                >
                  <Copy size={14} />
                </button>
                <button
                  onClick={() => handleDelete(series.id)}
                  className="px-3 py-2.5 rounded-3xl bg-ios-gray-800/50 text-ios-gray-400 hover:text-ios-red hover:bg-ios-red/10 text-xs transition-all duration-300 shadow-ios-sm"
                  title="删除"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  // 老王优化：列表视图渲染（iOS 26风格 + 批量选择）
  const renderListView = () => (
    <div className="space-y-3">
      {filteredSeries.map((series) => {
        const isSelected = selectedSeries.includes(series.id);
        return (
          <div
            key={series.id}
            className={`group flex items-center gap-4 rounded-4xl border backdrop-blur-2xl p-4 transition-all duration-300 animate-fade-in ${
              isSelected
                ? "border-ios-blue shadow-ios-glow bg-ios-blue/10"
                : "border-ios-gray-700/30 bg-ios-gray-900/50 hover:border-ios-blue/30 hover:shadow-ios"
            }`}
          >
            {/* 老王添加：批量选择复选框 */}
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => handleSelectSeries(series.id)}
              className="w-5 h-5 rounded-lg border-2 border-ios-gray-600 bg-ios-gray-800/80 backdrop-blur-xl checked:bg-ios-blue checked:border-ios-blue transition-all duration-200 cursor-pointer flex-shrink-0"
            />

            {/* 缩略图 */}
            <div className="relative w-24 h-24 rounded-3xl bg-ios-gray-800/50 overflow-hidden flex-shrink-0 shadow-ios-sm">
              {series.coverImage ? (
                <Image
                  src={series.coverImage}
                  alt={series.title}
                  fill
                  unoptimized
                  loader={passthroughImageLoader}
                  sizes="96px"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon size={32} className="text-ios-gray-600" />
                </div>
              )}
            </div>

            {/* 信息区域 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-3 mb-2">
                <h3 className="text-base font-semibold text-white group-hover:text-ios-blue transition-colors duration-300 line-clamp-1">
                  {series.title}
                </h3>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className={`px-2.5 py-1 rounded-3xl text-xs font-semibold backdrop-blur-xl shadow-ios-sm ${
                      series.type === "novel"
                        ? "bg-ios-purple/20 text-ios-purple border border-ios-purple/30"
                        : "bg-ios-blue/20 text-ios-blue border border-ios-blue/30"
                    }`}
                  >
                    {series.type === "novel" ? "小说" : "漫画"}
                  </span>
                  {series.adult && (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-3xl bg-ios-red/20 text-ios-red border border-ios-red/30 text-xs font-semibold backdrop-blur-xl shadow-ios-sm">
                      <Eye size={10} />
                      18+
                    </span>
                  )}
                </div>
              </div>
              <p className="text-xs text-ios-gray-500 font-mono mb-2">{series.id}</p>

              {/* 老王添加：列表视图的关键数据 */}
              <div className="flex items-center gap-2 mb-3 text-xs">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-3xl bg-ios-blue/10 border border-ios-blue/20 text-ios-blue backdrop-blur-xl">
                  <Grid size={12} />
                  <span className="font-semibold">{series.episodeCount || 0} 章</span>
                </div>
                {series.updatedAt && (
                  <div className="text-ios-gray-500">
                    更新：{new Date(series.updatedAt).toLocaleDateString('zh-CN', {month: 'short', day: 'numeric'})}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-1 rounded-3xl text-xs font-semibold border backdrop-blur-xl ${
                    STATUS_MAP[series.status]?.color ||
                    "bg-ios-gray-500/20 text-ios-gray-300 border-ios-gray-500/30"
                  }`}
                >
                  {STATUS_MAP[series.status]?.label || series.status}
                </span>
                {!series.isPublished && (
                  <span className="px-2.5 py-1 rounded-3xl text-xs font-semibold bg-ios-gray-500/20 text-ios-gray-400 border border-ios-gray-500/30 backdrop-blur-xl">
                    未发布
                  </span>
                )}
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => handleEditClick(series.id)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-3xl bg-ios-blue/20 text-ios-blue text-xs font-semibold hover:bg-ios-blue/30 transition-all duration-300 shadow-ios-sm"
              >
                <Edit size={14} />
                编辑
              </button>
              <button
                onClick={() => handleTogglePublish(series)}
                className={`px-3 py-2.5 rounded-3xl text-xs font-semibold transition-all duration-300 shadow-ios-sm ${
                  series.isPublished
                    ? "bg-ios-gray-800/50 text-ios-gray-400 hover:text-white"
                    : "bg-ios-green/20 text-ios-green hover:bg-ios-green/30"
                }`}
                title={series.isPublished ? "取消发布" : "发布"}
              >
                {series.isPublished ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
              <button
                onClick={() => handleDuplicate(series)}
                className="px-3 py-2.5 rounded-3xl bg-ios-gray-800/50 text-ios-gray-400 hover:text-white text-xs transition-all duration-300 shadow-ios-sm"
                title="复制"
              >
                <Copy size={14} />
              </button>
              <button
                onClick={() => handleDelete(series.id)}
                className="px-3 py-2.5 rounded-3xl bg-ios-gray-800/50 text-ios-gray-400 hover:text-ios-red hover:bg-ios-red/10 text-xs transition-all duration-300 shadow-ios-sm"
                title="删除"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );

  if (loading || !isAuthenticated) {
    return (
      <div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="rounded-5xl border border-ios-gray-700/30 bg-ios-gray-900/50 backdrop-blur-2xl h-64 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 老王重新设计：筛选、搜索和视图切换栏（iOS 26风格） */}
      <div className="rounded-5xl border border-ios-gray-700/30 bg-ios-gray-900/50 backdrop-blur-2xl p-5 shadow-ios animate-fade-in">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* 类型筛选 */}
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-ios-gray-400" />
            {TYPE_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setTypeFilter(tab.value)}
                className={`px-4 py-2.5 rounded-3xl text-sm font-semibold transition-all duration-300 ${
                  typeFilter === tab.value
                    ? `${tab.color} text-white shadow-ios`
                    : "bg-ios-gray-800/50 text-ios-gray-300 hover:bg-ios-gray-800 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 搜索框 */}
          <div className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-4xl bg-ios-gray-800/50 border border-ios-gray-700/30 backdrop-blur-xl">
            <Search size={16} className="text-ios-gray-400" />
            <input
              type="text"
              placeholder="搜索作品标题或ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-white text-sm placeholder:text-ios-gray-500 focus:outline-none"
            />
          </div>

          {/* 老王添加：高级筛选按钮 */}
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`px-4 py-2.5 rounded-3xl text-sm font-semibold transition-all duration-300 flex items-center gap-2 ${
              showAdvancedFilters
                ? "bg-ios-blue text-white shadow-ios"
                : "bg-ios-gray-800/50 text-ios-gray-300 hover:bg-ios-gray-800 hover:text-white"
            }`}
          >
            <Filter size={16} />
            高级筛选
          </button>

          {/* 老王添加：全选按钮 */}
          {filteredSeries.length > 0 && (
            <button
              onClick={handleSelectAll}
              className="px-4 py-2.5 rounded-3xl bg-ios-gray-800/50 text-ios-gray-300 hover:bg-ios-gray-800 hover:text-white text-sm font-semibold transition-all duration-300"
            >
              {selectedSeries.length === filteredSeries.length ? "取消全选" : "全选"}
            </button>
          )}

          {/* 老王添加：视图切换按钮 */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2.5 rounded-3xl transition-all duration-300 ${
                viewMode === "grid"
                  ? "bg-ios-blue text-white shadow-ios"
                  : "bg-ios-gray-800/50 text-ios-gray-400 hover:text-white"
              }`}
              title="卡片视图"
            >
              <Grid size={18} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2.5 rounded-3xl transition-all duration-300 ${
                viewMode === "list"
                  ? "bg-ios-blue text-white shadow-ios"
                  : "bg-ios-gray-800/50 text-ios-gray-400 hover:text-white"
              }`}
              title="列表视图"
            >
              <List size={18} />
            </button>
          </div>
        </div>

        {/* 老王添加：高级筛选面板 */}
        {showAdvancedFilters && (
          <div className="mt-4 pt-4 border-t border-ios-gray-700/30">
            <AdvancedFilters
              filters={advancedFilters}
              onFiltersChange={setAdvancedFilters}
            />
          </div>
        )}
      </div>

      {/* 老王添加：批量操作工具栏 */}
      <BulkActionsToolbar
        selectedCount={selectedSeries.length}
        onPublish={handleBulkPublish}
        onUnpublish={handleBulkUnpublish}
        onDelete={handleBulkDelete}
        onCancel={() => setSelectedSeries([])}
      />

      <>
        {/* 老王添加：根据viewMode渲染不同视图 */}
        {viewMode === "grid" ? renderGridView() : renderListView()}

        {/* 空状态 */}
        {filteredSeries.length === 0 && !loading && (
          <div className="rounded-5xl border border-ios-gray-700/30 bg-ios-gray-900/50 backdrop-blur-2xl p-12 text-center shadow-ios animate-fade-in">
            <BookOpen size={48} className="mx-auto text-ios-gray-600 mb-4" />
            <p className="text-ios-gray-400 mb-2 font-semibold">没有找到作品</p>
            <p className="text-sm text-ios-gray-500">
              {searchQuery || typeFilter !== "all"
                ? "尝试调整筛选条件或搜索关键词"
                : "点击右上角「添加作品」按钮创建第一个作品"}
            </p>
          </div>
        )}
      </>

      {/* 老王优化：创建作品弹窗（iOS 26风格 + 拖拽上传） */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fade-in"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="bg-ios-gray-900 rounded-5xl border border-ios-gray-700/30 shadow-ios-xl w-full max-w-md p-6 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-white mb-6">添加新作品</h2>
            <div className="space-y-4">
              {/* 老王添加：拖拽上传封面 */}
              <div>
                <label className="block text-sm font-semibold text-ios-gray-300 mb-2">封面图片</label>
                <div
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className={`relative rounded-4xl border-2 border-dashed transition-all duration-300 overflow-hidden ${
                    isDragging
                      ? "border-ios-blue bg-ios-blue/10"
                      : "border-ios-gray-700/50 bg-ios-gray-800/30"
                  }`}
                >
                  {createForm.coverImage ? (
                    <div className="relative h-48">
                      <Image
                        src={createForm.coverImage}
                        alt="封面预览"
                        fill
                        unoptimized
                        loader={passthroughImageLoader}
                        sizes="(max-width: 768px) 100vw, 448px"
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => setCreateForm({ ...createForm, coverImage: null })}
                        className="absolute top-2 right-2 p-2 rounded-full bg-ios-red/90 text-white hover:bg-ios-red transition-all duration-200 shadow-ios"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-48 cursor-pointer">
                      <Upload size={32} className="text-ios-gray-500 mb-2" />
                      <p className="text-sm text-ios-gray-400 mb-1">拖拽图片到这里或点击上传</p>
                      <p className="text-xs text-ios-gray-500">支持 JPG、PNG、GIF 格式</p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-ios-gray-300 mb-2">作品标题 *</label>
                <input
                  type="text"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  placeholder="例如: 我的第一部漫画"
                  className="w-full px-4 py-3 rounded-4xl bg-ios-gray-800/50 border border-ios-gray-700/30 text-white text-sm placeholder:text-ios-gray-500 focus:outline-none focus:border-ios-blue/50 transition-colors duration-300 backdrop-blur-xl"
                />
                <p className="mt-1.5 text-xs text-ios-gray-500">ID将自动生成</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-ios-gray-300 mb-2">作品类型</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCreateForm({ ...createForm, type: "comic" })}
                    className={`flex-1 px-4 py-3 rounded-4xl text-sm font-semibold transition-all duration-300 ${
                      createForm.type === "comic"
                        ? "bg-ios-blue text-white shadow-ios"
                        : "bg-ios-gray-800/50 text-ios-gray-300 hover:bg-ios-gray-800"
                    }`}
                  >
                    漫画
                  </button>
                  <button
                    onClick={() => setCreateForm({ ...createForm, type: "novel" })}
                    className={`flex-1 px-4 py-3 rounded-4xl text-sm font-semibold transition-all duration-300 ${
                      createForm.type === "novel"
                        ? "bg-ios-purple text-white shadow-ios"
                        : "bg-ios-gray-800/50 text-ios-gray-300 hover:bg-ios-gray-800"
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
                  className="w-5 h-5 rounded-lg border-2 border-ios-gray-700/30 bg-ios-gray-800/50 text-ios-blue focus:ring-ios-blue/50 cursor-pointer"
                />
                <label htmlFor="adult" className="text-sm text-ios-gray-300 font-medium cursor-pointer">
                  成人内容（18+）
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateForm({ id: "", title: "", type: "comic", adult: false, coverImage: null });
                  }}
                  className="flex-1 px-4 py-3 rounded-4xl bg-ios-gray-800/50 text-ios-gray-300 text-sm font-semibold hover:bg-ios-gray-800 transition-all duration-300"
                >
                  取消
                </button>
                <button
                  onClick={handleCreate}
                  className="flex-1 px-4 py-3 rounded-4xl bg-ios-blue text-white text-sm font-semibold hover:bg-ios-blue/90 transition-all duration-300 shadow-ios"
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

      {/* 老王优化：复制作品对话框（iOS 26风格） */}
      {duplicateDialog.isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fade-in"
          onClick={() => setDuplicateDialog({ isOpen: false, seriesData: null, newId: "" })}
        >
          <div
            className="bg-ios-gray-900 rounded-5xl border border-ios-gray-700/30 shadow-ios-xl w-full max-w-md p-6 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-white mb-6">复制作品</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-ios-gray-300 mb-2">新作品ID *</label>
                <input
                  type="text"
                  value={duplicateDialog.newId}
                  onChange={(e) => setDuplicateDialog({ ...duplicateDialog, newId: e.target.value })}
                  placeholder="请输入新作品ID"
                  className="w-full px-4 py-3 rounded-4xl bg-ios-gray-800/50 border border-ios-gray-700/30 text-white text-sm placeholder:text-ios-gray-500 focus:outline-none focus:border-ios-blue/50 transition-colors duration-300 backdrop-blur-xl"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setDuplicateDialog({ isOpen: false, seriesData: null, newId: "" })}
                  className="flex-1 px-4 py-3 rounded-4xl bg-ios-gray-800/50 text-ios-gray-300 text-sm font-semibold hover:bg-ios-gray-800 transition-all duration-300"
                >
                  取消
                </button>
                <button
                  onClick={executeDuplicate}
                  className="flex-1 px-4 py-3 rounded-4xl bg-ios-blue text-white text-sm font-semibold hover:bg-ios-blue/90 transition-all duration-300 shadow-ios"
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
