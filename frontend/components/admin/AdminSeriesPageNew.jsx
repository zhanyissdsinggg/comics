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
import { Button } from "@/components/ui/button";
import { useAdminAuth } from "./AuthContext";
import { adminDelete as apiDelete, adminGet as apiGet, adminPatch as apiPatch, adminPost as apiPost, adminUpload } from "../../lib/adminApiClient";
import { ConfirmModal } from "../common/Modal";
import { AdminFeedbackBanner } from "./common/AdminFeedbackBanner";
import BulkActionsToolbar from "./BulkActionsToolbar";
import AdvancedFilters from "./AdvancedFilters";
import { getAdminSeriesReadiness } from "../../lib/adminSeriesReadiness";
import { resolveSeriesCreatorIdentity } from "../../lib/creatorIdentity";

const TYPE_TABS = [
  { value: "all", label: "全部形式" },
  { value: "comic", label: "漫画" },
  { value: "novel", label: "小说" },
];
const STATUS_OPTIONS = ["Ongoing", "Completed", "Hiatus", "Cancelled"];
const DEFAULT_FILTERS = { status: "all", publishStatus: "all", adultContent: "all", sortBy: "createdAt_desc" };
const EMPTY_FEEDBACK = { type: "", message: "" };
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const QUICK_FILTERS = [
  { value: "all", label: "全部作品" },
  { value: "needsMetadata", label: "待补基础信息" },
  { value: "noAuthor", label: "缺少创作者署名" },
  { value: "needsEpisodes", label: "还没有章节" },
  { value: "noCover", label: "缺少封面" },
  { value: "draft", label: "仅看草稿" },
  { value: "adult", label: "18+" },
];
const CREATE_FLOW_OPTIONS = [
  { value: "stay", label: "留在当前页", helper: "继续在作品列表里处理下一部作品。" },
  { value: "details", label: "打开详情页", helper: "继续补充作品信息、封面和署名。" },
  { value: "episodes", label: "前往章节管理", helper: "下一步直接开始添加漫画章节或小说内容。" },
];

