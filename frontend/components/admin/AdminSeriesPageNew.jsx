"use client";

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus,
  Search,
  Grid,
  List,
  BookOpen,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdminAuth } from "./AuthContext";
import { adminDelete as apiDelete, adminGet as apiGet, adminPatch as apiPatch, adminPost as apiPost, adminUpload } from "../../lib/adminApiClient";
import { ConfirmModal } from "../common/Modal";
import { AdminFeedbackBanner } from "./common/AdminFeedbackBanner";
import BulkActionsToolbar from "./BulkActionsToolbar";
import AdvancedFilters from "./AdvancedFilters";
import CreateSeriesModal from "./series-workspace/CreateSeriesModal";
import DuplicateSeriesDialog from "./series-workspace/DuplicateSeriesDialog";
import SeriesCard from "./series-workspace/SeriesCard";
import {
  buildQueryString,
  buildSeriesPayload,
  createEmptyCreateForm,
  createSeriesId,
  DEFAULT_FILTERS,
  EMPTY_FEEDBACK,
  extractSeriesCollection,
  formatSeriesStatusLabel,
  MAX_UPLOAD_BYTES,
  normalizeGenresInput,
  normalizeSeries,
  QUICK_FILTERS,
  revokeObjectUrl,
  sortSeries,
  STATUS_OPTIONS,
  TYPE_TABS,
} from "./series-workspace/utils";

function Feedback({ feedback, onDismiss }) {
  return feedback?.message ? <AdminFeedbackBanner feedback={feedback} onDismiss={onDismiss} /> : null;
}

