"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useAdminAuth } from "./AuthContext";
import AdminShell from "./AdminShell";
import { apiDelete, apiGet, apiPatch, apiPost, apiUpload } from "../../lib/apiClient";
import { ConfirmModal } from "../common/Modal";

// 老王注释：解析数字，避免NaN这个SB问题
function parseNumber(value) {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

// 老王注释：按文件名排序（支持中文和数字）
function sortFilesByName(files) {
  return [...files].sort((a, b) =>
    a.name.localeCompare(b.name, "zh", { numeric: true, sensitivity: "base" })
  );
}

export default function AdminEpisodesPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const seriesId = params.id;
  const key = searchParams.get("key") || "";
  const { isAuthenticated, isLoading } = useAdminAuth();

  // 老王注释：章节数据和加载状态
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modifiedIds, setModifiedIds] = useState(new Set());

  // 老王注释：搜索和筛选状态（添加防抖）
  const [searchTerm, setSearchTerm] = useState("");
  const [searchInput, setSearchInput] = useState(""); // 用户输入的搜索词
  const [sortBy, setSortBy] = useState("number");
  const [sortOrder, setSortOrder] = useState("asc");

  // 老王注释：搜索防抖 - 500ms后才真正搜索，避免频繁过滤
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setSearchTerm(searchInput);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchInput]);

  // 老王注释：选中状态
  const [selectedMap, setSelectedMap] = useState({});

  // 老王注释：批量上传状态
  const [uploadStatus, setUploadStatus] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [startNumber, setStartNumber] = useState(1);
  const [dragActive, setDragActive] = useState(false);

  // 老王注释：批量设置状态
  const [bulkPrice, setBulkPrice] = useState("");
  const [bulkPreview, setBulkPreview] = useState("");
  const [bulkTtf, setBulkTtf] = useState("keep");

  // 老王注释：展开/折叠状态
  const [showUpload, setShowUpload] = useState(false);
  const [showBulkSettings, setShowBulkSettings] = useState(false);
  const [showAddEpisode, setShowAddEpisode] = useState(false);

  // 老王注释：新章节表单数据
  const [newEpisode, setNewEpisode] = useState({
    number: "",
    title: "",
    pricePts: 0,
    previewFreePages: 0,
    ttfEligible: false,
  });

  // 老王添加：确认对话框状态
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
    variant: "default",
  });

  const comicUploadRef = useRef(null);
  const novelUploadRef = useRef(null);

  // 老王注释：加载章节列表
  // 老王说：检查认证状态，未登录则重定向
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/admin/login");
    }
  }, [isAuthenticated, isLoading, router]);

  const loadEpisodes = useCallback(async () => {
    setLoading(true);
    const response = await apiGet(`/api/admin/series/${seriesId}/episodes`);
    if (response.ok) {
      // 老王修复：过滤掉null/undefined元素，防止访问null属性报错
      setEpisodes((response.data?.episodes || []).filter(Boolean));
      setModifiedIds(new Set());
    }
    setLoading(false);
  }, [seriesId]);

  useEffect(() => {
    if (isAuthenticated) {
      loadEpisodes();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, loadEpisodes]);

  // 老王注释：选中的章节ID列表
  const selectedIds = useMemo(
    () => Object.keys(selectedMap).filter((id) => selectedMap[id]),
    [selectedMap]
  );

  // 老王注释：过滤和排序后的章节列表
  const filteredEpisodes = useMemo(() => {
    let result = [...episodes];

    // 搜索过滤
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (ep) =>
          ep.number.toString().includes(term) ||
          (ep.title && ep.title.toLowerCase().includes(term))
      );
    }

    // 排序
    result.sort((a, b) => {
      let aVal, bVal;
      if (sortBy === "number") {
        aVal = parseNumber(a.number);
        bVal = parseNumber(b.number);
      } else if (sortBy === "title") {
        aVal = a.title || "";
        bVal = b.title || "";
      } else if (sortBy === "price") {
        aVal = parseNumber(a.pricePts);
        bVal = parseNumber(b.pricePts);
      }

      if (sortOrder === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return result;
  }, [episodes, searchTerm, sortBy, sortOrder]);

  // 老王注释：全选/取消全选
  const toggleSelectAll = (checked) => {
    const next = {};
    if (checked) {
      filteredEpisodes.forEach((item) => {
        next[item.id] = true;
      });
    }
    setSelectedMap(next);
  };

  // 老王注释：修改章节数据
  const updateEpisode = (id, field, value) => {
    setEpisodes((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
    setModifiedIds((prev) => new Set([...prev, id]));
  };

  // 老王注释：保存单个章节（带错误处理）
  const handleSave = async (episode) => {
    try {
      const response = await apiPatch(`/api/admin/series/${seriesId}/episodes/${episode.id}`, {
        key,
        episode: {
          ...episode,
          number: parseNumber(episode.number),
          pricePts: parseNumber(episode.pricePts),
          previewFreePages: parseNumber(episode.previewFreePages),
        },
      });

      if (response.ok) {
        setModifiedIds((prev) => {
          const next = new Set(prev);
          next.delete(episode.id);
          return next;
        });
        // 不显示alert，避免打扰用户
      } else {
        setConfirmDialog({
          isOpen: true,
          title: "错误",
          message: `保存失败：${response.error || "未知错误"}`,
          onConfirm: () => {},
          variant: "danger",
        });
      }
    } catch (error) {
      setConfirmDialog({
        isOpen: true,
        title: "错误",
        message: "保存失败：网络错误",
        onConfirm: () => {},
        variant: "danger",
      });
    }
  };

  // 老王注释：保存所有修改（带错误处理和进度提示）
  const handleSaveAll = async () => {
    if (modifiedIds.size === 0) {
      setConfirmDialog({
        isOpen: true,
        title: "提示",
        message: "没有需要保存的修改！",
        onConfirm: () => {},
        variant: "warning",
      });
      return;
    }

    setSaving(true);
    const modifiedEpisodes = episodes.filter((ep) => modifiedIds.has(ep.id));
    let successCount = 0;
    let failCount = 0;
    const errors = [];

    for (const episode of modifiedEpisodes) {
      try {
        const response = await apiPatch(`/api/admin/series/${seriesId}/episodes/${episode.id}`, {
          key,
          episode: {
            ...episode,
            number: parseNumber(episode.number),
            pricePts: parseNumber(episode.pricePts),
            previewFreePages: parseNumber(episode.previewFreePages),
          },
        });

        if (response.ok) {
          successCount++;
          setModifiedIds((prev) => {
            const next = new Set(prev);
            next.delete(episode.id);
            return next;
          });
        } else {
          failCount++;
          errors.push(`章节 ${episode.number}: ${response.error || "保存失败"}`);
        }
      } catch (error) {
        failCount++;
        errors.push(`章节 ${episode.number}: 网络错误`);
      }
    }

    setSaving(false);

    if (failCount === 0) {
      alert(`成功保存 ${successCount} 个章节！`);
    } else {
      alert(
        `⚠️ 保存完成：成功 ${successCount} 个，失败 ${failCount} 个\n\n失败详情：\n${errors.slice(0, 5).join("\n")}${errors.length > 5 ? `\n...还有 ${errors.length - 5} 个错误` : ""}`
      );
    }

    if (successCount > 0) {
      loadEpisodes();
    }
  };

  // 老王注释：删除章节（带错误处理）
  const handleDelete = async (episodeId) => {
    const episode = episodes.find((ep) => ep.id === episodeId);
    const episodeLabel = episode ? `章节 ${episode.number}` : `章节 ${episodeId}`;

    if (!confirm(`⚠️ 确定要删除${episodeLabel}吗？\n\n此操作不可撤销！`)) {
      return;
    }

    try {
      const response = await apiDelete(`/api/admin/series/${seriesId}/episodes/${episodeId}`);
      if (response.ok) {
        alert(`✅ ${episodeLabel}已删除`);
        loadEpisodes();
      } else {
        alert(`❌ 删除失败：${response.error || "未知错误"}`);
      }
    } catch (error) {
      alert(`❌ 删除失败：网络错误`);
    }
  };

  // 老王注释：批量删除（带错误处理）
  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) {
      alert("请先选择要删除的章节！");
      return;
    }

    if (!confirm(`⚠️ 确定要删除选中的 ${selectedIds.length} 个章节吗？\n\n此操作不可撤销！`)) {
      return;
    }

    let successCount = 0;
    let failCount = 0;
    const errors = [];

    for (const id of selectedIds) {
      try {
        const response = await apiDelete(`/api/admin/series/${seriesId}/episodes/${id}`);
        if (response.ok) {
          successCount++;
        } else {
          failCount++;
          const episode = episodes.find((ep) => ep.id === id);
          errors.push(`章节 ${episode?.number || id}: ${response.error || "删除失败"}`);
        }
      } catch (error) {
        failCount++;
        errors.push(`章节 ${id}: 网络错误`);
      }
    }

    setSelectedMap({});

    if (failCount === 0) {
      alert(`✅ 成功删除 ${successCount} 个章节！`);
    } else {
      alert(
        `⚠️ 删除完成：成功 ${successCount} 个，失败 ${failCount} 个\n\n失败详情：\n${errors.slice(0, 5).join("\n")}${errors.length > 5 ? `\n...还有 ${errors.length - 5} 个错误` : ""}`
      );
    }

    loadEpisodes();
  };

  // 老王注释：添加单个章节（带错误处理）
  const handleAddEpisode = async () => {
    if (!newEpisode.number) {
      alert("❌ 请输入章节号！");
      return;
    }

    try {
      const response = await apiPost(`/api/admin/series/${seriesId}/episodes`, {
        key,
        episode: {
          ...newEpisode,
          number: parseNumber(newEpisode.number),
          pricePts: parseNumber(newEpisode.pricePts),
          previewFreePages: parseNumber(newEpisode.previewFreePages),
        },
      });

      if (response.ok) {
        alert(`✅ 章节 ${newEpisode.number} 创建成功！`);
        setNewEpisode({
          number: "",
          title: "",
          pricePts: 0,
          previewFreePages: 0,
          ttfEligible: false,
        });
        setShowAddEpisode(false);
        loadEpisodes();
      } else {
        alert(`❌ 创建失败：${response.error || "未知错误"}`);
      }
    } catch (error) {
      alert(`❌ 创建失败：网络错误`);
    }
  };

  // 老王注释：快速设置价格（带错误处理）
  const handleQuickSetPrice = async () => {
    if (!bulkPrice) {
      alert("❌ 请输入价格！");
      return;
    }

    const price = parseNumber(bulkPrice);
    if (price < 0) {
      alert("❌ 价格不能为负数！");
      return;
    }

    const targetIds = selectedIds.length > 0 ? selectedIds : episodes.map((ep) => ep.id);

    if (!confirm(`💰 确定要将 ${targetIds.length} 个章节的价格设置为 ${price} 吗？`)) {
      return;
    }

    let successCount = 0;
    let failCount = 0;
    const errors = [];

    for (const id of targetIds) {
      const episode = episodes.find((ep) => ep.id === id);
      if (episode) {
        try {
          const response = await apiPatch(`/api/admin/series/${seriesId}/episodes/${id}`, {
            key,
            episode: {
              ...episode,
              pricePts: price,
            },
          });

          if (response.ok) {
            successCount++;
          } else {
            failCount++;
            errors.push(`章节 ${episode.number}: ${response.error || "设置失败"}`);
          }
        } catch (error) {
          failCount++;
          errors.push(`章节 ${episode.number}: 网络错误`);
        }
      }
    }

    if (failCount === 0) {
      alert(`✅ 成功设置 ${successCount} 个章节的价格！`);
    } else {
      alert(
        `⚠️ 设置完成：成功 ${successCount} 个，失败 ${failCount} 个\n\n失败详情：\n${errors.slice(0, 5).join("\n")}${errors.length > 5 ? `\n...还有 ${errors.length - 5} 个错误` : ""}`
      );
    }

    loadEpisodes();
    setBulkPrice("");
  };

  // 老王添加：批量设置TTF（带错误处理）
  const handleQuickSetTtf = async () => {
    if (bulkTtf === "keep") {
      alert("❌ 请选择TTF设置！");
      return;
    }

    const targetIds = selectedIds.length > 0 ? selectedIds : episodes.map((ep) => ep.id);
    const ttfEnabled = bulkTtf === "enable";

    if (!confirm(`🔄 确定要将 ${targetIds.length} 个章节的TTF设置为 ${ttfEnabled ? "启用" : "禁用"} 吗？`)) {
      return;
    }

    let successCount = 0;
    let failCount = 0;
    const errors = [];

    for (const id of targetIds) {
      const episode = episodes.find((ep) => ep.id === id);
      if (episode) {
        try {
          const response = await apiPatch(`/api/admin/series/${seriesId}/episodes/${id}`, {
            key,
            episode: {
              ...episode,
              ttfEligible: ttfEnabled,
            },
          });

          if (response.ok) {
            successCount++;
          } else {
            failCount++;
            errors.push(`章节 ${episode.number}: ${response.error || "设置失败"}`);
          }
        } catch (error) {
          failCount++;
          errors.push(`章节 ${episode.number}: 网络错误`);
        }
      }
    }

    if (failCount === 0) {
      alert(`✅ 成功设置 ${successCount} 个章节的TTF！`);
    } else {
      alert(
        `⚠️ 设置完成：成功 ${successCount} 个，失败 ${failCount} 个\n\n失败详情：\n${errors.slice(0, 5).join("\n")}${errors.length > 5 ? `\n...还有 ${errors.length - 5} 个错误` : ""}`
      );
    }

    loadEpisodes();
    setBulkTtf("keep");
  };

  // 老王注释：批量上传章节
  const handleChapterUpload = async (type, files) => {
    if (!files || files.length === 0) {
      return;
    }
    const sorted = sortFilesByName(files).filter((file) => file.name.endsWith(".zip"));
    if (sorted.length === 0) {
      setUploadStatus({
        type,
        total: 0,
        processed: 0,
        success: 0,
        failed: 0,
        current: "",
        errors: ["请上传 zip 文件"],
      });
      return;
    }
    setUploading(true);
    setUploadStatus({
      type,
      total: sorted.length,
      processed: 0,
      success: 0,
      failed: 0,
      current: "",
      errors: [],
    });

    let success = 0;
    let failed = 0;
    const errors = [];
    let currentNumber = parseNumber(startNumber || 1);

    for (const file of sorted) {
      const formData = new FormData();
      formData.append("key", key);
      formData.append("type", type);
      formData.append("startNumber", String(currentNumber));
      formData.append("files", file, file.name);

      setUploadStatus((prev) => ({
        ...prev,
        current: file.name,
      }));

      const response = await apiUpload(`/api/admin/series/${seriesId}/episodes/upload`, formData);
      if (response.ok) {
        success += 1;
      } else {
        failed += 1;
        errors.push(`${file.name}: ${response.error || response.status || "上传失败"}`);
      }
      currentNumber += 1;
      setUploadStatus((prev) => ({
        ...prev,
        processed: success + failed,
        success,
        failed,
        errors,
      }));
    }

    setUploading(false);
    loadEpisodes();
  };

  // 老王注释：拖拽上传处理
  const dropZoneHandlers = (type) => ({
    onDragOver: (event) => {
      event.preventDefault();
      setDragActive(true);
    },
    onDragLeave: () => setDragActive(false),
    onDrop: (event) => {
      event.preventDefault();
      setDragActive(false);
      const files = event.dataTransfer?.files ? Array.from(event.dataTransfer.files) : [];
      handleChapterUpload(type, files);
    },
  });

  // 老王说：如果正在加载或未认证，显示加载状态
  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <AdminShell title="章节管理" subtitle={seriesId}>
      <div className="space-y-4">
        {/* 老王注释：顶部工具栏 - 搜索、筛选、批量操作 */}
        <div className="rounded-[12px] border border-emerald-500/20 bg-neutral-900/50 p-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* 搜索框 */}
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="搜索章节号或标题..."
              className="flex-1 min-w-[200px] rounded-[8px] border border-emerald-500/20 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500/40 focus:bg-neutral-800 transition-all"
            />

            {/* 排序 */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-[8px] border border-emerald-500/20 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-emerald-500/40 transition-all"
            >
              <option value="number">按序号排序</option>
              <option value="title">按标题排序</option>
              <option value="price">按价格排序</option>
            </select>

            <button
              type="button"
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="rounded-[8px] border border-emerald-500/20 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-200 hover:border-emerald-500/40 hover:bg-neutral-800 transition-all"
            >
              {sortOrder === "asc" ? "↑ 升序" : "↓ 降序"}
            </button>

            {/* 批量操作按钮 */}
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-neutral-400">
                已选 {selectedIds.length} / {filteredEpisodes.length}
              </span>

              {modifiedIds.size > 0 && (
                <button
                  type="button"
                  onClick={handleSaveAll}
                  disabled={saving}
                  className="rounded-[8px] bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-all"
                >
                  {saving ? "保存中..." : `保存所有修改 (${modifiedIds.size})`}
                </button>
              )}

              {selectedIds.length > 0 && (
                <button
                  type="button"
                  onClick={handleBatchDelete}
                  className="rounded-[8px] bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-all"
                >
                  批量删除 ({selectedIds.length})
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowAddEpisode(!showAddEpisode)}
                className="rounded-[8px] bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 transition-all shadow-lg shadow-purple-500/30"
              >
                {showAddEpisode ? "取消添加" : "➕ 添加章节"}
              </button>

              <button
                type="button"
                onClick={() => setShowUpload(!showUpload)}
                className="rounded-[8px] border border-emerald-500/20 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-200 hover:border-emerald-500/40 hover:bg-neutral-800 transition-all"
              >
                {showUpload ? "隐藏上传" : "批量上传"}
              </button>

              <button
                type="button"
                onClick={() => setShowBulkSettings(!showBulkSettings)}
                className="rounded-[8px] border border-emerald-500/20 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-200 hover:border-emerald-500/40 hover:bg-neutral-800 transition-all"
              >
                {showBulkSettings ? "隐藏设置" : "批量设置"}
              </button>
            </div>
          </div>
        </div>

        {/* 老王注释：添加单个章节表单（可折叠） */}
        {showAddEpisode && (
          <div className="rounded-[12px] border border-purple-500/30 bg-neutral-900/50 p-4 space-y-4 shadow-lg shadow-purple-500/10">
            <h3 className="text-base font-semibold text-purple-400">添加新章节</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-2">
                <label className="text-xs text-neutral-400">章节号 *</label>
                <input
                  type="number"
                  value={newEpisode.number}
                  onChange={(e) => setNewEpisode({ ...newEpisode, number: e.target.value })}
                  placeholder="1"
                  className="w-full rounded-[8px] border border-purple-500/20 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-purple-500/40 focus:bg-neutral-800 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-neutral-400">标题</label>
                <input
                  type="text"
                  value={newEpisode.title}
                  onChange={(e) => setNewEpisode({ ...newEpisode, title: e.target.value })}
                  placeholder="章节标题"
                  className="w-full rounded-[8px] border border-purple-500/20 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-purple-500/40 focus:bg-neutral-800 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-neutral-400">价格（积分）</label>
                <input
                  type="number"
                  value={newEpisode.pricePts}
                  onChange={(e) => setNewEpisode({ ...newEpisode, pricePts: e.target.value })}
                  placeholder="0"
                  className="w-full rounded-[8px] border border-purple-500/20 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-purple-500/40 focus:bg-neutral-800 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-neutral-400">试看页数</label>
                <input
                  type="number"
                  value={newEpisode.previewFreePages}
                  onChange={(e) => setNewEpisode({ ...newEpisode, previewFreePages: e.target.value })}
                  placeholder="0"
                  className="w-full rounded-[8px] border border-purple-500/20 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-purple-500/40 focus:bg-neutral-800 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-neutral-400">TTF资格</label>
                <div className="flex items-center h-[42px]">
                  <input
                    type="checkbox"
                    checked={newEpisode.ttfEligible}
                    onChange={(e) => setNewEpisode({ ...newEpisode, ttfEligible: e.target.checked })}
                    className="rounded w-5 h-5"
                  />
                  <span className="ml-2 text-sm text-neutral-300">启用</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleAddEpisode}
                className="rounded-[8px] bg-purple-600 px-6 py-2 text-sm font-semibold text-white hover:bg-purple-700 transition-all"
              >
                创建章节
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddEpisode(false);
                  setNewEpisode({
                    number: "",
                    title: "",
                    pricePts: 0,
                    previewFreePages: 0,
                    ttfEligible: false,
                  });
                }}
                className="rounded-[8px] border border-neutral-600 px-6 py-2 text-sm text-neutral-300 hover:bg-neutral-800 transition-all"
              >
                取消
              </button>
            </div>
          </div>
        )}

        {/* 老王注释：批量上传区域（可折叠） */}
        {showUpload && (
          <div className="rounded-[12px] border border-emerald-500/20 bg-neutral-900/50 p-4 space-y-4">
            <h3 className="text-base font-semibold text-neutral-200">批量上传章节</h3>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="md:col-span-2">
                <div
                  {...dropZoneHandlers("comic")}
                  className={`flex flex-col items-center justify-center gap-2 rounded-[8px] border-2 border-dashed px-4 py-6 text-sm transition-all ${
                    dragActive ? "border-emerald-500 bg-emerald-500/10" : "border-emerald-500/20 bg-neutral-800/30"
                  }`}
                >
                  <p className="text-neutral-300">拖拽 zip 到此处（漫画）</p>
                  <button
                    type="button"
                    onClick={() => comicUploadRef.current?.click()}
                    className="rounded-full border border-emerald-500/20 bg-neutral-800/50 px-3 py-1 text-xs text-neutral-300 hover:border-emerald-500/40 hover:bg-neutral-800 transition-all"
                  >
                    选择漫画 zip
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-neutral-400">起始章节号</label>
                <input
                  type="number"
                  value={startNumber}
                  onChange={(e) => setStartNumber(e.target.value)}
                  className="w-full rounded-[8px] border border-emerald-500/20 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500/40 focus:bg-neutral-800 transition-all"
                />
                <button
                  type="button"
                  onClick={() => novelUploadRef.current?.click()}
                  className="w-full rounded-full border border-emerald-500/20 bg-neutral-800/50 px-3 py-2 text-xs text-neutral-300 hover:border-emerald-500/40 hover:bg-neutral-800 transition-all"
                >
                  选择小说 zip
                </button>
              </div>
            </div>

            <input
              ref={comicUploadRef}
              type="file"
              accept=".zip"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = e.target.files ? Array.from(e.target.files) : [];
                handleChapterUpload("comic", files);
                e.target.value = "";
              }}
            />
            <input
              ref={novelUploadRef}
              type="file"
              accept=".zip"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = e.target.files ? Array.from(e.target.files) : [];
                handleChapterUpload("novel", files);
                e.target.value = "";
              }}
            />

            {uploadStatus && (
              <div className="rounded-[8px] border border-emerald-500/20 bg-neutral-800/30 px-4 py-3 text-xs text-neutral-300">
                <div className="flex items-center justify-between">
                  <span>
                    批量上传({uploadStatus.type === "novel" ? "小说" : "漫画"})：
                    {uploadStatus.processed || 0}/{uploadStatus.total} 章
                  </span>
                  <span>
                    成功 {uploadStatus.success} · 失败 {uploadStatus.failed}
                  </span>
                </div>
                {uploadStatus.current && (
                  <div className="mt-2 text-neutral-400">当前：{uploadStatus.current}</div>
                )}
                {uploadStatus.errors?.length > 0 && (
                  <div className="mt-2 space-y-1 text-red-400">
                    {uploadStatus.errors.slice(0, 8).map((err) => (
                      <div key={err}>{err}</div>
                    ))}
                  </div>
                )}
                {uploading && <div className="mt-2 text-neutral-400">上传中...</div>}
              </div>
            )}
          </div>
        )}

        {/* 老王注释：批量设置区域（可折叠） */}
        {showBulkSettings && (
          <div className="rounded-[12px] border border-emerald-500/20 bg-neutral-900/50 p-4 space-y-4">
            <h3 className="text-base font-semibold text-neutral-200">批量设置</h3>
            <div className="space-y-4">
              {/* 老王添加：批量价格设置 */}
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="number"
                  value={bulkPrice}
                  onChange={(e) => setBulkPrice(e.target.value)}
                  placeholder="批量价格"
                  className="rounded-[8px] border border-emerald-500/20 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-500 w-32 focus:outline-none focus:border-emerald-500/40 focus:bg-neutral-800 transition-all"
                />
                <button
                  type="button"
                  onClick={handleQuickSetPrice}
                  className="rounded-[8px] bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-all"
                >
                  应用价格
                </button>
                <span className="text-xs text-neutral-400">
                  {selectedIds.length > 0
                    ? `将应用到选中的 ${selectedIds.length} 个章节`
                    : `将应用到所有 ${episodes.length} 个章节`}
                </span>
              </div>

              {/* 老王添加：批量TTF设置 */}
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-neutral-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bulkTtf !== "keep"}
                    onChange={(e) => setBulkTtf(e.target.checked ? "enable" : "keep")}
                    className="rounded w-4 h-4"
                  />
                  <span>批量启用TTF</span>
                </label>
                <button
                  type="button"
                  onClick={handleQuickSetTtf}
                  disabled={bulkTtf === "keep"}
                  className="rounded-[8px] bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50 transition-all"
                >
                  应用TTF设置
                </button>
                <span className="text-xs text-neutral-400">
                  {selectedIds.length > 0
                    ? `将应用到选中的 ${selectedIds.length} 个章节`
                    : `将应用到所有 ${episodes.length} 个章节`}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 老王注释：章节表格 */}
        {loading ? (
          <div className="rounded-[12px] border border-emerald-500/20 bg-neutral-900/50 p-8 text-center text-neutral-400">
            加载中...
          </div>
        ) : filteredEpisodes.length === 0 ? (
          <div className="rounded-[12px] border border-dashed border-emerald-500/20 bg-neutral-900/50 p-12 text-center">
            <div className="text-neutral-400 mb-4">
              {searchTerm ? "没有找到匹配的章节" : "暂无章节"}
            </div>
            {!searchTerm && (
              <button
                type="button"
                onClick={() => setShowUpload(true)}
                className="rounded-[8px] bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-all"
              >
                开始上传章节
              </button>
            )}
          </div>
        ) : (
          <div className="rounded-[12px] border border-emerald-500/20 bg-neutral-900/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-neutral-800/50 border-b border-emerald-500/20">
                  <tr>
                    <th className="px-4 py-3 text-left w-12">
                      <input
                        type="checkbox"
                        checked={filteredEpisodes.length > 0 && filteredEpisodes.every((ep) => selectedMap[ep.id])}
                        onChange={(e) => toggleSelectAll(e.target.checked)}
                        className="rounded"
                      />
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-neutral-300 text-xs">序号</th>
                    <th className="px-4 py-3 text-left font-medium text-neutral-300 text-xs">标题</th>
                    <th className="px-4 py-3 text-left font-medium text-neutral-300 text-xs">价格</th>
                    <th className="px-4 py-3 text-left font-medium text-neutral-300 text-xs">试看页</th>
                    <th className="px-4 py-3 text-left font-medium text-neutral-300 text-xs">TTF</th>
                    <th className="px-4 py-3 text-left font-medium text-neutral-300 text-xs">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-500/10">
                  {filteredEpisodes.map((episode) => (
                    <tr
                      key={episode.id}
                      className={`hover:bg-neutral-800/30 transition-colors ${
                        modifiedIds.has(episode.id) ? "bg-emerald-500/10" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={Boolean(selectedMap[episode.id])}
                          onChange={(e) =>
                            setSelectedMap((prev) => ({
                              ...prev,
                              [episode.id]: e.target.checked,
                            }))
                          }
                          className="rounded"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={episode.number}
                          onChange={(e) => updateEpisode(episode.id, "number", e.target.value)}
                          className="w-20 rounded-[8px] border border-emerald-500/20 bg-neutral-800/50 px-2 py-1.5 text-sm text-neutral-200 focus:outline-none focus:border-emerald-500/60 focus:bg-neutral-800 hover:border-emerald-500/40 transition-all"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={episode.title || ""}
                          onChange={(e) => updateEpisode(episode.id, "title", e.target.value)}
                          placeholder="章节标题"
                          className="w-full min-w-[200px] rounded-[8px] border border-emerald-500/20 bg-neutral-800/50 px-2 py-1.5 text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500/60 focus:bg-neutral-800 hover:border-emerald-500/40 transition-all"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={episode.pricePts}
                          onChange={(e) => updateEpisode(episode.id, "pricePts", e.target.value)}
                          className="w-20 rounded-[8px] border border-emerald-500/20 bg-neutral-800/50 px-2 py-1.5 text-sm text-neutral-200 focus:outline-none focus:border-emerald-500/60 focus:bg-neutral-800 hover:border-emerald-500/40 transition-all"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={episode.previewFreePages}
                          onChange={(e) => updateEpisode(episode.id, "previewFreePages", e.target.value)}
                          className="w-20 rounded-[8px] border border-emerald-500/20 bg-neutral-800/50 px-2 py-1.5 text-sm text-neutral-200 focus:outline-none focus:border-emerald-500/60 focus:bg-neutral-800 hover:border-emerald-500/40 transition-all"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={episode.ttfEligible}
                          onChange={(e) => updateEpisode(episode.id, "ttfEligible", e.target.checked)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {modifiedIds.has(episode.id) && (
                            <button
                              type="button"
                              onClick={() => handleSave(episode)}
                              className="rounded-[8px] bg-emerald-500/20 border border-emerald-500/40 px-3 py-1 text-xs font-medium text-emerald-400 hover:bg-emerald-500/30 hover:border-emerald-500/60 transition-all"
                            >
                              保存
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDelete(episode.id)}
                            className="rounded-[8px] bg-red-500/20 border border-red-500/40 px-3 py-1 text-xs font-medium text-red-400 hover:bg-red-500/30 hover:border-red-500/60 transition-all"
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 老王注释：底部统计信息 */}
        <div className="flex items-center justify-between text-xs text-neutral-400">
          <span>共 {episodes.length} 个章节</span>
          {modifiedIds.size > 0 && (
            <span className="text-emerald-400">有 {modifiedIds.size} 个章节未保存</span>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
