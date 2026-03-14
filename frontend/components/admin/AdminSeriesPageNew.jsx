"use client";

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus,
  Search,
  Grid,
  List,
  Edit,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Upload,
  X,
  BookOpen,
  ExternalLink,
  Image as ImageIcon,
} from "lucide-react";
import { useAdminAuth } from "./AuthContext";
import { adminDelete as apiDelete, adminGet as apiGet, adminPatch as apiPatch, adminPost as apiPost, adminUpload } from "../../lib/adminApiClient";
import { ConfirmModal } from "../common/Modal";
import { AdminFeedbackBanner } from "./common/AdminFeedbackBanner";
import BulkActionsToolbar from "./BulkActionsToolbar";
import AdvancedFilters from "./AdvancedFilters";

const TYPE_TABS = [
  { value: "all", label: "全部" },
  { value: "comic", label: "漫画" },
  { value: "novel", label: "小说" },
];
const STATUS_OPTIONS = ["Ongoing", "Completed", "Hiatus", "Cancelled"];
const DEFAULT_FILTERS = { status: "all", publishStatus: "all", adultContent: "all", sortBy: "createdAt_desc" };
const EMPTY_FEEDBACK = { type: "", message: "" };
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const QUICK_FILTERS = [
  { value: "all", label: "全部" },
  { value: "needsEpisodes", label: "待补章节" },
  { value: "noCover", label: "缺封面" },
  { value: "draft", label: "未发布" },
  { value: "adult", label: "18+" },
];
const CREATE_FLOW_OPTIONS = [
  { value: "stay", label: "留在列表", helper: "创建后继续批量整理作品库。" },
  { value: "details", label: "打开详情", helper: "继续补作品信息、封面与定价。" },
  { value: "episodes", label: "进入章节", helper: "直接去添加漫画章节或小说章节。" },
];