function createEmptyCreateForm() {
  return {
    title: "",
    author: "",
    type: "comic",
    status: "Ongoing",
    adult: false,
    description: "",
    genres: "",
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
  const creatorIdentity = resolveSeriesCreatorIdentity(source);
  return {
    id: String(source.id || `series-${index + 1}`),
    title: String(source.title || "未命名作品"),
    author: String(source.author || ""),
    creatorLabel: creatorIdentity.hasPublicCredit ? creatorIdentity.displayName : "",
    creatorHref: creatorIdentity.hasPublicCredit ? creatorIdentity.href : "",
    hasPublicCreator: creatorIdentity.hasPublicCredit,
    type: source.type === "novel" ? "novel" : "comic",
    status: STATUS_OPTIONS.includes(source.status) ? source.status : "Ongoing",
    adult: Boolean(source.adult),
    description: String(source.description || ""),
    coverUrl: String(source.coverUrl || source.coverImage || ""),
    coverTone: String(source.coverTone || ""),
    genres: Array.isArray(source.genres) ? source.genres.filter(Boolean) : [],
    latestEpisodeId: String(source.latestEpisodeId || ""),
    episodeCount: toNumber(source.episodeCount ?? source?._count?.episodes ?? source.totalEpisodes, 0),
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
    author: String(merged.author || "").trim(),
    type: merged.type === "novel" ? "novel" : "comic",
    status: STATUS_OPTIONS.includes(merged.status) ? merged.status : "Ongoing",
    adult: Boolean(merged.adult),
    description: String(merged.description || "").trim(),
    coverUrl: String(merged.coverUrl || "").trim(),
    coverTone: String(merged.coverTone || "").trim(),
    genres: Array.isArray(merged.genres) ? merged.genres.filter(Boolean) : [],
    latestEpisodeId: String(merged.latestEpisodeId || ""),
    isPublished: Boolean(merged.isPublished),
    isFeatured: Boolean(merged.isFeatured),
  };
}
function formatUpdatedAt(value, compact = false) {
  if (!value) return "尚未更新";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "尚未更新";
  return new Intl.DateTimeFormat("zh-CN", compact ? { month: "short", day: "numeric" } : { month: "short", day: "numeric", year: "numeric" }).format(date);
}
function formatSeriesTypeLabel(type) {
  return type === "novel" ? "小说" : "漫画";
}
function formatSeriesStatusLabel(status) {
  if (status === "Completed") return "已完结";
  if (status === "Hiatus") return "休更中";
  if (status === "Cancelled") return "已下线";
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
    return 0;
  });
}
function extractSeriesCollection(payload) {
  if (Array.isArray(payload?.series)) {
    return payload.series;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  return [];
}
function Feedback({ feedback, onDismiss }) {
  return feedback?.message ? <AdminFeedbackBanner feedback={feedback} onDismiss={onDismiss} /> : null;
}

function getReadinessToneClasses(tone) {
  if (tone === "emerald") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (tone === "cyan") {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }

  if (tone === "amber") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-rose-200 bg-rose-50 text-rose-700";
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
  const readiness = getAdminSeriesReadiness(series);
  const creatorLine = series.creatorLabel || "创作者信息待补充";
  return (
    <article
      className={`rounded-[28px] border bg-white/92 p-4 shadow-[var(--gush-shadow-soft)] transition ${
        isSelected ? "border-[color:var(--gush-border-strong)] ring-1 ring-slate-200/70" : "border-[color:var(--gush-border)]"
      }`}
    >
      <div className={`grid gap-4 ${isList ? "lg:grid-cols-[auto,84px,1.6fr,1fr,auto] lg:items-center" : ""}`}>
        <label className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-[color:var(--gush-page-bg-muted)]">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect(series.id)}
            className="h-4 w-4 cursor-pointer rounded border-black/20 bg-transparent text-slate-950"
          />
        </label>
        <div
          className={`${isList ? "h-24 w-16" : "aspect-[2/3] w-full"} overflow-hidden rounded-[24px] bg-[color:var(--gush-page-bg-muted)]`}
        >
          {series.coverUrl ? (
            <img src={series.coverUrl} alt={`${series.title}封面`} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-slate-400">
              <ImageIcon size={isList ? 24 : 40} />
            </div>
          )}
        </div>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="rounded-full border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-2.5 py-1 text-slate-700">
              {formatSeriesTypeLabel(series.type)}
            </span>
            <span className="rounded-full border border-[color:var(--gush-border-strong)] bg-[color:var(--gush-page-bg-muted)] px-2.5 py-1 text-slate-950">
              {formatSeriesStatusLabel(series.status)}
            </span>
            <span className={`rounded-full border px-2.5 py-1 ${getReadinessToneClasses(readiness.tone)}`}>
              {readiness.statusLabel}
            </span>
            {series.adult ? (
              <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-rose-700">
                18+
              </span>
            ) : null}
            {!series.isPublished ? (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-700">
                草稿
              </span>
            ) : null}
          </div>
          {isEditing ? (
            <div className="space-y-3 rounded-[24px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] p-4">
              <input
                value={editDraft?.title || ""}
                onChange={(event) => onEditDraftChange({ ...editDraft, title: event.target.value })}
                className="w-full rounded-[18px] border border-[color:var(--gush-border)] bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-[var(--gush-accent,#2f58c6)]"
                placeholder="作品标题"
              />
              <div className="grid gap-3 md:grid-cols-2">
                <select
                  value={editDraft?.status || "Ongoing"}
                  onChange={(event) => onEditDraftChange({ ...editDraft, status: event.target.value })}
                  className="rounded-[18px] border border-[color:var(--gush-border)] bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-[var(--gush-accent,#2f58c6)]"
                >
                  {STATUS_OPTIONS.map((option) => <option key={option} value={option}>{formatSeriesStatusLabel(option)}</option>)}
                </select>
                <label className="flex items-center gap-3 rounded-[18px] border border-[color:var(--gush-border)] bg-white px-4 py-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={Boolean(editDraft?.adult)}
                    onChange={(event) => onEditDraftChange({ ...editDraft, adult: event.target.checked })}
                    className="h-4 w-4 rounded border-black/20 bg-white text-slate-950"
                  />
                  <span>18+ 作品</span>
                </label>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => onOpenDetails(series.id)}
                className="text-left text-lg font-semibold text-slate-950 transition hover:text-slate-700"
              >
                {series.title}
              </button>
              <p className="text-xs uppercase tracking-wide text-slate-400">{series.id}</p>
              <p className="text-sm text-slate-600">
                创作者：{" "}
                <span
                  className={
                    series.creatorLabel ? "font-medium text-slate-950" : "text-amber-700"
                  }
                >
                  {creatorLine}
                </span>
              </p>
              <p className="line-clamp-2 text-sm text-slate-600">
                {series.description || "作品简介待补充。"}
              </p>
              <p className="text-xs text-slate-500">
                前台就绪度 {readiness.score}
                {readiness.missingCount > 0
                  ? ` · 优先补齐 ${readiness.topIssues.join("、")}`
                  : " · 已可进入前台发现流"}
              </p>
              <div className="flex flex-wrap gap-2 pt-2 text-[11px] font-medium">
                <span className="rounded-full border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-2.5 py-1 text-slate-600">
                  {series.episodeCount > 0 ? `${series.episodeCount} 章` : "还没有章节"}
                </span>
                {!series.creatorLabel ? (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-700">
                    缺少创作者署名
                  </span>
                ) : null}
                {!series.coverUrl ? (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-700">
                    缺少封面
                  </span>
                ) : null}
                {!series.description?.trim() ? (
                  <span className="rounded-full border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-2.5 py-1 text-slate-600">
                    仍需补简介
                  </span>
                ) : null}
                {!series.genres.length ? (
                  <span className="rounded-full border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-2.5 py-1 text-slate-600">
                    仍需补标签
                  </span>
                ) : null}
                {series.episodeCount === 0 ? (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-700">
                    还没有章节
                  </span>
                ) : null}
                {series.genres.slice(0, 3).map((genre) => (
                  <span
                    key={`${series.id}-${genre}`}
                    className="rounded-full border border-[color:var(--gush-border-strong)] bg-[color:var(--gush-page-bg-muted)] px-2.5 py-1 text-slate-950"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 rounded-[24px] bg-[color:var(--gush-page-bg-muted)] p-4 text-sm lg:grid-cols-2">
          <div><p className="text-slate-500">章节数</p><p className="mt-1 font-semibold text-slate-950">{series.episodeCount || 0}</p></div>
          <div><p className="text-slate-500">最近更新</p><p className="mt-1 font-semibold text-slate-950">{formatUpdatedAt(series.updatedAt, true)}</p></div>
          <div><p className="text-slate-500">封面</p><p className="mt-1 font-semibold text-slate-950">{series.coverUrl ? "已补齐" : "待补充"}</p></div>
          <div><p className="text-slate-500">发布状态</p><p className="mt-1 font-semibold text-slate-950">{series.isPublished ? "已发布" : "草稿"}</p></div>
        </div>
        <div className="flex flex-col gap-3 lg:items-end">
          {isEditing ? (
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <Button type="button" variant="secondary" size="sm" onClick={onCancelEdit} disabled={isSaving}>
                取消
              </Button>
              <Button type="button" size="sm" onClick={onSaveEdit} disabled={isSaving}>
                {isSaving ? "保存中..." : "保存"}
              </Button>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2 lg:justify-end">
                <Button type="button" size="sm" onClick={() => onOpenDetails(series.id)} title="编辑详情">
                  <Edit className="size-4" />
                  详情
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => onOpenEpisodes(series.id)} title="管理章节">
                  <BookOpen className="size-4" />
                  章节
                </Button>
              </div>

              <div className="flex flex-wrap gap-2 lg:justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => onOpenFrontend(series.id)}
                  disabled={!series.isPublished}
                  title={series.isPublished ? "查看前台作品页" : "草稿状态不能直接打开前台页"}
                >
                  <ExternalLink className="size-4" />
                  前台页
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => onStartEdit(series)} title="快速编辑">
                  <Edit className="size-4" />
                  快速编辑
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => onTogglePublish(series)} title={series.isPublished ? "转为草稿" : "立即发布"}>
                  {series.isPublished ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  {series.isPublished ? "转为草稿" : "立即发布"}
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => onDuplicate(series)} title="复制作品">
                  <Copy className="size-4" />
                  复制
                </Button>
              </div>

              <div className="flex flex-wrap gap-2 lg:justify-end">
                <Button type="button" variant="destructive" size="sm" onClick={() => onDelete(series)} title="删除作品">
                  <Trash2 className="size-4" />
                  删除
                </Button>
              </div>
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

      {showCreateModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(20,27,36,0.28)] p-4 backdrop-blur-sm" onClick={closeCreateModal}>
          <div className="w-full max-w-2xl rounded-[28px] border border-[color:var(--gush-border)] bg-white/96 p-6 shadow-[var(--gush-shadow-panel)]" onClick={(event) => event.stopPropagation()}>
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-950">新增作品</h3>
                <p className="mt-1 text-sm text-slate-600">先补齐标题、署名和封面，再决定下一步去详情页还是章节管理。</p>
              </div>
              <button type="button" onClick={closeCreateModal} className="rounded-full border border-[color:var(--gush-border)] bg-white p-2 text-slate-500 transition hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)]"><X size={18} /></button>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr,1.1fr]">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">封面图片</label>
                <div onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={(event) => { event.preventDefault(); setIsDragging(false); handleCoverInput(event.dataTransfer.files?.[0]); }} className={`rounded-[28px] border border-dashed p-4 transition ${isDragging ? "border-[color:var(--gush-border-strong)] bg-[color:var(--gush-page-bg-muted)]" : "border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)]"}`}>
                  {createForm.coverPreviewUrl ? (
                    <div className="space-y-3">
                      <img src={createForm.coverPreviewUrl} alt="封面预览" className="aspect-[2/3] w-full rounded-[24px] object-cover" />
                      <button type="button" onClick={() => setCreateForm((current) => { revokeObjectUrl(current.coverPreviewUrl); return { ...current, coverFile: null, coverPreviewUrl: "" }; })} className="w-full rounded-full border border-[color:var(--gush-border)] bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)]">移除封面</button>
                    </div>
                  ) : (
                    <label className="flex min-h-[320px] cursor-pointer flex-col items-center justify-center gap-3 rounded-[24px] border border-[color:var(--gush-border)] bg-white px-6 text-center text-slate-500">
                      <Upload size={28} className="text-slate-950" />
                      <div><p className="text-sm font-semibold text-slate-950">把图片拖到这里，或点击上传</p><p className="mt-1 text-xs text-slate-500">支持 JPG、PNG、GIF，大小不超过 10MB。</p></div>
                      <input type="file" accept="image/*" className="hidden" onChange={(event) => handleCoverInput(event.target.files?.[0])} />
                    </label>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-slate-700">作品标题 *</span>
                  <input value={createForm.title} onChange={(event) => setCreateForm((current) => ({ ...current, title: event.target.value }))} placeholder="例如：午夜契约" className="w-full rounded-[20px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[color:var(--gush-border-strong)]" />
                  <span className="text-xs text-slate-500">建议作品 ID：{suggestedSeriesId}</span>
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-slate-700">创作者 / 团队署名</span>
                  <input
                    value={createForm.author}
                    onChange={(event) => setCreateForm((current) => ({ ...current, author: event.target.value }))}
                    placeholder="例如：Studio LICO"
                    className="w-full rounded-[20px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[color:var(--gush-border-strong)]"
                  />
                  <span className="text-xs text-slate-500">尽早补上公开署名，创作者页和作品页才会保持一致。</span>
                </label>

                <div className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">作品形式</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setCreateForm((current) => ({ ...current, type: "comic" }))} className={`rounded-[20px] border px-4 py-3 text-sm font-semibold transition ${createForm.type === "comic" ? "border-[color:var(--gush-border-strong)] bg-[color:var(--gush-page-bg-muted)] text-slate-950" : "border-[color:var(--gush-border)] bg-white text-slate-600 hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)] hover:text-slate-950"}`}>漫画</button>
                    <button type="button" onClick={() => setCreateForm((current) => ({ ...current, type: "novel" }))} className={`rounded-[20px] border px-4 py-3 text-sm font-semibold transition ${createForm.type === "novel" ? "border-[color:var(--gush-border-strong)] bg-[color:var(--gush-page-bg-muted)] text-slate-950" : "border-[color:var(--gush-border)] bg-white text-slate-600 hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)] hover:text-slate-950"}`}>小说</button>
                  </div>
                </div>

                <label className="flex items-center gap-3 rounded-[20px] border border-[color:var(--gush-border)] bg-white px-4 py-3 text-sm text-slate-700">
                  <input type="checkbox" checked={createForm.adult} onChange={(event) => setCreateForm((current) => ({ ...current, adult: event.target.checked }))} className="h-4 w-4 rounded border-black/20 bg-white text-slate-950" />
                  <span>18+ 作品</span>
                </label>

                <label className="flex items-center gap-3 rounded-[20px] border border-[color:var(--gush-border)] bg-white px-4 py-3 text-sm text-slate-700">
                  <input type="checkbox" checked={createForm.isPublished} onChange={(event) => setCreateForm((current) => ({ ...current, isPublished: event.target.checked }))} className="h-4 w-4 rounded border-black/20 bg-white text-slate-950" />
                  <span>创建后立即发布</span>
                </label>

                <div className="grid gap-3">
                  <label className="block space-y-2">
                    <span className="text-sm font-semibold text-slate-700">连载状态</span>
                    <select value={createForm.status} onChange={(event) => setCreateForm((current) => ({ ...current, status: event.target.value }))} className="w-full rounded-[20px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[color:var(--gush-border-strong)]">
                      {STATUS_OPTIONS.map((option) => <option key={option} value={option}>{formatSeriesStatusLabel(option)}</option>)}
                    </select>
                  </label>
                </div>

                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-slate-700">作品简介</span>
                  <textarea value={createForm.description} onChange={(event) => setCreateForm((current) => ({ ...current, description: event.target.value }))} placeholder="写一段清楚、克制的作品简介。" rows={4} className="w-full rounded-[20px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[color:var(--gush-border-strong)]" />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-slate-700">题材与标签</span>
                  <input value={createForm.genres} onChange={(event) => setCreateForm((current) => ({ ...current, genres: event.target.value }))} placeholder="动作、恋爱、奇幻" className="w-full rounded-[20px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[color:var(--gush-border-strong)]" />
                </label>

                <div className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">创建后前往</span>
                  <div className="grid gap-2">
                    {CREATE_FLOW_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setCreateForm((current) => ({ ...current, openAfterCreate: option.value }))}
                        className={`rounded-[20px] border px-4 py-3 text-left transition ${createForm.openAfterCreate === option.value ? "border-[color:var(--gush-border-strong)] bg-[color:var(--gush-page-bg-muted)] text-slate-950" : "border-[color:var(--gush-border)] bg-white text-slate-600 hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)] hover:text-slate-950"}`}
                      >
                        <p className="text-sm font-semibold">{option.label}</p>
                        <p className="mt-1 text-xs text-slate-500">{option.helper}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={closeCreateModal} className="flex-1 rounded-full border border-[color:var(--gush-border)] bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)]">取消</button>
                  <button type="button" onClick={handleCreate} disabled={isCreating} className="flex-1 rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">{isCreating ? "创建中..." : "创建"}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {duplicateDialog.isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(20,27,36,0.28)] p-4 backdrop-blur-sm" onClick={() => setDuplicateDialog({ isOpen: false, series: null, newId: "" })}>
          <div className="w-full max-w-lg rounded-[28px] border border-[color:var(--gush-border)] bg-white/96 p-6 shadow-[var(--gush-shadow-panel)]" onClick={(event) => event.stopPropagation()}>
            <h3 className="text-xl font-semibold text-slate-950">复制作品</h3>
            <p className="mt-1 text-sm text-slate-600">基于当前作品生成一个新的草稿副本。</p>
            <label className="mt-5 block space-y-2">
              <span className="text-sm font-semibold text-slate-700">新的作品 ID *</span>
              <input value={duplicateDialog.newId} onChange={(event) => setDuplicateDialog((current) => ({ ...current, newId: event.target.value }))} placeholder="请输入新的作品 ID" className="w-full rounded-[20px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[color:var(--gush-border-strong)]" />
            </label>
            <div className="mt-6 flex gap-3">
              <button type="button" onClick={() => setDuplicateDialog({ isOpen: false, series: null, newId: "" })} className="flex-1 rounded-full border border-[color:var(--gush-border)] bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)]">取消</button>
              <button type="button" onClick={handleDuplicate} disabled={isDuplicating} className="flex-1 rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">{isDuplicating ? "复制中..." : "复制"}</button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmModal isOpen={confirmDialog.isOpen} onClose={() => setConfirmDialog((current) => ({ ...current, isOpen: false }))} onConfirm={confirmDialog.onConfirm} title={confirmDialog.title} message={confirmDialog.message} confirmText="确认" cancelText="取消" variant={confirmDialog.variant} />
    </div>
  );
}

