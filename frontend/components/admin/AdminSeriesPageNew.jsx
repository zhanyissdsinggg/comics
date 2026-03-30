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
import { getAdminSeriesReadiness } from "../../lib/adminSeriesReadiness";
import { resolveSeriesCreatorIdentity } from "../../lib/creatorIdentity";

const TYPE_TABS = [
  { value: "all", label: "All formats" },
  { value: "comic", label: "Comics" },
  { value: "novel", label: "Novels" },
];
const STATUS_OPTIONS = ["Ongoing", "Completed", "Hiatus", "Cancelled"];
const DEFAULT_FILTERS = { status: "all", publishStatus: "all", adultContent: "all", sortBy: "createdAt_desc" };
const EMPTY_FEEDBACK = { type: "", message: "" };
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const QUICK_FILTERS = [
  { value: "all", label: "All titles" },
  { value: "needsMetadata", label: "Needs a live-page pass" },
  { value: "noAuthor", label: "Missing creator credit" },
  { value: "needsEpisodes", label: "No episodes yet" },
  { value: "noCover", label: "Missing cover" },
  { value: "draft", label: "Draft only" },
  { value: "adult", label: "18+" },
];
const CREATE_FLOW_OPTIONS = [
  { value: "stay", label: "Stay here", helper: "Keep working through the catalog list." },
  { value: "details", label: "Open details", helper: "Continue filling in story metadata and cover art." },
  { value: "episodes", label: "Go to episodes", helper: "Start adding comic chapters or novel episodes next." },
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
  const creatorIdentity = resolveSeriesCreatorIdentity(source);
  return {
    id: String(source.id || `series-${index + 1}`),
    title: String(source.title || "Untitled series"),
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
    author: String(merged.author || "").trim(),
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
  if (!value) return "Not yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not yet";
  return new Intl.DateTimeFormat("en-US", compact ? { month: "short", day: "numeric" } : { month: "short", day: "numeric", year: "numeric" }).format(date);
}
function formatSeriesTypeLabel(type) {
  return type === "novel" ? "Novel" : "Comic";
}
function formatSeriesStatusLabel(status) {
  if (status === "Completed") return "Completed";
  if (status === "Hiatus") return "Hiatus";
  if (status === "Cancelled") return "Cancelled";
  return "Ongoing";
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
  const creatorLine = series.creatorLabel || series.author || "Creator details coming soon";
  return (
    <article
      className={`rounded-[28px] border bg-white/92 p-4 shadow-[var(--gush-shadow-soft)] transition ${
        isSelected ? "border-[rgba(47,88,198,0.24)] ring-1 ring-[rgba(47,88,198,0.18)]" : "border-black/8"
      }`}
    >
      <div className={`grid gap-4 ${isList ? "lg:grid-cols-[auto,84px,1.6fr,1fr,auto] lg:items-center" : ""}`}>
        <label className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-[rgba(250,247,241,0.92)]">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect(series.id)}
            className="h-4 w-4 cursor-pointer rounded border-black/20 bg-transparent text-[var(--gush-accent,#2f58c6)]"
          />
        </label>
        <div
          className={`${isList ? "h-24 w-16" : "aspect-[2/3] w-full"} overflow-hidden rounded-[24px] bg-[rgba(250,247,241,0.92)]`}
        >
          {series.coverUrl ? (
            <img src={series.coverUrl} alt={`${series.title} cover`} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-slate-400">
              <ImageIcon size={isList ? 24 : 40} />
            </div>
          )}
        </div>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="rounded-full border border-black/8 bg-[rgba(250,247,241,0.9)] px-2.5 py-1 text-slate-700">
              {formatSeriesTypeLabel(series.type)}
            </span>
            <span className="rounded-full border border-[rgba(47,88,198,0.14)] bg-[rgba(47,88,198,0.08)] px-2.5 py-1 text-[var(--gush-accent,#2f58c6)]">
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
                Draft
              </span>
            ) : null}
          </div>
          {isEditing ? (
            <div className="space-y-3 rounded-[24px] border border-black/8 bg-[rgba(250,247,241,0.76)] p-4">
              <input
                value={editDraft?.title || ""}
                onChange={(event) => onEditDraftChange({ ...editDraft, title: event.target.value })}
                className="w-full rounded-[18px] border border-black/8 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-[var(--gush-accent,#2f58c6)]"
                placeholder="Series title"
              />
              <div className="grid gap-3 md:grid-cols-2">
                <select
                  value={editDraft?.status || "Ongoing"}
                  onChange={(event) => onEditDraftChange({ ...editDraft, status: event.target.value })}
                  className="rounded-[18px] border border-black/8 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-[var(--gush-accent,#2f58c6)]"
                >
                  {STATUS_OPTIONS.map((option) => <option key={option} value={option}>{formatSeriesStatusLabel(option)}</option>)}
                </select>
                <label className="flex items-center gap-3 rounded-[18px] border border-black/8 bg-white px-4 py-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={Boolean(editDraft?.adult)}
                    onChange={(event) => onEditDraftChange({ ...editDraft, adult: event.target.checked })}
                    className="h-4 w-4 rounded border-black/20 bg-white text-[var(--gush-accent,#2f58c6)]"
                  />
                  <span>Adult title</span>
                </label>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => onOpenDetails(series.id)}
                className="text-left text-lg font-semibold text-slate-950 transition hover:text-[var(--gush-accent,#2f58c6)]"
              >
                {series.title}
              </button>
              <p className="text-xs uppercase tracking-wide text-slate-400">{series.id}</p>
              <p className="text-sm text-slate-600">
                Creator:{" "}
                <span
                  className={
                    series.creatorLabel || series.author ? "font-medium text-slate-950" : "text-amber-700"
                  }
                >
                  {creatorLine}
                </span>
              </p>
              <p className="line-clamp-2 text-sm text-slate-600">
                {series.description || "No series summary yet."}
              </p>
              <p className="text-xs text-slate-500">
                Storefront readiness {readiness.score}
                {readiness.missingCount > 0
                  ? ` · Fix ${readiness.topIssues.join(", ")}`
                  : " · Ready for live discovery"}
              </p>
              <div className="flex flex-wrap gap-2 pt-2 text-[11px] font-medium">
                <span className="rounded-full border border-black/8 bg-[rgba(250,247,241,0.9)] px-2.5 py-1 text-slate-600">
                  {series.episodeCount > 0 ? `${series.episodeCount} episodes` : "Episodes still missing"}
                </span>
                {!series.creatorLabel && !series.author ? (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-700">
                    Missing creator credit
                  </span>
                ) : null}
                {!series.coverUrl ? (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-700">
                    Missing cover
                  </span>
                ) : null}
                {!series.description?.trim() ? (
                  <span className="rounded-full border border-black/8 bg-[rgba(250,247,241,0.9)] px-2.5 py-1 text-slate-600">
                    Summary still needed
                  </span>
                ) : null}
                {!series.genres.length ? (
                  <span className="rounded-full border border-black/8 bg-[rgba(250,247,241,0.9)] px-2.5 py-1 text-slate-600">
                    Tags still needed
                  </span>
                ) : null}
                {series.episodeCount === 0 ? (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-700">
                    No episodes yet
                  </span>
                ) : null}
                {series.genres.slice(0, 3).map((genre) => (
                  <span
                    key={`${series.id}-${genre}`}
                    className="rounded-full border border-[rgba(47,88,198,0.14)] bg-[rgba(47,88,198,0.08)] px-2.5 py-1 text-[var(--gush-accent,#2f58c6)]"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 rounded-[24px] bg-[rgba(250,247,241,0.76)] p-4 text-sm lg:grid-cols-2">
          <div><p className="text-slate-500">Episodes</p><p className="mt-1 font-semibold text-slate-950">{series.episodeCount || 0}</p></div>
          <div><p className="text-slate-500">Updated</p><p className="mt-1 font-semibold text-slate-950">{formatUpdatedAt(series.updatedAt, true)}</p></div>
          <div><p className="text-slate-500">Cover</p><p className="mt-1 font-semibold text-slate-950">{series.coverUrl ? "Ready" : "Missing"}</p></div>
          <div><p className="text-slate-500">Visibility</p><p className="mt-1 font-semibold text-slate-950">{series.isPublished ? "Published" : "Draft"}</p></div>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          {isEditing ? (
            <>
              <button type="button" onClick={onSaveEdit} disabled={isSaving} className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">{isSaving ? "Saving..." : "Save"}</button>
              <button type="button" onClick={onCancelEdit} disabled={isSaving} className="rounded-full border border-black/8 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[rgba(250,248,244,0.96)] disabled:cursor-not-allowed disabled:opacity-50">Cancel</button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => onOpenEpisodes(series.id)} className="inline-flex items-center gap-2 rounded-full border border-[rgba(47,88,198,0.14)] bg-[rgba(47,88,198,0.06)] px-3 py-2 text-xs font-semibold text-[var(--gush-accent,#2f58c6)] transition hover:bg-[rgba(47,88,198,0.1)]" title="Manage episodes">
                <BookOpen size={15} />
                <span>Episodes</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenFrontend(series.id)}
                disabled={!series.isPublished}
                className="inline-flex items-center gap-2 rounded-full border border-black/8 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[rgba(250,248,244,0.96)] disabled:cursor-not-allowed disabled:opacity-50"
                title={series.isPublished ? "View live page" : "Draft titles cannot open a live page"}
              >
                <ExternalLink size={15} />
                <span>Live page</span>
              </button>
              <button type="button" onClick={() => onOpenDetails(series.id)} className="inline-flex items-center gap-2 rounded-full border border-black/8 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[rgba(250,248,244,0.96)]" title="Edit details">
                <Edit size={15} />
                <span>Details</span>
              </button>
              <button type="button" onClick={() => onStartEdit(series)} className="rounded-full border border-black/8 bg-white px-3 py-2 text-slate-700 transition hover:border-black/12 hover:bg-[rgba(250,248,244,0.96)]" title="Quick edit"><Edit size={16} /></button>
              <button type="button" onClick={() => onTogglePublish(series)} className="rounded-full border border-black/8 bg-white px-3 py-2 text-slate-700 transition hover:border-black/12 hover:bg-[rgba(250,248,244,0.96)]" title={series.isPublished ? "Move to draft" : "Publish now"}>{series.isPublished ? <EyeOff size={16} /> : <Eye size={16} />}</button>
              <button type="button" onClick={() => onDuplicate(series)} className="rounded-full border border-black/8 bg-white px-3 py-2 text-slate-700 transition hover:border-black/12 hover:bg-[rgba(250,248,244,0.96)]" title="Duplicate series"><Copy size={16} /></button>
              <button type="button" onClick={() => onDelete(series)} className="rounded-full border border-red-200 bg-red-50 px-3 py-2 text-red-700 transition hover:bg-red-100" title="Delete series"><Trash2 size={16} /></button>
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
      setFeedback({ type: "error", message: response.error || "Series could not be loaded." });
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
        (quickFilter === "noAuthor" && !series.creatorLabel.trim() && !series.author.trim()) ||
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
    const noAuthor = seriesList.filter((item) => !item.creatorLabel.trim() && !item.author.trim()).length;
    const drafts = seriesList.filter((item) => !item.isPublished).length;
    const noEpisodes = seriesList.filter((item) => item.episodeCount === 0).length;
    const noCover = seriesList.filter((item) => !item.coverUrl).length;

    return [
      { label: "All titles", value: total, hint: "Current catalog size" },
      { label: "Comics", value: comics, hint: `${novels} novels in the same catalog` },
      { label: "Live-page ready", value: readyCount, hint: `${noAuthor} missing creator credit` },
      { label: "Need episodes", value: noEpisodes, hint: "Useful for launch prep" },
      { label: "Need covers", value: noCover, hint: `${drafts} still in draft` },
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
      setFeedback({ type: "error", message: "A series title is required." });
      return;
    }
    const target = seriesList.find((series) => series.id === seriesId);
    if (!target) return;
    setIsSavingEdit(true);
    const response = await apiPatch(`/api/admin/series/${seriesId}`, { series: buildSeriesPayload(target, { title: editingDraft.title.trim(), status: editingDraft.status, adult: editingDraft.adult }) });
    if (response.ok) {
      updateSeriesLocally(seriesId, (current) => ({ ...current, title: editingDraft.title.trim(), status: editingDraft.status, adult: editingDraft.adult, updatedAt: new Date().toISOString() }));
      setFeedback({ type: "success", message: "Series details were updated." });
      handleCancelEdit();
    } else {
      setFeedback({ type: "error", message: response.error || "Changes could not be saved." });
    }
    setIsSavingEdit(false);
  };

  const handleTogglePublish = async (series) => {
    const nextPublished = !series.isPublished;
    const response = await apiPatch(`/api/admin/series/${series.id}`, { series: buildSeriesPayload(series, { isPublished: nextPublished }) });
    if (response.ok) {
      updateSeriesLocally(series.id, (current) => ({ ...current, isPublished: nextPublished, updatedAt: new Date().toISOString() }));
      setFeedback({ type: "success", message: nextPublished ? "Series is now live." : "Series moved back to draft." });
    } else {
      setFeedback({ type: "error", message: response.error || "Visibility could not be updated." });
    }
  };

  const uploadCoverImage = async (file) => {
    if (!file) return "";
    if (!file.type.startsWith("image/")) throw new Error("Upload a valid image file.");
    if (file.size > MAX_UPLOAD_BYTES) throw new Error("Cover images must be 10MB or smaller.");
    const formData = new FormData();
    formData.append("file", file);
    const response = await adminUpload("/api/admin/upload/image", formData);
    if (!response.ok || !response.data?.url) throw new Error(response.error || "Cover upload failed.");
    return response.data.url;
  };

  const handleCreate = async () => {
    if (!createForm.title.trim()) {
      setFeedback({ type: "error", message: "A series title is required." });
      return;
    }
    if (!/^\d+$/.test(String(createForm.episodePrice || "0"))) {
      setFeedback({ type: "error", message: "Default episode price must be a non-negative whole number." });
      return;
    }
    if (createForm.ttfEnabled && (!/^\d+$/.test(String(createForm.ttfIntervalHours || "")) || toNumber(createForm.ttfIntervalHours, 0) < 1)) {
      setFeedback({ type: "error", message: "The free-pass interval must be at least 1 hour." });
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
          badge: createForm.badge,
          episodePrice: toNumber(createForm.episodePrice, 0),
          ttfEnabled: createForm.ttfEnabled,
          ttfIntervalHours: Math.max(1, toNumber(createForm.ttfIntervalHours, 24)),
          isPublished: createForm.isPublished,
          isFeatured: false,
        }),
      });
      if (!response.ok) throw new Error(response.error || "Series could not be created.");
      const createdSeriesId = response.data?.series?.id || nextSeriesId;
      const nextFlow = createForm.openAfterCreate || "stay";

      setFeedback({
        type: "success",
        message:
          nextFlow === "episodes"
            ? "Series created. Opening episodes next."
            : nextFlow === "details"
              ? "Series created. Opening details next."
              : "Series created successfully.",
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
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "Series could not be created." });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = (series) => setConfirmDialog({
    isOpen: true,
    title: "Delete series",
    message: `Delete ${series.title}? This cannot be undone.`,
    variant: "danger",
    onConfirm: async () => {
      const response = await apiDelete(`/api/admin/series/${series.id}`);
      if (response.ok) {
        setSeriesList((current) => current.filter((item) => item.id !== series.id));
        setSelectedSeries((current) => current.filter((id) => id !== series.id));
        setFeedback({ type: "success", message: "Series was deleted." });
      } else {
        setFeedback({ type: "error", message: response.error || "Series could not be deleted." });
      }
    },
  });

  const handleOpenDuplicate = (series) => setDuplicateDialog({ isOpen: true, series, newId: `${slugifyTitle(series.title)}-copy` });
  const handleDuplicate = async () => {
    const source = duplicateDialog.series;
    const nextId = duplicateDialog.newId.trim();
    if (!source || !nextId) {
      setFeedback({ type: "error", message: "A new series id is required." });
      return;
    }
    setIsDuplicating(true);
    const response = await apiPost("/api/admin/series", { series: buildSeriesPayload(source, { id: nextId, title: `${source.title} (Copy)` }) });
    if (response.ok) {
      setFeedback({ type: "success", message: "Series was duplicated." });
      setDuplicateDialog({ isOpen: false, series: null, newId: "" });
      await loadSeries();
    } else {
      setFeedback({ type: "error", message: response.error || "Series could not be duplicated." });
    }
    setIsDuplicating(false);
  };

  const updatePublishStateForSelection = async (nextPublished) => {
    const targets = seriesList.filter((series) => selectedSeries.includes(series.id));
    await Promise.all(targets.map((series) => apiPatch(`/api/admin/series/${series.id}`, { series: buildSeriesPayload(series, { isPublished: nextPublished }) })));
    setSeriesList((current) => current.map((series) => (selectedSeries.includes(series.id) ? { ...series, isPublished: nextPublished, updatedAt: new Date().toISOString() } : series)));
    setFeedback({ type: "success", message: nextPublished ? "Selected titles are now live." : "Selected titles moved back to draft." });
  };

  const handleBulkPublish = async () => updatePublishStateForSelection(true);
  const handleBulkUnpublish = async () => updatePublishStateForSelection(false);
  const handleBulkDelete = async () => setConfirmDialog({
    isOpen: true,
    title: "Delete selected series",
    message: `Delete ${selectedSeries.length} selected titles? This cannot be undone.`,
    variant: "danger",
    onConfirm: async () => {
      const ids = [...selectedSeries];
      await Promise.all(ids.map((id) => apiDelete(`/api/admin/series/${id}`)));
      setSeriesList((current) => current.filter((series) => !ids.includes(series.id)));
      setSelectedSeries([]);
      setFeedback({ type: "success", message: "Selected titles were deleted." });
    },
  });

  const handleCoverInput = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setFeedback({ type: "error", message: "Upload a valid image file." });
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setFeedback({ type: "error", message: "Cover images must be 10MB or smaller." });
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

  if (isLoading || loading) return <section className="rounded-[28px] border border-black/8 bg-white/88 p-8 text-sm text-slate-600 shadow-[var(--gush-shadow-soft)]">Loading series workspace...</section>;
  if (!isAuthenticated) return <section className="rounded-[28px] border border-dashed border-black/8 bg-white/88 p-10 text-center text-sm text-slate-600 shadow-[var(--gush-shadow-soft)]">Admin access is required to view this page.</section>;

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-black/8 bg-white/92 p-6 shadow-[var(--gush-shadow-soft)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Series workspace</p>
            <h2 className="text-2xl font-semibold text-slate-950">Keep titles clean, credited, and ready to publish.</h2>
            <p className="text-sm leading-6 text-slate-600">Review the catalog by story readiness first, then move into details or episode work only when it helps the live reading path.</p>
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
              className="inline-flex items-center gap-2 rounded-full border border-[rgba(47,88,198,0.14)] bg-[rgba(47,88,198,0.08)] px-4 py-2.5 text-sm font-semibold text-[var(--gush-accent,#2f58c6)] transition hover:bg-[rgba(47,88,198,0.12)]"
            >
              <BookOpen size={16} />
              <span>New comic</span>
            </button>
            <button type="button" onClick={() => { setCreateForm(createEmptyCreateForm()); setShowCreateModal(true); }} className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"><Plus size={16} /><span>New series</span></button>
          </div>
        </div>
      </section>

      <Feedback feedback={feedback} onDismiss={dismissFeedback} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {seriesStats.map((item) => (
          <article key={item.label} className="rounded-[24px] border border-black/8 bg-white/88 p-5 shadow-[var(--gush-shadow-soft)]">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
            <p className="mt-3 text-3xl font-semibold text-slate-950">{item.value}</p>
            <p className="mt-2 text-sm text-slate-600">{item.hint}</p>
          </article>
        ))}
      </section>

      <section className="rounded-[28px] border border-black/8 bg-white/92 p-5 shadow-[var(--gush-shadow-soft)]">
        <div className="flex flex-col gap-4">
          {hasScopedCreatorFilter ? (
            <div className="flex flex-col gap-3 rounded-[24px] border border-sky-200 bg-sky-50 px-4 py-4 text-sm text-sky-700 md:flex-row md:items-center md:justify-between">
              <p>
                This list is filtered by creator query:
                <span className="font-semibold text-slate-950"> {scopedCreatorQuery}</span>.
                Matching titles, ids, and creator labels helps you fix credit attribution faster.
              </p>
              <button
                type="button"
                onClick={() => router.push("/admin/series")}
                className="inline-flex items-center justify-center rounded-full border border-black/8 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[rgba(250,248,244,0.96)]"
              >
                Clear creator filter
              </button>
            </div>
          ) : null}
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
              {TYPE_TABS.map((tab) => <button key={tab.value} type="button" onClick={() => setTypeFilter(tab.value)} className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${typeFilter === tab.value ? "border-[rgba(47,88,198,0.14)] bg-[rgba(47,88,198,0.08)] text-[var(--gush-accent,#2f58c6)]" : "border-black/8 bg-white text-slate-600 hover:border-black/12 hover:bg-[rgba(250,248,244,0.96)] hover:text-slate-950"}`}>{tab.label}</button>)}
            </div>
            <div className="flex flex-1 flex-wrap items-center gap-2 xl:justify-end">
              <label className="flex min-w-[260px] flex-1 items-center gap-3 rounded-full border border-black/8 bg-[rgba(250,247,241,0.88)] px-4 py-3 xl:max-w-md"><Search size={16} className="text-slate-400" /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search titles, ids, creator credits, or draft notes..." className="w-full bg-transparent text-sm text-slate-950 outline-none placeholder:text-slate-400" /></label>
              <AdvancedFilters filters={advancedFilters} onFiltersChange={setAdvancedFilters} />
              <button type="button" onClick={handleToggleSelectAll} disabled={filteredSeries.length === 0} className="rounded-full border border-black/8 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[rgba(250,248,244,0.96)] disabled:cursor-not-allowed disabled:opacity-50">{allVisibleSelected ? "Clear selection" : "Select all"}</button>
              <div className="flex items-center overflow-hidden rounded-full border border-black/8 bg-white">
                <button type="button" onClick={() => setViewMode("grid")} className={`px-4 py-3 transition ${viewMode === "grid" ? "bg-slate-950 text-white" : "text-slate-500 hover:bg-[rgba(250,248,244,0.96)] hover:text-slate-950"}`} title="Grid view"><Grid size={16} /></button>
                <button type="button" onClick={() => setViewMode("list")} className={`px-4 py-3 transition ${viewMode === "list" ? "bg-slate-950 text-white" : "text-slate-500 hover:bg-[rgba(250,248,244,0.96)] hover:text-slate-950"}`} title="List view"><List size={16} /></button>
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
                  className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${quickFilter === filter.value ? "border-[rgba(47,88,198,0.14)] bg-[rgba(47,88,198,0.08)] text-[var(--gush-accent,#2f58c6)]" : "border-black/8 bg-white text-slate-600 hover:border-black/12 hover:bg-[rgba(250,248,244,0.96)] hover:text-slate-950"}`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-slate-950">{filteredSeries.length}</span> titles in view
            </p>
          </div>
        </div>
      </section>

      <BulkActionsToolbar selectedCount={selectedSeries.length} onPublish={handleBulkPublish} onUnpublish={handleBulkUnpublish} onDelete={handleBulkDelete} onCancel={() => setSelectedSeries([])} />

      {filteredSeries.length === 0 ? (
        <section className="rounded-[28px] border border-dashed border-black/8 bg-white/88 p-12 text-center shadow-[var(--gush-shadow-soft)]"><ImageIcon size={36} className="mx-auto text-slate-400" /><h3 className="mt-4 text-lg font-semibold text-slate-950">No titles matched this view</h3><p className="mt-2 text-sm text-slate-600">{searchQuery || typeFilter !== "all" || quickFilter !== "all" || advancedFilters.status !== "all" || advancedFilters.publishStatus !== "all" || advancedFilters.adultContent !== "all" ? "Try adjusting the filters or search terms." : "Start by adding the first title to this workspace."}</p></section>
      ) : (
        <section className={viewMode === "grid" ? "grid gap-5 md:grid-cols-2 xl:grid-cols-3" : "space-y-4"}>
          {filteredSeries.map((series) => <SeriesCard key={series.id} series={series} viewMode={viewMode} isSelected={selectedSeries.includes(series.id)} isEditing={editingId === series.id} editDraft={editingId === series.id ? editingDraft : null} isSaving={isSavingEdit} onSelect={handleToggleSelection} onStartEdit={handleStartEdit} onEditDraftChange={setEditingDraft} onSaveEdit={() => handleSaveEdit(series.id)} onCancelEdit={handleCancelEdit} onOpenDetails={handleOpenDetails} onOpenEpisodes={handleOpenEpisodes} onOpenFrontend={handleOpenFrontend} onTogglePublish={handleTogglePublish} onDuplicate={handleOpenDuplicate} onDelete={handleDelete} />)}
        </section>
      )}

      {showCreateModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(20,27,36,0.28)] p-4 backdrop-blur-sm" onClick={closeCreateModal}>
          <div className="w-full max-w-2xl rounded-[28px] border border-black/8 bg-white/96 p-6 shadow-[var(--gush-shadow-panel)]" onClick={(event) => event.stopPropagation()}>
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-950">Create a new series</h3>
                <p className="mt-1 text-sm text-slate-600">Set the basics first, then decide whether to continue in details or episodes.</p>
              </div>
              <button type="button" onClick={closeCreateModal} className="rounded-full border border-black/8 bg-white p-2 text-slate-500 transition hover:border-black/12 hover:bg-[rgba(250,248,244,0.96)]"><X size={18} /></button>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr,1.1fr]">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Cover image</label>
                <div onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={(event) => { event.preventDefault(); setIsDragging(false); handleCoverInput(event.dataTransfer.files?.[0]); }} className={`rounded-[28px] border border-dashed p-4 transition ${isDragging ? "border-[var(--gush-accent,#2f58c6)] bg-[rgba(47,88,198,0.08)]" : "border-black/8 bg-[rgba(250,247,241,0.76)]"}`}>
                  {createForm.coverPreviewUrl ? (
                    <div className="space-y-3">
                      <img src={createForm.coverPreviewUrl} alt="Cover preview" className="aspect-[2/3] w-full rounded-[24px] object-cover" />
                      <button type="button" onClick={() => setCreateForm((current) => { revokeObjectUrl(current.coverPreviewUrl); return { ...current, coverFile: null, coverPreviewUrl: "" }; })} className="w-full rounded-full border border-black/8 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[rgba(250,248,244,0.96)]">Remove cover</button>
                    </div>
                  ) : (
                    <label className="flex min-h-[320px] cursor-pointer flex-col items-center justify-center gap-3 rounded-[24px] border border-black/8 bg-white px-6 text-center text-slate-500">
                      <Upload size={28} className="text-[var(--gush-accent,#2f58c6)]" />
                      <div><p className="text-sm font-semibold text-slate-950">Drop an image here, or click to upload</p><p className="mt-1 text-xs text-slate-500">JPG, PNG, or GIF up to 10MB.</p></div>
                      <input type="file" accept="image/*" className="hidden" onChange={(event) => handleCoverInput(event.target.files?.[0])} />
                    </label>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Series title *</span>
                  <input value={createForm.title} onChange={(event) => setCreateForm((current) => ({ ...current, title: event.target.value }))} placeholder="For example: Midnight Contract" className="w-full rounded-[20px] border border-black/8 bg-[rgba(250,247,241,0.9)] px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[var(--gush-accent,#2f58c6)]" />
                  <span className="text-xs text-slate-500">Suggested series id: {suggestedSeriesId}</span>
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Creator or studio</span>
                  <input
                    value={createForm.author}
                    onChange={(event) => setCreateForm((current) => ({ ...current, author: event.target.value }))}
                    placeholder="For example: Studio LICO"
                    className="w-full rounded-[20px] border border-black/8 bg-[rgba(250,247,241,0.9)] px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[var(--gush-accent,#2f58c6)]"
                  />
                  <span className="text-xs text-slate-500">Add public-facing creator credit early so creator pages and trust surfaces stay consistent.</span>
                </label>

                <div className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Format</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setCreateForm((current) => ({ ...current, type: "comic" }))} className={`rounded-[20px] border px-4 py-3 text-sm font-semibold transition ${createForm.type === "comic" ? "border-[rgba(47,88,198,0.14)] bg-[rgba(47,88,198,0.08)] text-[var(--gush-accent,#2f58c6)]" : "border-black/8 bg-white text-slate-600 hover:border-black/12 hover:bg-[rgba(250,248,244,0.96)] hover:text-slate-950"}`}>Comic</button>
                    <button type="button" onClick={() => setCreateForm((current) => ({ ...current, type: "novel" }))} className={`rounded-[20px] border px-4 py-3 text-sm font-semibold transition ${createForm.type === "novel" ? "border-[rgba(47,88,198,0.14)] bg-[rgba(47,88,198,0.08)] text-[var(--gush-accent,#2f58c6)]" : "border-black/8 bg-white text-slate-600 hover:border-black/12 hover:bg-[rgba(250,248,244,0.96)] hover:text-slate-950"}`}>Novel</button>
                  </div>
                </div>

                <label className="flex items-center gap-3 rounded-[20px] border border-black/8 bg-white px-4 py-3 text-sm text-slate-700">
                  <input type="checkbox" checked={createForm.adult} onChange={(event) => setCreateForm((current) => ({ ...current, adult: event.target.checked }))} className="h-4 w-4 rounded border-black/20 bg-white text-[var(--gush-accent,#2f58c6)]" />
                  <span>Adult title (18+)</span>
                </label>

                <label className="flex items-center gap-3 rounded-[20px] border border-black/8 bg-white px-4 py-3 text-sm text-slate-700">
                  <input type="checkbox" checked={createForm.isPublished} onChange={(event) => setCreateForm((current) => ({ ...current, isPublished: event.target.checked }))} className="h-4 w-4 rounded border-black/20 bg-white text-[var(--gush-accent,#2f58c6)]" />
                  <span>Publish immediately</span>
                </label>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="block space-y-2">
                    <span className="text-sm font-semibold text-slate-700">Status</span>
                    <select value={createForm.status} onChange={(event) => setCreateForm((current) => ({ ...current, status: event.target.value }))} className="w-full rounded-[20px] border border-black/8 bg-[rgba(250,247,241,0.9)] px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[var(--gush-accent,#2f58c6)]">
                      {STATUS_OPTIONS.map((option) => <option key={option} value={option}>{formatSeriesStatusLabel(option)}</option>)}
                    </select>
                  </label>
                  <label className="block space-y-2">
                    <span className="text-sm font-semibold text-slate-700">Badge</span>
                    <input value={createForm.badge} onChange={(event) => setCreateForm((current) => ({ ...current, badge: event.target.value }))} placeholder="For example: NEW" className="w-full rounded-[20px] border border-black/8 bg-[rgba(250,247,241,0.9)] px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[var(--gush-accent,#2f58c6)]" />
                  </label>
                </div>

                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Summary</span>
                  <textarea value={createForm.description} onChange={(event) => setCreateForm((current) => ({ ...current, description: event.target.value }))} placeholder="Write a clean summary for the series page." rows={4} className="w-full rounded-[20px] border border-black/8 bg-[rgba(250,247,241,0.9)] px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[var(--gush-accent,#2f58c6)]" />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Genres and tags</span>
                  <input value={createForm.genres} onChange={(event) => setCreateForm((current) => ({ ...current, genres: event.target.value }))} placeholder="Action, Romance, Fantasy" className="w-full rounded-[20px] border border-black/8 bg-[rgba(250,247,241,0.9)] px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[var(--gush-accent,#2f58c6)]" />
                </label>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="block space-y-2">
                    <span className="text-sm font-semibold text-slate-700">Default episode price</span>
                    <input value={createForm.episodePrice} onChange={(event) => setCreateForm((current) => ({ ...current, episodePrice: event.target.value }))} inputMode="numeric" placeholder="0" className="w-full rounded-[20px] border border-black/8 bg-[rgba(250,247,241,0.9)] px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[var(--gush-accent,#2f58c6)]" />
                  </label>
                  <label className="flex items-center gap-3 rounded-[20px] border border-black/8 bg-white px-4 py-3 text-sm text-slate-700">
                    <input type="checkbox" checked={createForm.ttfEnabled} onChange={(event) => setCreateForm((current) => ({ ...current, ttfEnabled: event.target.checked }))} className="h-4 w-4 rounded border-black/20 bg-white text-[var(--gush-accent,#2f58c6)]" />
                    <span>Enable free-pass window</span>
                  </label>
                </div>

                {createForm.ttfEnabled ? (
                  <label className="block space-y-2">
                    <span className="text-sm font-semibold text-slate-700">Free-pass interval (hours)</span>
                    <input value={createForm.ttfIntervalHours} onChange={(event) => setCreateForm((current) => ({ ...current, ttfIntervalHours: event.target.value }))} inputMode="numeric" placeholder="24" className="w-full rounded-[20px] border border-black/8 bg-[rgba(250,247,241,0.9)] px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[var(--gush-accent,#2f58c6)]" />
                  </label>
                ) : null}

                <div className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">After create</span>
                  <div className="grid gap-2">
                    {CREATE_FLOW_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setCreateForm((current) => ({ ...current, openAfterCreate: option.value }))}
                        className={`rounded-[20px] border px-4 py-3 text-left transition ${createForm.openAfterCreate === option.value ? "border-[rgba(47,88,198,0.14)] bg-[rgba(47,88,198,0.08)] text-slate-950" : "border-black/8 bg-white text-slate-600 hover:border-black/12 hover:bg-[rgba(250,248,244,0.96)] hover:text-slate-950"}`}
                      >
                        <p className="text-sm font-semibold">{option.label}</p>
                        <p className="mt-1 text-xs text-slate-500">{option.helper}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={closeCreateModal} className="flex-1 rounded-full border border-black/8 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[rgba(250,248,244,0.96)]">Cancel</button>
                  <button type="button" onClick={handleCreate} disabled={isCreating} className="flex-1 rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">{isCreating ? "Creating..." : "Create"}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {duplicateDialog.isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(20,27,36,0.28)] p-4 backdrop-blur-sm" onClick={() => setDuplicateDialog({ isOpen: false, series: null, newId: "" })}>
          <div className="w-full max-w-lg rounded-[28px] border border-black/8 bg-white/96 p-6 shadow-[var(--gush-shadow-panel)]" onClick={(event) => event.stopPropagation()}>
            <h3 className="text-xl font-semibold text-slate-950">Duplicate series</h3>
            <p className="mt-1 text-sm text-slate-600">Create a new draft from the current title.</p>
            <label className="mt-5 block space-y-2">
              <span className="text-sm font-semibold text-slate-700">New series id *</span>
              <input value={duplicateDialog.newId} onChange={(event) => setDuplicateDialog((current) => ({ ...current, newId: event.target.value }))} placeholder="Enter a new series id" className="w-full rounded-[20px] border border-black/8 bg-[rgba(250,247,241,0.9)] px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[var(--gush-accent,#2f58c6)]" />
            </label>
            <div className="mt-6 flex gap-3">
              <button type="button" onClick={() => setDuplicateDialog({ isOpen: false, series: null, newId: "" })} className="flex-1 rounded-full border border-black/8 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[rgba(250,248,244,0.96)]">Cancel</button>
              <button type="button" onClick={handleDuplicate} disabled={isDuplicating} className="flex-1 rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">{isDuplicating ? "Duplicating..." : "Duplicate"}</button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmModal isOpen={confirmDialog.isOpen} onClose={() => setConfirmDialog((current) => ({ ...current, isOpen: false }))} onConfirm={confirmDialog.onConfirm} title={confirmDialog.title} message={confirmDialog.message} confirmText="Confirm" cancelText="Cancel" variant={confirmDialog.variant} />
    </div>
  );
}