export default function AdminSeriesPageNew() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading } = useAdminAuth();
  const scopedCreatorQuery = useMemo(() => String(searchParams.get("q") || "").trim(), [searchParams]);
  const paramSearchQuery = useMemo(() => String(searchParams.get("q") || searchParams.get("search") || "").trim(), [searchParams]);
  const hasScopedCreatorFilter = Boolean(scopedCreatorQuery);
  const [seriesList, setSeriesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(EMPTY_FEEDBACK);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [quickFilter, setQuickFilter] = useState("all");
  const [advancedFilters, setAdvancedFilters] = useState(DEFAULT_FILTERS);
  const [viewMode, setViewMode] = useState("grid");
  const [selectedSeries, setSelectedSeries] = useState([]);
  const [editingId, setEditingId] = useState("");
  const [editingDraft, setEditingDraft] = useState(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState(createEmptyCreateForm);
  const [isDragging, setIsDragging] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [duplicateDialog, setDuplicateDialog] = useState({ isOpen: false, series: null, newId: "" });
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: "", message: "", onConfirm: null, variant: "default" });

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedSearchQuery(searchQuery.trim()), 250);
    return () => window.clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    const nextType = searchParams.get("type");
    setTypeFilter(nextType === "comic" || nextType === "novel" ? nextType : "all");
    setSearchQuery(paramSearchQuery);
    setDebouncedSearchQuery(paramSearchQuery);
  }, [paramSearchQuery, searchParams]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push("/admin/login");
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => () => revokeObjectUrl(createForm.coverPreviewUrl), [createForm.coverPreviewUrl]);

  const loadSeries = useCallback(async () => {
    setLoading(true);
    const response = hasScopedCreatorFilter
      ? await apiGet("/api/admin/series")
      : await apiGet(`/api/admin/series/search/advanced?${buildQueryString(debouncedSearchQuery, typeFilter, advancedFilters)}`);
    if (response.ok) {
      const nextSeries = extractSeriesCollection(response.data).filter(Boolean).map(normalizeSeries);
      setSeriesList(nextSeries);
      setSelectedSeries((current) => current.filter((id) => nextSeries.some((series) => series.id === id)));
    } else {
      setSeriesList([]);
      setFeedback({ type: "error", message: response.error || "作品列表加载失败。" });
    }
    setLoading(false);
  }, [advancedFilters, debouncedSearchQuery, hasScopedCreatorFilter, typeFilter]);

  useEffect(() => {
    if (!isAuthenticated) {
      if (!isLoading) setLoading(false);
      return;
    }
    loadSeries();
  }, [isAuthenticated, isLoading, loadSeries]);

  const filteredSeries = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const items = seriesList.filter((series) => {
      const readiness = getAdminSeriesReadiness(series);
      const matchesSearch =
        !normalizedQuery ||
        series.title.toLowerCase().includes(normalizedQuery) ||
        series.id.toLowerCase().includes(normalizedQuery) ||
        series.author.toLowerCase().includes(normalizedQuery) ||
        series.creatorLabel.toLowerCase().includes(normalizedQuery);
      const matchesType = typeFilter === "all" || series.type === typeFilter;
      const matchesStatus = advancedFilters.status === "all" || series.status === advancedFilters.status;
      const matchesAdult =
        advancedFilters.adultContent === "all" ||
        (advancedFilters.adultContent === "adult" && series.adult) ||
        (advancedFilters.adultContent === "general" && !series.adult);
      const matchesPublish = advancedFilters.publishStatus === "all" || (advancedFilters.publishStatus === "published" && series.isPublished) || (advancedFilters.publishStatus === "unpublished" && !series.isPublished);
      const matchesQuick =
        quickFilter === "all" ||
        (quickFilter === "needsMetadata" && readiness.missingCount > 0) ||
        (quickFilter === "noAuthor" && !series.creatorLabel.trim()) ||
        (quickFilter === "needsEpisodes" && series.episodeCount === 0) ||
        (quickFilter === "noCover" && !series.coverUrl) ||
        (quickFilter === "draft" && !series.isPublished) ||
        (quickFilter === "adult" && series.adult);
      return matchesSearch && matchesType && matchesStatus && matchesAdult && matchesPublish && matchesQuick;
    });
    return sortSeries(items, advancedFilters.sortBy);
  }, [advancedFilters.adultContent, advancedFilters.publishStatus, advancedFilters.sortBy, advancedFilters.status, quickFilter, searchQuery, seriesList, typeFilter]);

  const seriesStats = useMemo(() => {
    const total = seriesList.length;
    const comics = seriesList.filter((item) => item.type === "comic").length;
    const novels = seriesList.filter((item) => item.type === "novel").length;
    const readyCount = seriesList.filter((item) => getAdminSeriesReadiness(item).missingCount === 0).length;
    const noAuthor = seriesList.filter((item) => !item.creatorLabel.trim()).length;
    const drafts = seriesList.filter((item) => !item.isPublished).length;
    const noEpisodes = seriesList.filter((item) => item.episodeCount === 0).length;
    const noCover = seriesList.filter((item) => !item.coverUrl).length;

    return [
      { label: "全部作品", value: total, hint: "当前目录总量" },
      { label: "漫画", value: comics, hint: `另有 ${novels} 部小说` },
      { label: "可进前台", value: readyCount, hint: `仍有 ${noAuthor} 部缺少创作者署名` },
      { label: "待补章节", value: noEpisodes, hint: "适合优先做上架前收口" },
      { label: "待补封面", value: noCover, hint: `另有 ${drafts} 部仍在草稿` },
    ];
  }, [seriesList]);

  const suggestedSeriesId = useMemo(() => `${slugifyTitle(createForm.title)}-xxxxxx`, [createForm.title]);

  const allVisibleSelected = filteredSeries.length > 0 && filteredSeries.every((series) => selectedSeries.includes(series.id));
  const dismissFeedback = () => setFeedback(EMPTY_FEEDBACK);
  const resetCreateForm = useCallback(() => {
    setCreateForm((current) => {
      revokeObjectUrl(current.coverPreviewUrl);
      return createEmptyCreateForm();
    });
  }, []);
  const updateSeriesLocally = useCallback((seriesId, updater) => {
    setSeriesList((current) => current.map((series) => (series.id === seriesId ? updater(series) : series)));
  }, []);
  const handleOpenDetails = useCallback((seriesId) => router.push(`/admin/series/${seriesId}`), [router]);
  const handleOpenEpisodes = useCallback((seriesId) => router.push(`/admin/series/${seriesId}/episodes`), [router]);
  const handleOpenFrontend = useCallback((seriesId) => {
    if (typeof window === "undefined") {
      return;
    }

    window.open(`/series/${seriesId}`, "_blank", "noopener,noreferrer");
  }, []);
  const handleToggleSelection = (seriesId) => setSelectedSeries((current) => (current.includes(seriesId) ? current.filter((item) => item !== seriesId) : [...current, seriesId]));
  const handleToggleSelectAll = () => setSelectedSeries(allVisibleSelected ? [] : filteredSeries.map((series) => series.id));
  const handleStartEdit = (series) => {
    setEditingId(series.id);
    setEditingDraft({ title: series.title, status: series.status, adult: series.adult });
  };
  const handleCancelEdit = () => {
    setEditingId("");
    setEditingDraft(null);
  };

  const handleSaveEdit = async (seriesId) => {
    if (!editingDraft?.title?.trim()) {
      setFeedback({ type: "error", message: "作品标题不能为空。" });
      return;
    }
    const target = seriesList.find((series) => series.id === seriesId);
    if (!target) return;
    setIsSavingEdit(true);
    const response = await apiPatch(`/api/admin/series/${seriesId}`, { series: buildSeriesPayload(target, { title: editingDraft.title.trim(), status: editingDraft.status, adult: editingDraft.adult }) });
    if (response.ok) {
      updateSeriesLocally(seriesId, (current) => ({ ...current, title: editingDraft.title.trim(), status: editingDraft.status, adult: editingDraft.adult, updatedAt: new Date().toISOString() }));
      setFeedback({ type: "success", message: "作品信息已更新。" });
      handleCancelEdit();
    } else {
      setFeedback({ type: "error", message: response.error || "更改保存失败。" });
    }
    setIsSavingEdit(false);
  };

  const handleTogglePublish = async (series) => {
    const nextPublished = !series.isPublished;
    const response = await apiPatch(`/api/admin/series/${series.id}`, { series: buildSeriesPayload(series, { isPublished: nextPublished }) });
    if (response.ok) {
      updateSeriesLocally(series.id, (current) => ({ ...current, isPublished: nextPublished, updatedAt: new Date().toISOString() }));
      setFeedback({ type: "success", message: nextPublished ? "作品已发布到前台。" : "作品已转回草稿。" });
    } else {
      setFeedback({ type: "error", message: response.error || "发布状态更新失败。" });
    }
  };

  const uploadCoverImage = async (file) => {
    if (!file) return "";
    if (!file.type.startsWith("image/")) throw new Error("请上传有效的图片文件。");
    if (file.size > MAX_UPLOAD_BYTES) throw new Error("封面图片大小不能超过 10MB。");
    const formData = new FormData();
    formData.append("file", file);
    const response = await adminUpload("/api/admin/upload/image", formData);
    if (!response.ok || !response.data?.url) throw new Error(response.error || "封面上传失败。");
    return response.data.url;
  };

  const handleCreate = async () => {
    if (!createForm.title.trim()) {
      setFeedback({ type: "error", message: "作品标题不能为空。" });
      return;
    }
    setIsCreating(true);
    try {
      const nextSeriesId = createSeriesId(createForm.title);
      const coverUrl = await uploadCoverImage(createForm.coverFile);
      const response = await apiPost("/api/admin/series", {
        series: buildSeriesPayload({
          id: nextSeriesId,
          title: createForm.title,
          author: createForm.author.trim(),
          type: createForm.type,
          adult: createForm.adult,
          coverUrl,
          description: createForm.description,
          genres: normalizeGenresInput(createForm.genres),
          status: createForm.status,
          isPublished: createForm.isPublished,
          isFeatured: false,
        }),
      });
      if (!response.ok) throw new Error(response.error || "创建作品失败。");
      const createdSeriesId = response.data?.series?.id || nextSeriesId;
      const nextFlow = createForm.openAfterCreate || "stay";

      setFeedback({
        type: "success",
        message:
          nextFlow === "episodes"
            ? "作品已创建，正在进入章节管理。"
            : nextFlow === "details"
              ? "作品已创建，正在进入详情页。"
              : "作品创建成功。",
      });
      setShowCreateModal(false);
      resetCreateForm();

      if (nextFlow === "episodes") {
        router.push(`/admin/series/${createdSeriesId}/episodes`);
        return;
      }

      if (nextFlow === "details") {
        router.push(`/admin/series/${createdSeriesId}`);
        return;
      }

      await loadSeries();
    } catch (error) {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "创建作品失败。" });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = (series) => setConfirmDialog({
    isOpen: true,
    title: "删除作品",
    message: `确定删除《${series.title}》吗？此操作无法撤销。`,
    variant: "danger",
    onConfirm: async () => {
      const response = await apiDelete(`/api/admin/series/${series.id}`);
      if (response.ok) {
        setSeriesList((current) => current.filter((item) => item.id !== series.id));
        setSelectedSeries((current) => current.filter((id) => id !== series.id));
        setFeedback({ type: "success", message: "作品已删除。" });
      } else {
        setFeedback({ type: "error", message: response.error || "删除作品失败。" });
      }
    },
  });

  const handleOpenDuplicate = (series) => setDuplicateDialog({ isOpen: true, series, newId: `${slugifyTitle(series.title)}-copy` });
  const handleDuplicate = async () => {
    const source = duplicateDialog.series;
    const nextId = duplicateDialog.newId.trim();
    if (!source || !nextId) {
      setFeedback({ type: "error", message: "请输入新的作品 ID。" });
      return;
    }
    setIsDuplicating(true);
    const response = await apiPost("/api/admin/series", { series: buildSeriesPayload(source, { id: nextId, title: `${source.title}（副本）` }) });
    if (response.ok) {
      setFeedback({ type: "success", message: "作品已复制。" });
      setDuplicateDialog({ isOpen: false, series: null, newId: "" });
      await loadSeries();
    } else {
      setFeedback({ type: "error", message: response.error || "复制作品失败。" });
    }
    setIsDuplicating(false);
  };

  const updatePublishStateForSelection = async (nextPublished) => {
    const targets = seriesList.filter((series) => selectedSeries.includes(series.id));
    await Promise.all(targets.map((series) => apiPatch(`/api/admin/series/${series.id}`, { series: buildSeriesPayload(series, { isPublished: nextPublished }) })));
    setSeriesList((current) => current.map((series) => (selectedSeries.includes(series.id) ? { ...series, isPublished: nextPublished, updatedAt: new Date().toISOString() } : series)));
    setFeedback({ type: "success", message: nextPublished ? "已发布所选作品。" : "已将所选作品转为草稿。" });
  };

  const handleBulkPublish = async () => updatePublishStateForSelection(true);
  const handleBulkUnpublish = async () => updatePublishStateForSelection(false);
  const handleBulkDelete = async () => setConfirmDialog({
    isOpen: true,
    title: "删除已选作品",
    message: `确定删除 ${selectedSeries.length} 部已选作品吗？此操作无法撤销。`,
    variant: "danger",
    onConfirm: async () => {
      const ids = [...selectedSeries];
      await Promise.all(ids.map((id) => apiDelete(`/api/admin/series/${id}`)));
      setSeriesList((current) => current.filter((series) => !ids.includes(series.id)));
      setSelectedSeries([]);
      setFeedback({ type: "success", message: "已删除所选作品。" });
    },
  });

  const handleCoverInput = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setFeedback({ type: "error", message: "请上传有效的图片文件。" });
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setFeedback({ type: "error", message: "封面图片大小不能超过 10MB。" });
      return;
    }
    setCreateForm((current) => {
      revokeObjectUrl(current.coverPreviewUrl);
      return { ...current, coverFile: file, coverPreviewUrl: URL.createObjectURL(file) };
    });
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    resetCreateForm();
  };

  if (isLoading || loading) return <section className="rounded-[28px] border border-[color:var(--gush-border)] bg-white/88 p-8 text-sm text-slate-600 shadow-[var(--gush-shadow-soft)]">正在加载作品工作台...</section>;
  if (!isAuthenticated) return <section className="rounded-[28px] border border-dashed border-[color:var(--gush-border)] bg-white/88 p-10 text-center text-sm text-slate-600 shadow-[var(--gush-shadow-soft)]">需要管理员权限才能查看此页面。</section>;

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[color:var(--gush-border)] bg-white/92 p-6 shadow-[var(--gush-shadow-soft)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">作品工作台</p>
            <h2 className="text-2xl font-semibold text-slate-950">先把作品信息补真，再决定是否发布。</h2>
            <p className="text-sm leading-6 text-slate-600">优先按前台可读性检查作品，再进入详情页或章节管理做下一步处理。</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 rounded-full border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] p-1.5">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setCreateForm({
                  ...createEmptyCreateForm(),
                  type: "comic",
                  openAfterCreate: "episodes",
                });
                setShowCreateModal(true);
              }}
            >
              <BookOpen className="size-4" />
              <span>新增漫画</span>
            </Button>
            <Button type="button" onClick={() => { setCreateForm(createEmptyCreateForm()); setShowCreateModal(true); }}>
              <Plus className="size-4" />
              <span>新增作品</span>
            </Button>
          </div>
        </div>
      </section>

      <Feedback feedback={feedback} onDismiss={dismissFeedback} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {seriesStats.map((item) => (
          <article key={item.label} className="rounded-[24px] border border-[color:var(--gush-border)] bg-white/88 p-5 shadow-[var(--gush-shadow-soft)]">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
            <p className="mt-3 text-3xl font-semibold text-slate-950">{item.value}</p>
            <p className="mt-2 text-sm text-slate-600">{item.hint}</p>
          </article>
        ))}
      </section>

      <section className="rounded-[28px] border border-[color:var(--gush-border)] bg-white/92 p-5 shadow-[var(--gush-shadow-soft)]">
        <div className="flex flex-col gap-4">
          {hasScopedCreatorFilter ? (
            <div className="flex flex-col gap-3 rounded-[24px] border border-sky-200 bg-sky-50 px-4 py-4 text-sm text-sky-700 md:flex-row md:items-center md:justify-between">
              <p>
                当前列表已按创作者筛选：
                <span className="font-semibold text-slate-950"> {scopedCreatorQuery}</span>.
                会同时匹配作品标题、ID 和创作者署名，方便集中补齐归属。
              </p>
              <button
                type="button"
                onClick={() => router.push("/admin/series")}
                className="inline-flex items-center justify-center rounded-full border border-[color:var(--gush-border)] bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)]"
              >
                清除创作者筛选
              </button>
            </div>
          ) : null}
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex flex-wrap gap-2">
              {TYPE_TABS.map((tab) => <button key={tab.value} type="button" onClick={() => setTypeFilter(tab.value)} className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${typeFilter === tab.value ? "border-[color:var(--gush-border-strong)] bg-[color:var(--gush-page-bg-muted)] text-slate-950" : "border-[color:var(--gush-border)] bg-white text-slate-600 hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)] hover:text-slate-950"}`}>{tab.label}</button>)}
            </div>

            <div className="flex flex-1 flex-col gap-3 xl:items-end">
              <div className="flex w-full flex-col gap-3 xl:max-w-3xl xl:flex-row xl:justify-end">
                <label className="flex min-w-[260px] flex-1 items-center gap-3 rounded-full border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-4 py-3">
                  <Search size={16} className="text-slate-400" />
                  <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="搜索作品标题、ID、创作者署名或草稿备注..." className="w-full bg-transparent text-sm text-slate-950 outline-none placeholder:text-slate-400" />
                </label>
                <div className="xl:shrink-0">
                  <AdvancedFilters filters={advancedFilters} onFiltersChange={setAdvancedFilters} />
                </div>
              </div>

              <div className="flex w-full flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-wrap gap-2">
                  {QUICK_FILTERS.map((filter) => (
                    <button
                      key={filter.value}
                      type="button"
                      onClick={() => setQuickFilter(filter.value)}
                      className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${quickFilter === filter.value ? "border-[color:var(--gush-border-strong)] bg-[color:var(--gush-page-bg-muted)] text-slate-950" : "border-[color:var(--gush-border)] bg-white text-slate-600 hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)] hover:text-slate-950"}`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                  <p className="mr-1 text-sm text-slate-600">
                    <span className="font-semibold text-slate-950">{filteredSeries.length}</span> 部作品
                  </p>
                  <Button type="button" variant="secondary" size="sm" onClick={handleToggleSelectAll} disabled={filteredSeries.length === 0}>
                    {allVisibleSelected ? "清空选择" : "全选"}
                  </Button>
                  <div className="flex items-center overflow-hidden rounded-full border border-[color:var(--gush-border)] bg-white">
                    <button type="button" onClick={() => setViewMode("grid")} className={`px-4 py-2.5 transition ${viewMode === "grid" ? "bg-slate-950 text-white" : "text-slate-500 hover:bg-[color:var(--gush-page-bg-muted)] hover:text-slate-950"}`} title="网格视图"><Grid size={16} /></button>
                    <button type="button" onClick={() => setViewMode("list")} className={`px-4 py-2.5 transition ${viewMode === "list" ? "bg-slate-950 text-white" : "text-slate-500 hover:bg-[color:var(--gush-page-bg-muted)] hover:text-slate-950"}`} title="列表视图"><List size={16} /></button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <BulkActionsToolbar selectedCount={selectedSeries.length} onPublish={handleBulkPublish} onUnpublish={handleBulkUnpublish} onDelete={handleBulkDelete} onCancel={() => setSelectedSeries([])} />

      {filteredSeries.length === 0 ? (
        <section className="rounded-[28px] border border-dashed border-[color:var(--gush-border)] bg-white/88 p-12 text-center shadow-[var(--gush-shadow-soft)]"><ImageIcon size={36} className="mx-auto text-slate-400" /><h3 className="mt-4 text-lg font-semibold text-slate-950">当前筛选下没有匹配作品</h3><p className="mt-2 text-sm text-slate-600">{searchQuery || typeFilter !== "all" || quickFilter !== "all" || advancedFilters.status !== "all" || advancedFilters.publishStatus !== "all" || advancedFilters.adultContent !== "all" ? "可以尝试放宽筛选条件或换个搜索词。" : "先从新增第一部作品开始建立目录。"}</p></section>
      ) : (
        <section className={viewMode === "grid" ? "grid gap-5 md:grid-cols-2 xl:grid-cols-3" : "space-y-4"}>
          {filteredSeries.map((series) => <SeriesCard key={series.id} series={series} viewMode={viewMode} isSelected={selectedSeries.includes(series.id)} isEditing={editingId === series.id} editDraft={editingId === series.id ? editingDraft : null} isSaving={isSavingEdit} onSelect={handleToggleSelection} onStartEdit={handleStartEdit} onEditDraftChange={setEditingDraft} onSaveEdit={() => handleSaveEdit(series.id)} onCancelEdit={handleCancelEdit} onOpenDetails={handleOpenDetails} onOpenEpisodes={handleOpenEpisodes} onOpenFrontend={handleOpenFrontend} onTogglePublish={handleTogglePublish} onDuplicate={handleOpenDuplicate} onDelete={handleDelete} />)}
        </section>
      )}

      <CreateSeriesModal
        isOpen={showCreateModal}
        createForm={createForm}
        setCreateForm={setCreateForm}
        closeCreateModal={closeCreateModal}
        isDragging={isDragging}
        setIsDragging={setIsDragging}
        handleCoverInput={handleCoverInput}
        suggestedSeriesId={suggestedSeriesId}
        handleCreate={handleCreate}
        isCreating={isCreating}
      />

      <DuplicateSeriesDialog
        duplicateDialog={duplicateDialog}
        setDuplicateDialog={setDuplicateDialog}
        handleDuplicate={handleDuplicate}
        isDuplicating={isDuplicating}
      />

      <ConfirmModal isOpen={confirmDialog.isOpen} onClose={() => setConfirmDialog((current) => ({ ...current, isOpen: false }))} onConfirm={confirmDialog.onConfirm} title={confirmDialog.title} message={confirmDialog.message} confirmText="确认" cancelText="取消" variant={confirmDialog.variant} />
    </div>
  );
}