function createEmptyCreateForm() {
  return {
    title: "",
    type: "comic",
    status: "Ongoing",
    adult: false,
    description: "",
    genres: "",
    badge: "",
    episodePrice: "0",
    ttfEnabled: false,
    ttfIntervalHours: "24",
    isPublished: true,
    openAfterCreate: "episodes",
    coverFile: null,
    coverPreviewUrl: "",
  };
}
function revokeObjectUrl(url) {
  if (typeof url === "string" && url.startsWith("blob:")) URL.revokeObjectURL(url);
}
function slugifyTitle(title) {
  const slug = String(title || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
  return slug || "series";
}
function createSeriesId(title) {
  return `${slugifyTitle(title)}-${Math.random().toString(36).slice(2, 8)}`;
}
function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
function normalizeGenresInput(value) {
  return String(value || "")
    .split(",")
    .map((genre) => genre.trim())
    .filter(Boolean);
}
function normalizeSeries(entry, index) {
  const source = entry && typeof entry === "object" ? entry : {};
  return {
    id: String(source.id || `series-${index + 1}`),
    title: String(source.title || "未命名作品"),
    type: source.type === "novel" ? "novel" : "comic",
    status: STATUS_OPTIONS.includes(source.status) ? source.status : "Ongoing",
    adult: Boolean(source.adult),
    description: String(source.description || ""),
    coverUrl: String(source.coverUrl || source.coverImage || ""),
    coverTone: String(source.coverTone || ""),
    badge: String(source.badge || ""),
    genres: Array.isArray(source.genres) ? source.genres.filter(Boolean) : [],
    episodePrice: toNumber(source.episodePrice, 0),
    ttfEnabled: Boolean(source.ttfEnabled),
    ttfIntervalHours: toNumber(source.ttfIntervalHours, 24),
    latestEpisodeId: String(source.latestEpisodeId || ""),
    episodeCount: toNumber(source.episodeCount ?? source?._count?.episodes ?? source.totalEpisodes, 0),
    rating: toNumber(source.rating, 0),
    ratingCount: toNumber(source.ratingCount, 0),
    createdAt: source.createdAt || null,
    updatedAt: source.updatedAt || source.createdAt || null,
    isPublished: source.isPublished !== undefined ? Boolean(source.isPublished) : true,
    isFeatured: Boolean(source.isFeatured),
  };
}
function buildSeriesPayload(series, overrides = {}) {
  const merged = { ...series, ...overrides };
  return {
    id: merged.id,
    title: String(merged.title || "").trim(),
    type: merged.type === "novel" ? "novel" : "comic",
    status: STATUS_OPTIONS.includes(merged.status) ? merged.status : "Ongoing",
    adult: Boolean(merged.adult),
    description: String(merged.description || "").trim(),
    coverUrl: String(merged.coverUrl || "").trim(),
    coverTone: String(merged.coverTone || "").trim(),
    badge: String(merged.badge || "").trim(),
    genres: Array.isArray(merged.genres) ? merged.genres.filter(Boolean) : [],
    pricing: { episodePrice: toNumber(merged.episodePrice, 0) },
    ttf: { enabled: Boolean(merged.ttfEnabled), intervalHours: Math.max(1, toNumber(merged.ttfIntervalHours, 24)) },
    latestEpisodeId: String(merged.latestEpisodeId || ""),
    isPublished: Boolean(merged.isPublished),
    isFeatured: Boolean(merged.isFeatured),
    rating: toNumber(merged.rating, 0),
    ratingCount: toNumber(merged.ratingCount, 0),
  };
}
function formatUpdatedAt(value, compact = false) {
  if (!value) return "暂无";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "暂无";
  return new Intl.DateTimeFormat("zh-CN", compact ? { month: "short", day: "numeric" } : { month: "short", day: "numeric", year: "numeric" }).format(date);
}
function formatSeriesTypeLabel(type) {
  return type === "novel" ? "小说" : "漫画";
}
function formatSeriesStatusLabel(status) {
  if (status === "Completed") return "已完结";
  if (status === "Hiatus") return "暂停中";
  if (status === "Cancelled") return "已停更";
  return "连载中";
}
function buildQueryString(search, typeFilter, filters) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (typeFilter !== "all") params.set("type", typeFilter);
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.publishStatus !== "all") params.set("publishStatus", filters.publishStatus);
  if (filters.adultContent === "adult") params.set("adult", "true");
  if (filters.adultContent === "general") params.set("adult", "false");
  params.set("sortBy", filters.sortBy || DEFAULT_FILTERS.sortBy);
  params.set("page", "1");
  params.set("limit", "100");
  return params.toString();
}
function sortSeries(list, sortBy) {
  const items = [...list];
  const [field, direction] = String(sortBy || DEFAULT_FILTERS.sortBy).split("_");
  const sign = direction === "asc" ? 1 : -1;
  return items.sort((left, right) => {
    if (field === "title") return left.title.localeCompare(right.title) * sign;
    if (field === "updatedAt") return (new Date(left.updatedAt || 0).getTime() - new Date(right.updatedAt || 0).getTime()) * sign;
    if (field === "createdAt") return (new Date(left.createdAt || 0).getTime() - new Date(right.createdAt || 0).getTime()) * sign;
    if (field === "episodeCount") return (toNumber(left.episodeCount) - toNumber(right.episodeCount)) * sign;
    if (field === "rating") return (toNumber(left.rating) - toNumber(right.rating)) * sign;
    if (field === "ratingCount") return (toNumber(left.ratingCount) - toNumber(right.ratingCount)) * sign;
    return 0;
  });
}
function Feedback({ feedback, onDismiss }) {
  return feedback?.message ? <AdminFeedbackBanner feedback={feedback} onDismiss={onDismiss} /> : null;
}
function SeriesCard(props) {
  const {
    series,
    viewMode,
    isSelected,
    isEditing,
    editDraft,
    isSaving,
    onSelect,
    onStartEdit,
    onEditDraftChange,
    onSaveEdit,
    onCancelEdit,
    onOpenDetails,
    onOpenEpisodes,
    onOpenFrontend,
    onTogglePublish,
    onDuplicate,
    onDelete,
  } = props;
  const isList = viewMode === "list";
  return (
    <article className={`rounded-5xl border bg-neutral-900/60 p-4 shadow-ios transition ${isSelected ? "border-ios-blue/50 ring-1 ring-ios-blue/40" : "border-ios-gray-800"}`}>
      <div className={`grid gap-4 ${isList ? "lg:grid-cols-[auto,84px,1.6fr,1fr,auto] lg:items-center" : ""}`}>
        <label className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-ios-gray-900/70">
          <input type="checkbox" checked={isSelected} onChange={() => onSelect(series.id)} className="h-4 w-4 cursor-pointer rounded border-white/30 bg-transparent text-ios-blue" />
        </label>
        <div className={`${isList ? "h-24 w-16" : "aspect-[2/3] w-full"} overflow-hidden rounded-4xl bg-ios-gray-900`}>
          {series.coverUrl ? <img src={series.coverUrl} alt={`${series.title} cover`} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-ios-gray-500"><ImageIcon size={isList ? 24 : 40} /></div>}
        </div>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="rounded-full bg-ios-gray-800 px-2.5 py-1 text-ios-gray-200">{formatSeriesTypeLabel(series.type)}</span>
            <span className="rounded-full bg-ios-blue/10 px-2.5 py-1 text-ios-blue">{formatSeriesStatusLabel(series.status)}</span>
            {series.adult ? <span className="rounded-full bg-rose-500/15 px-2.5 py-1 text-rose-300">18+</span> : null}
            {!series.isPublished ? <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-amber-300">未发布</span> : null}
          </div>
          {isEditing ? (
            <div className="space-y-3 rounded-3xl border border-ios-gray-800 bg-ios-gray-950/60 p-4">
              <input value={editDraft?.title || ""} onChange={(event) => onEditDraftChange({ ...editDraft, title: event.target.value })} className="w-full rounded-2xl border border-ios-gray-700 bg-ios-gray-950 px-4 py-3 text-sm text-white outline-none focus:border-ios-blue" placeholder="作品标题" />
              <div className="grid gap-3 md:grid-cols-2">
                <select value={editDraft?.status || "Ongoing"} onChange={(event) => onEditDraftChange({ ...editDraft, status: event.target.value })} className="rounded-2xl border border-ios-gray-700 bg-ios-gray-950 px-4 py-3 text-sm text-white outline-none focus:border-ios-blue">
                  {STATUS_OPTIONS.map((option) => <option key={option} value={option}>{formatSeriesStatusLabel(option)}</option>)}
                </select>
                <label className="flex items-center gap-3 rounded-2xl border border-ios-gray-800 bg-ios-gray-950/40 px-4 py-3 text-sm text-ios-gray-200">
                  <input type="checkbox" checked={Boolean(editDraft?.adult)} onChange={(event) => onEditDraftChange({ ...editDraft, adult: event.target.checked })} className="h-4 w-4 rounded border-ios-gray-600 bg-ios-gray-900 text-ios-blue" />
                  <span>成人内容（18+）</span>
                </label>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <button type="button" onClick={() => onOpenDetails(series.id)} className="text-left text-lg font-semibold text-white transition hover:text-ios-blue">{series.title}</button>
              <p className="text-xs uppercase tracking-wide text-ios-gray-500">{series.id}</p>
              <p className="line-clamp-2 text-sm text-ios-gray-300">{series.description || "暂无简介。"}</p>
              <div className="flex flex-wrap gap-2 pt-2 text-[11px] font-medium">
                <span className="rounded-full bg-ios-gray-800/80 px-2.5 py-1 text-ios-gray-300">
                  {series.episodePrice > 0 ? `${series.episodePrice} 金币/章` : "免费章节"}
                </span>
                {!series.coverUrl ? (
                  <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-amber-300">缺少封面</span>
                ) : null}
                {series.episodeCount === 0 ? (
                  <span className="rounded-full bg-orange-500/15 px-2.5 py-1 text-orange-300">还没有章节</span>
                ) : null}
                {series.ttfEnabled ? (
                  <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-emerald-300">
                    免费券 {series.ttfIntervalHours}h
                  </span>
                ) : null}
                {series.genres.slice(0, 3).map((genre) => (
                  <span key={`${series.id}-${genre}`} className="rounded-full bg-ios-blue/10 px-2.5 py-1 text-ios-blue">
                    {genre}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 rounded-3xl bg-ios-gray-950/50 p-4 text-sm lg:grid-cols-2">
          <div><p className="text-ios-gray-500">章节数</p><p className="mt-1 font-semibold text-white">{series.episodeCount || 0}</p></div>
          <div><p className="text-ios-gray-500">更新时间</p><p className="mt-1 font-semibold text-white">{formatUpdatedAt(series.updatedAt, true)}</p></div>
          <div><p className="text-ios-gray-500">封面状态</p><p className="mt-1 font-semibold text-white">{series.coverUrl ? "已上传" : "待补充"}</p></div>
          <div><p className="text-ios-gray-500">发布状态</p><p className="mt-1 font-semibold text-white">{series.isPublished ? "已发布" : "草稿"}</p></div>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          {isEditing ? (
            <>
              <button type="button" onClick={onSaveEdit} disabled={isSaving} className="rounded-full bg-ios-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50">{isSaving ? "保存中..." : "保存"}</button>
              <button type="button" onClick={onCancelEdit} disabled={isSaving} className="rounded-full border border-ios-gray-700 px-4 py-2 text-sm font-semibold text-ios-gray-200 transition hover:bg-ios-gray-800 disabled:cursor-not-allowed disabled:opacity-50">取消</button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => onOpenEpisodes(series.id)} className="inline-flex items-center gap-2 rounded-full border border-ios-blue/30 px-3 py-2 text-xs font-semibold text-ios-blue transition hover:bg-ios-blue/10" title="管理章节">
                <BookOpen size={15} />
                <span>章节</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenFrontend(series.id)}
                disabled={!series.isPublished}
                className="inline-flex items-center gap-2 rounded-full border border-ios-gray-700 px-3 py-2 text-xs font-semibold text-ios-gray-200 transition hover:bg-ios-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                title={series.isPublished ? "查看前台页面" : "未发布作品不能预览"}
              >
                <ExternalLink size={15} />
                <span>前台</span>
              </button>
              <button type="button" onClick={() => onOpenDetails(series.id)} className="inline-flex items-center gap-2 rounded-full border border-ios-gray-700 px-3 py-2 text-xs font-semibold text-ios-gray-200 transition hover:bg-ios-gray-800" title="编辑详情">
                <Edit size={15} />
                <span>详情</span>
              </button>
              <button type="button" onClick={() => onStartEdit(series)} className="rounded-full border border-ios-gray-700 px-3 py-2 text-ios-gray-200 transition hover:bg-ios-gray-800" title="快速编辑"><Edit size={16} /></button>
              <button type="button" onClick={() => onTogglePublish(series)} className="rounded-full border border-ios-gray-700 px-3 py-2 text-ios-gray-200 transition hover:bg-ios-gray-800" title={series.isPublished ? "取消发布" : "立即发布"}>{series.isPublished ? <EyeOff size={16} /> : <Eye size={16} />}</button>
              <button type="button" onClick={() => onDuplicate(series)} className="rounded-full border border-ios-gray-700 px-3 py-2 text-ios-gray-200 transition hover:bg-ios-gray-800" title="复制作品"><Copy size={16} /></button>
              <button type="button" onClick={() => onDelete(series)} className="rounded-full border border-rose-500/30 px-3 py-2 text-rose-300 transition hover:bg-rose-500/10" title="删除作品"><Trash2 size={16} /></button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

export default function AdminSeriesPageNew() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading } = useAdminAuth();
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
  }, [searchParams]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push("/admin/login");
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => () => revokeObjectUrl(createForm.coverPreviewUrl), [createForm.coverPreviewUrl]);

  const loadSeries = useCallback(async () => {
    setLoading(true);
    const queryString = buildQueryString(debouncedSearchQuery, typeFilter, advancedFilters);
    const response = await apiGet(`/api/admin/series/search/advanced${queryString ? `?${queryString}` : ""}`);
    if (response.ok) {
      const nextSeries = Array.isArray(response.data?.series) ? response.data.series.filter(Boolean).map(normalizeSeries) : [];
      setSeriesList(nextSeries);
      setSelectedSeries((current) => current.filter((id) => nextSeries.some((series) => series.id === id)));
    } else {
      setSeriesList([]);
      setFeedback({ type: "error", message: response.error || "作品加载失败。" });
    }
    setLoading(false);
  }, [advancedFilters, debouncedSearchQuery, typeFilter]);

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
      const matchesSearch = !normalizedQuery || series.title.toLowerCase().includes(normalizedQuery) || series.id.toLowerCase().includes(normalizedQuery);
      const matchesPublish = advancedFilters.publishStatus === "all" || (advancedFilters.publishStatus === "published" && series.isPublished) || (advancedFilters.publishStatus === "unpublished" && !series.isPublished);
      const matchesQuick =
        quickFilter === "all" ||
        (quickFilter === "needsEpisodes" && series.episodeCount === 0) ||
        (quickFilter === "noCover" && !series.coverUrl) ||
        (quickFilter === "draft" && !series.isPublished) ||
        (quickFilter === "adult" && series.adult);
      return matchesSearch && matchesPublish && matchesQuick;
    });
    return sortSeries(items, advancedFilters.sortBy);
  }, [advancedFilters.publishStatus, advancedFilters.sortBy, quickFilter, searchQuery, seriesList]);

  const seriesStats = useMemo(() => {
    const total = seriesList.length;
    const comics = seriesList.filter((item) => item.type === "comic").length;
    const novels = seriesList.filter((item) => item.type === "novel").length;
    const drafts = seriesList.filter((item) => !item.isPublished).length;
    const noEpisodes = seriesList.filter((item) => item.episodeCount === 0).length;
    const noCover = seriesList.filter((item) => !item.coverUrl).length;

    return [
      { label: "全部作品", value: total, hint: "当前作品库总量" },
      { label: "漫画作品", value: comics, hint: `小说 ${novels} 部` },
      { label: "待补章节", value: noEpisodes, hint: "适合优先处理新作" },
      { label: "待补封面", value: noCover, hint: `草稿 ${drafts} 部` },
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
      setFeedback({ type: "error", message: "标题不能为空。" });
      return;
    }
    const target = seriesList.find((series) => series.id === seriesId);
    if (!target) return;
    setIsSavingEdit(true);
    const response = await apiPatch(`/api/admin/series/${seriesId}`, { series: buildSeriesPayload(target, { title: editingDraft.title.trim(), status: editingDraft.status, adult: editingDraft.adult }) });
    if (response.ok) {
      updateSeriesLocally(seriesId, (current) => ({ ...current, title: editingDraft.title.trim(), status: editingDraft.status, adult: editingDraft.adult, updatedAt: new Date().toISOString() }));
      setFeedback({ type: "success", message: "作品已更新。" });
      handleCancelEdit();
    } else {
      setFeedback({ type: "error", message: response.error || "保存更改失败。" });
    }
    setIsSavingEdit(false);
  };

  const handleTogglePublish = async (series) => {
    const nextPublished = !series.isPublished;
    const response = await apiPatch(`/api/admin/series/${series.id}`, { series: buildSeriesPayload(series, { isPublished: nextPublished }) });
    if (response.ok) {
      updateSeriesLocally(series.id, (current) => ({ ...current, isPublished: nextPublished, updatedAt: new Date().toISOString() }));
      setFeedback({ type: "success", message: nextPublished ? "作品已发布。" : "作品已取消发布。" });
    } else {
      setFeedback({ type: "error", message: response.error || "更新发布状态失败。" });
    }
  };

  const uploadCoverImage = async (file) => {
    if (!file) return "";
    if (!file.type.startsWith("image/")) throw new Error("请上传有效的图片文件。");
    if (file.size > MAX_UPLOAD_BYTES) throw new Error("封面图片大小不能超过 10MB。");
    const formData = new FormData();
    formData.append("file", file);
    const response = await adminUpload("/api/admin/upload/image", formData);
    if (!response.ok || !response.data?.url) throw new Error(response.error || "上传封面失败。");
    return response.data.url;
  };

  const handleCreate = async () => {
    if (!createForm.title.trim()) {
      setFeedback({ type: "error", message: "标题不能为空。" });
      return;
    }
    if (!/^\d+$/.test(String(createForm.episodePrice || "0"))) {
      setFeedback({ type: "error", message: "默认章节价格必须是非负整数。" });
      return;
    }
    if (createForm.ttfEnabled && (!/^\d+$/.test(String(createForm.ttfIntervalHours || "")) || toNumber(createForm.ttfIntervalHours, 0) < 1)) {
      setFeedback({ type: "error", message: "免费券刷新间隔至少为 1 小时。" });
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
          type: createForm.type,
          adult: createForm.adult,
          coverUrl,
          description: createForm.description,
          genres: normalizeGenresInput(createForm.genres),
          status: createForm.status,
          badge: createForm.badge,
          episodePrice: toNumber(createForm.episodePrice, 0),
          ttfEnabled: createForm.ttfEnabled,
          ttfIntervalHours: Math.max(1, toNumber(createForm.ttfIntervalHours, 24)),
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
              ? "作品已创建，正在打开详情页。"
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
    message: `确定删除 ${series.title} 吗？此操作无法撤销。`,
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
      setFeedback({ type: "error", message: "必须填写新的作品 ID。" });
      return;
    }
    setIsDuplicating(true);
    const response = await apiPost("/api/admin/series", { series: buildSeriesPayload(source, { id: nextId, title: `${source.title} (Copy)` }) });
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
    setFeedback({ type: "success", message: nextPublished ? "已发布所选作品。" : "已取消发布所选作品。" });
  };

  const handleBulkPublish = async () => updatePublishStateForSelection(true);
  const handleBulkUnpublish = async () => updatePublishStateForSelection(false);
  const handleBulkDelete = async () => setConfirmDialog({
    isOpen: true,
    title: "删除所选作品",
    message: `确定删除 ${selectedSeries.length} 个所选作品吗？此操作无法撤销。`,
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

  if (isLoading || loading) return <section className="rounded-5xl border border-ios-gray-800 bg-neutral-900/60 p-8 text-sm text-ios-gray-300">作品加载中...</section>;
  if (!isAuthenticated) return <section className="rounded-5xl border border-dashed border-ios-gray-700 bg-neutral-900/60 p-10 text-center text-sm text-ios-gray-300">需要后台权限才能访问此页面。</section>;

  return (
    <div className="space-y-6">
      <section className="rounded-5xl border border-ios-gray-800 bg-gradient-to-br from-ios-blue/10 to-ios-purple/10 p-6 shadow-ios">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">作品管理</h2>
            <p className="text-sm text-ios-gray-300">把漫画、小说、章节准备度和发布状态放在同一块后台里处理，减少来回跳页。</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                setCreateForm({
                  ...createEmptyCreateForm(),
                  type: "comic",
                  openAfterCreate: "episodes",
                });
                setShowCreateModal(true);
              }}
              className="inline-flex items-center gap-2 rounded-full border border-ios-blue/30 bg-ios-blue/10 px-4 py-2.5 text-sm font-semibold text-ios-blue transition hover:bg-ios-blue/20"
            >
              <BookOpen size={16} />
              <span>新建漫画并进章节</span>
            </button>
            <button type="button" onClick={() => { setCreateForm(createEmptyCreateForm()); setShowCreateModal(true); }} className="inline-flex items-center gap-2 rounded-full bg-ios-blue px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"><Plus size={16} /><span>新增作品</span></button>
          </div>
        </div>
      </section>

      <Feedback feedback={feedback} onDismiss={dismissFeedback} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {seriesStats.map((item) => (
          <article key={item.label} className="rounded-4xl border border-ios-gray-800 bg-neutral-900/60 p-5 shadow-ios">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ios-gray-500">{item.label}</p>
            <p className="mt-3 text-3xl font-bold text-white">{item.value}</p>
            <p className="mt-2 text-sm text-ios-gray-400">{item.hint}</p>
          </article>
        ))}
      </section>

      <section className="rounded-5xl border border-ios-gray-800 bg-neutral-900/60 p-5 shadow-ios">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
              {TYPE_TABS.map((tab) => <button key={tab.value} type="button" onClick={() => setTypeFilter(tab.value)} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${typeFilter === tab.value ? "bg-ios-blue text-white" : "bg-ios-gray-900 text-ios-gray-300 hover:bg-ios-gray-800"}`}>{tab.label}</button>)}
            </div>
            <div className="flex flex-1 flex-wrap items-center gap-2 xl:justify-end">
              <label className="flex min-w-[260px] flex-1 items-center gap-3 rounded-full border border-ios-gray-800 bg-ios-gray-950/80 px-4 py-3 xl:max-w-md"><Search size={16} className="text-ios-gray-500" /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="搜索作品标题、ID、发布草稿..." className="w-full bg-transparent text-sm text-white outline-none placeholder:text-ios-gray-500" /></label>
              <AdvancedFilters filters={advancedFilters} onFiltersChange={setAdvancedFilters} />
              <button type="button" onClick={handleToggleSelectAll} disabled={filteredSeries.length === 0} className="rounded-full border border-ios-gray-800 bg-ios-gray-950/80 px-4 py-3 text-sm font-semibold text-ios-gray-200 transition hover:bg-ios-gray-900 disabled:cursor-not-allowed disabled:opacity-50">{allVisibleSelected ? "清空选择" : "全选"}</button>
              <div className="flex items-center overflow-hidden rounded-full border border-ios-gray-800 bg-ios-gray-950/80">
                <button type="button" onClick={() => setViewMode("grid")} className={`px-4 py-3 transition ${viewMode === "grid" ? "bg-ios-blue text-white" : "text-ios-gray-300 hover:bg-ios-gray-900"}`} title="网格视图"><Grid size={16} /></button>
                <button type="button" onClick={() => setViewMode("list")} className={`px-4 py-3 transition ${viewMode === "list" ? "bg-ios-blue text-white" : "text-ios-gray-300 hover:bg-ios-gray-900"}`} title="列表视图"><List size={16} /></button>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
              {QUICK_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setQuickFilter(filter.value)}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition ${quickFilter === filter.value ? "bg-white text-neutral-950" : "bg-ios-gray-950/80 text-ios-gray-300 hover:bg-ios-gray-900"}`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <p className="text-sm text-ios-gray-400">
              当前结果 <span className="font-semibold text-white">{filteredSeries.length}</span> 部
            </p>
          </div>
        </div>
      </section>

      <BulkActionsToolbar selectedCount={selectedSeries.length} onPublish={handleBulkPublish} onUnpublish={handleBulkUnpublish} onDelete={handleBulkDelete} onCancel={() => setSelectedSeries([])} />

      {filteredSeries.length === 0 ? (
        <section className="rounded-5xl border border-dashed border-ios-gray-700 bg-neutral-900/60 p-12 text-center"><ImageIcon size={36} className="mx-auto text-ios-gray-500" /><h3 className="mt-4 text-lg font-semibold text-white">未找到作品</h3><p className="mt-2 text-sm text-ios-gray-400">{searchQuery || typeFilter !== "all" || quickFilter !== "all" || advancedFilters.status !== "all" || advancedFilters.publishStatus !== "all" || advancedFilters.adultContent !== "all" ? "请尝试调整筛选条件或搜索关键词。" : "可以先通过上方按钮创建第一部作品。"}</p></section>
      ) : (
        <section className={viewMode === "grid" ? "grid gap-5 md:grid-cols-2 xl:grid-cols-3" : "space-y-4"}>
          {filteredSeries.map((series) => <SeriesCard key={series.id} series={series} viewMode={viewMode} isSelected={selectedSeries.includes(series.id)} isEditing={editingId === series.id} editDraft={editingId === series.id ? editingDraft : null} isSaving={isSavingEdit} onSelect={handleToggleSelection} onStartEdit={handleStartEdit} onEditDraftChange={setEditingDraft} onSaveEdit={() => handleSaveEdit(series.id)} onCancelEdit={handleCancelEdit} onOpenDetails={handleOpenDetails} onOpenEpisodes={handleOpenEpisodes} onOpenFrontend={handleOpenFrontend} onTogglePublish={handleTogglePublish} onDuplicate={handleOpenDuplicate} onDelete={handleDelete} />)}
        </section>
      )}

      {showCreateModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={closeCreateModal}>
          <div className="w-full max-w-2xl rounded-5xl border border-ios-gray-800 bg-neutral-900 p-6 shadow-ios-xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-white">新增作品</h3>
                <p className="mt-1 text-sm text-ios-gray-400">创建新的作品条目，并可选上传封面。</p>
              </div>
              <button type="button" onClick={closeCreateModal} className="rounded-full border border-ios-gray-700 p-2 text-ios-gray-300 transition hover:bg-ios-gray-800"><X size={18} /></button>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr,1.1fr]">
              <div>
                <label className="mb-2 block text-sm font-semibold text-ios-gray-300">封面图片</label>
                <div onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={(event) => { event.preventDefault(); setIsDragging(false); handleCoverInput(event.dataTransfer.files?.[0]); }} className={`rounded-5xl border border-dashed p-4 transition ${isDragging ? "border-ios-blue bg-ios-blue/10" : "border-ios-gray-700 bg-ios-gray-950/40"}`}>
                  {createForm.coverPreviewUrl ? (
                    <div className="space-y-3">
                      <img src={createForm.coverPreviewUrl} alt="封面预览" className="aspect-[2/3] w-full rounded-4xl object-cover" />
                      <button type="button" onClick={() => setCreateForm((current) => { revokeObjectUrl(current.coverPreviewUrl); return { ...current, coverFile: null, coverPreviewUrl: "" }; })} className="w-full rounded-full border border-ios-gray-700 px-4 py-2 text-sm font-semibold text-ios-gray-200 transition hover:bg-ios-gray-800">移除封面</button>
                    </div>
                  ) : (
                    <label className="flex min-h-[320px] cursor-pointer flex-col items-center justify-center gap-3 rounded-4xl border border-ios-gray-800 bg-ios-gray-950/70 px-6 text-center text-ios-gray-400">
                      <Upload size={28} className="text-ios-blue" />
                      <div><p className="text-sm font-semibold text-white">拖拽图片到这里，或点击上传</p><p className="mt-1 text-xs text-ios-gray-500">支持 JPG、PNG 和 GIF，最大 10MB。</p></div>
                      <input type="file" accept="image/*" className="hidden" onChange={(event) => handleCoverInput(event.target.files?.[0])} />
                    </label>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-ios-gray-300">作品标题 *</span>
                  <input value={createForm.title} onChange={(event) => setCreateForm((current) => ({ ...current, title: event.target.value }))} placeholder="例如：午夜契约" className="w-full rounded-3xl border border-ios-gray-700 bg-ios-gray-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-ios-blue" />
                  <span className="text-xs text-ios-gray-500">预计作品 ID：{suggestedSeriesId}</span>
                </label>

                <div className="space-y-2">
                  <span className="text-sm font-semibold text-ios-gray-300">作品类型</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setCreateForm((current) => ({ ...current, type: "comic" }))} className={`rounded-3xl px-4 py-3 text-sm font-semibold transition ${createForm.type === "comic" ? "bg-ios-blue text-white" : "bg-ios-gray-950/70 text-ios-gray-300 hover:bg-ios-gray-900"}`}>漫画</button>
                    <button type="button" onClick={() => setCreateForm((current) => ({ ...current, type: "novel" }))} className={`rounded-3xl px-4 py-3 text-sm font-semibold transition ${createForm.type === "novel" ? "bg-ios-purple text-white" : "bg-ios-gray-950/70 text-ios-gray-300 hover:bg-ios-gray-900"}`}>小说</button>
                  </div>
                </div>

                <label className="flex items-center gap-3 rounded-3xl border border-ios-gray-800 bg-ios-gray-950/40 px-4 py-3 text-sm text-ios-gray-200">
                  <input type="checkbox" checked={createForm.adult} onChange={(event) => setCreateForm((current) => ({ ...current, adult: event.target.checked }))} className="h-4 w-4 rounded border-ios-gray-600 bg-ios-gray-900 text-ios-blue" />
                  <span>成人内容（18+）</span>
                </label>

                <label className="flex items-center gap-3 rounded-3xl border border-ios-gray-800 bg-ios-gray-950/40 px-4 py-3 text-sm text-ios-gray-200">
                  <input type="checkbox" checked={createForm.isPublished} onChange={(event) => setCreateForm((current) => ({ ...current, isPublished: event.target.checked }))} className="h-4 w-4 rounded border-ios-gray-600 bg-ios-gray-900 text-ios-blue" />
                  <span>创建后立即发布</span>
                </label>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="block space-y-2">
                    <span className="text-sm font-semibold text-ios-gray-300">作品状态</span>
                    <select value={createForm.status} onChange={(event) => setCreateForm((current) => ({ ...current, status: event.target.value }))} className="w-full rounded-3xl border border-ios-gray-700 bg-ios-gray-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-ios-blue">
                      {STATUS_OPTIONS.map((option) => <option key={option} value={option}>{formatSeriesStatusLabel(option)}</option>)}
                    </select>
                  </label>
                  <label className="block space-y-2">
                    <span className="text-sm font-semibold text-ios-gray-300">角标</span>
                    <input value={createForm.badge} onChange={(event) => setCreateForm((current) => ({ ...current, badge: event.target.value }))} placeholder="例如：HOT" className="w-full rounded-3xl border border-ios-gray-700 bg-ios-gray-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-ios-blue" />
                  </label>
                </div>

                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-ios-gray-300">作品简介</span>
                  <textarea value={createForm.description} onChange={(event) => setCreateForm((current) => ({ ...current, description: event.target.value }))} placeholder="填写后台简介，创建后可以继续在详情页完善。" rows={4} className="w-full rounded-3xl border border-ios-gray-700 bg-ios-gray-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-ios-blue" />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-ios-gray-300">分类标签</span>
                  <input value={createForm.genres} onChange={(event) => setCreateForm((current) => ({ ...current, genres: event.target.value }))} placeholder="动作, 恋爱, 奇幻" className="w-full rounded-3xl border border-ios-gray-700 bg-ios-gray-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-ios-blue" />
                </label>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="block space-y-2">
                    <span className="text-sm font-semibold text-ios-gray-300">默认章节价格</span>
                    <input value={createForm.episodePrice} onChange={(event) => setCreateForm((current) => ({ ...current, episodePrice: event.target.value }))} inputMode="numeric" placeholder="0" className="w-full rounded-3xl border border-ios-gray-700 bg-ios-gray-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-ios-blue" />
                  </label>
                  <label className="flex items-center gap-3 rounded-3xl border border-ios-gray-800 bg-ios-gray-950/40 px-4 py-3 text-sm text-ios-gray-200">
                    <input type="checkbox" checked={createForm.ttfEnabled} onChange={(event) => setCreateForm((current) => ({ ...current, ttfEnabled: event.target.checked }))} className="h-4 w-4 rounded border-ios-gray-600 bg-ios-gray-900 text-ios-blue" />
                    <span>开启免费券</span>
                  </label>
                </div>

                {createForm.ttfEnabled ? (
                  <label className="block space-y-2">
                    <span className="text-sm font-semibold text-ios-gray-300">免费券刷新间隔（小时）</span>
                    <input value={createForm.ttfIntervalHours} onChange={(event) => setCreateForm((current) => ({ ...current, ttfIntervalHours: event.target.value }))} inputMode="numeric" placeholder="24" className="w-full rounded-3xl border border-ios-gray-700 bg-ios-gray-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-ios-blue" />
                  </label>
                ) : null}

                <div className="space-y-2">
                  <span className="text-sm font-semibold text-ios-gray-300">创建后继续</span>
                  <div className="grid gap-2">
                    {CREATE_FLOW_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setCreateForm((current) => ({ ...current, openAfterCreate: option.value }))}
                        className={`rounded-3xl border px-4 py-3 text-left transition ${createForm.openAfterCreate === option.value ? "border-ios-blue bg-ios-blue/10 text-white" : "border-ios-gray-800 bg-ios-gray-950/40 text-ios-gray-300 hover:bg-ios-gray-900"}`}
                      >
                        <p className="text-sm font-semibold">{option.label}</p>
                        <p className="mt-1 text-xs text-ios-gray-500">{option.helper}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={closeCreateModal} className="flex-1 rounded-full border border-ios-gray-700 px-4 py-3 text-sm font-semibold text-ios-gray-200 transition hover:bg-ios-gray-800">取消</button>
                  <button type="button" onClick={handleCreate} disabled={isCreating} className="flex-1 rounded-full bg-ios-blue px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50">{isCreating ? "创建中..." : "创建"}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {duplicateDialog.isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setDuplicateDialog({ isOpen: false, series: null, newId: "" })}>
          <div className="w-full max-w-lg rounded-5xl border border-ios-gray-800 bg-neutral-900 p-6 shadow-ios-xl" onClick={(event) => event.stopPropagation()}>
            <h3 className="text-xl font-bold text-white">复制作品</h3>
            <p className="mt-1 text-sm text-ios-gray-400">基于当前作品创建一个新的副本。</p>
            <label className="mt-5 block space-y-2">
              <span className="text-sm font-semibold text-ios-gray-300">新的作品 ID *</span>
              <input value={duplicateDialog.newId} onChange={(event) => setDuplicateDialog((current) => ({ ...current, newId: event.target.value }))} placeholder="请输入新的作品 ID" className="w-full rounded-3xl border border-ios-gray-700 bg-ios-gray-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-ios-blue" />
            </label>
            <div className="mt-6 flex gap-3">
              <button type="button" onClick={() => setDuplicateDialog({ isOpen: false, series: null, newId: "" })} className="flex-1 rounded-full border border-ios-gray-700 px-4 py-3 text-sm font-semibold text-ios-gray-200 transition hover:bg-ios-gray-800">取消</button>
              <button type="button" onClick={handleDuplicate} disabled={isDuplicating} className="flex-1 rounded-full bg-ios-blue px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50">{isDuplicating ? "复制中..." : "复制"}</button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmModal isOpen={confirmDialog.isOpen} onClose={() => setConfirmDialog((current) => ({ ...current, isOpen: false }))} onConfirm={confirmDialog.onConfirm} title={confirmDialog.title} message={confirmDialog.message} confirmText="确认" cancelText="取消" variant={confirmDialog.variant} />
    </div>
  );
}
