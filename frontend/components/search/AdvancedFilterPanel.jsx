"use client";

import { memo, useEffect, useState } from "react";

const TYPE_OPTIONS = [
  { value: "comic", label: "Comic", icon: "CM" },
  { value: "novel", label: "Novel", icon: "NV" },
  { value: "webtoon", label: "Webtoon", icon: "WT" },
  { value: "manga", label: "Manga", icon: "MG" },
];

const TAG_OPTIONS = [
  { value: "romance", label: "Romance", color: "bg-[rgba(214,72,153,0.44)]" },
  { value: "action", label: "Action", color: "bg-[rgba(197,40,40,0.42)]" },
  { value: "fantasy", label: "Fantasy", color: "bg-[rgba(99,102,241,0.42)]" },
  { value: "comedy", label: "Comedy", color: "bg-[rgba(176,95,0,0.38)]" },
  { value: "drama", label: "Drama", color: "bg-slate-400" },
  { value: "horror", label: "Horror", color: "bg-[rgba(29,29,31,0.34)]" },
  { value: "mystery", label: "Mystery", color: "bg-[rgba(79,70,229,0.34)]" },
  { value: "scifi", label: "Sci-Fi", color: "bg-[rgba(8,145,178,0.34)]" },
  {
    value: "slice-of-life",
    label: "Slice of Life",
    color: "bg-[rgba(10,125,92,0.34)]",
  },
  { value: "sports", label: "Sports", color: "bg-[rgba(56,89,214,0.28)]" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "ongoing", label: "Ongoing" },
  { value: "completed", label: "Completed" },
  { value: "hiatus", label: "On Hiatus" },
];

const SORT_OPTIONS = [
  { value: "relevance", label: "Best Match" },
  { value: "popular", label: "Most Popular" },
  { value: "latest", label: "Latest Updates" },
  { value: "alphabetical", label: "A-Z" },
];

const VALID_SORT_OPTIONS = new Set(SORT_OPTIONS.map((option) => option.value));

function buildFilters(initialFilters = {}) {
  return {
    types: initialFilters.types || [],
    tags: initialFilters.tags || [],
    status: initialFilters.status || "all",
    sortBy: VALID_SORT_OPTIONS.has(initialFilters.sortBy)
      ? initialFilters.sortBy
      : "relevance",
  };
}

const AdvancedFilterPanel = memo(function AdvancedFilterPanel({
  isOpen,
  onClose,
  onApply,
  initialFilters = {},
}) {
  const [filters, setFilters] = useState(() => buildFilters(initialFilters));

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setFilters(buildFilters(initialFilters));
  }, [initialFilters, isOpen]);

  const toggleType = (type) => {
    setFilters((prev) => ({
      ...prev,
      types: prev.types.includes(type)
        ? prev.types.filter((item) => item !== type)
        : [...prev.types, type],
    }));
  };

  const toggleTag = (tag) => {
    setFilters((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((item) => item !== tag)
        : [...prev.tags, tag],
    }));
  };

  const handleReset = () => {
    setFilters({
      types: [],
      tags: [],
      status: "all",
      sortBy: "relevance",
    });
  };

  const handleApply = () => {
    onApply?.(filters);
    onClose?.();
  };

  if (!isOpen) {
    return null;
  }

  const hasActiveFilters =
    filters.types.length > 0 ||
    filters.tags.length > 0 ||
    filters.status !== "all" ||
    filters.sortBy !== "relevance";

  return (
    <div className="fixed inset-0 z-50 bg-[rgba(15,23,42,0.18)] backdrop-blur-md">
      <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-[color:var(--gush-border)] bg-white px-4 pb-8 pt-6 shadow-[0_18px_42px_rgba(15,23,42,0.12)] md:left-auto md:right-0 md:top-0 md:max-h-none md:w-full md:max-w-md md:rounded-l-3xl md:rounded-tr-none md:border-l md:border-t-0 md:px-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950 md:text-xl">
              Filters
            </h2>
            <p className="mt-1 text-xs text-slate-500 md:text-sm">
              Narrow the list.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[color:var(--gush-border)] bg-white p-2 text-slate-400 transition-colors hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)] hover:text-slate-900"
            aria-label="Close advanced filters"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          <section>
            <label className="mb-3 block text-sm font-medium text-slate-700 md:text-base">
              Content Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              {TYPE_OPTIONS.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => toggleType(type.value)}
                  className={`min-h-[44px] rounded-xl border px-4 py-3 text-sm font-medium transition-colors active:scale-95 ${
                    filters.types.includes(type.value)
                      ? "border-[color:var(--gush-border-strong)] bg-[color:var(--gush-page-bg-muted)] text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.88)]"
                      : "border-[color:var(--gush-border)] bg-white text-[color:var(--gush-ink-soft)] hover:border-[color:var(--gush-border-strong)] hover:text-[color:var(--gush-ink)]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold">{type.icon}</span>
                    <span>{type.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section>
            <label className="mb-3 block text-sm font-medium text-slate-700 md:text-base">
              Genres
            </label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {TAG_OPTIONS.map((tag) => (
                <button
                  key={tag.value}
                  type="button"
                  onClick={() => toggleTag(tag.value)}
                  className={`min-h-[44px] rounded-lg border px-4 py-3 text-sm font-medium transition-colors active:scale-95 ${
                    filters.tags.includes(tag.value)
                      ? "border-[color:var(--gush-border-strong)] bg-[color:var(--gush-page-bg-muted)] text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.88)]"
                      : "border-[color:var(--gush-border)] bg-white text-[color:var(--gush-ink-soft)] hover:border-[color:var(--gush-border-strong)] hover:text-[color:var(--gush-ink)]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`h-3 w-3 rounded-full ${tag.color}`} />
                    <span className="truncate">{tag.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section>
            <label className="mb-3 block text-sm font-medium text-slate-700 md:text-base">
              Status
            </label>
            <div className="grid grid-cols-2 gap-3">
              {STATUS_OPTIONS.map((status) => (
                <button
                  key={status.value}
                  type="button"
                  onClick={() =>
                    setFilters((prev) => ({ ...prev, status: status.value }))
                  }
                  className={`min-h-[44px] rounded-lg border px-4 py-3 text-sm font-medium transition-colors active:scale-95 ${
                    filters.status === status.value
                      ? "border-[color:var(--gush-border-strong)] bg-[color:var(--gush-page-bg-muted)] text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.88)]"
                      : "border-[color:var(--gush-border)] bg-white text-[color:var(--gush-ink-soft)] hover:border-[color:var(--gush-border-strong)] hover:text-[color:var(--gush-ink)]"
                  }`}
                >
                  {status.label}
                </button>
              ))}
            </div>
          </section>

          <section>
            <label className="mb-3 block text-sm font-medium text-slate-700 md:text-base">
              Sort By
            </label>
            <select
              value={filters.sortBy}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, sortBy: event.target.value }))
              }
              className="w-full min-h-[44px] rounded-xl border border-[color:var(--gush-border)] bg-white px-4 py-3 text-sm text-slate-900 focus:border-[var(--gush-accent,#0071e3)] focus:outline-none md:text-base"
            >
              {SORT_OPTIONS.map((sort) => (
                <option key={sort.value} value={sort.value}>
                  {sort.label}
                </option>
              ))}
            </select>
          </section>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="min-h-[44px] flex-1 rounded-full border border-[color:var(--gush-border)] bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)] md:text-base"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="min-h-[44px] flex-1 rounded-full bg-[color:var(--gush-ink-strong)] px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(15,23,42,0.08)] hover:bg-black/82 active:scale-[0.99] md:text-base"
          >
            Apply
          </button>
        </div>

        {hasActiveFilters ? (
          <div className="mt-4 rounded-[22px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-4 py-3">
            <p className="text-xs font-medium text-slate-500">
              Active Filters:
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {filters.types.map((type) => (
                <span
                  key={type}
                  className="rounded-full border border-[color:var(--gush-border)] bg-white px-2.5 py-1 text-[10px] font-medium text-slate-700"
                >
                  {TYPE_OPTIONS.find((item) => item.value === type)?.label}
                </span>
              ))}
              {filters.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-[color:var(--gush-border)] bg-white px-2.5 py-1 text-[10px] font-medium text-slate-700"
                >
                  {TAG_OPTIONS.find((item) => item.value === tag)?.label}
                </span>
              ))}
              {filters.status !== "all" ? (
                <span className="rounded-full border border-[color:var(--gush-border)] bg-white px-2.5 py-1 text-[10px] font-medium text-slate-700">
                  {
                    STATUS_OPTIONS.find((item) => item.value === filters.status)
                      ?.label
                  }
                </span>
              ) : null}
              {filters.sortBy !== "relevance" ? (
                <span className="rounded-full border border-[color:var(--gush-border)] bg-white px-2.5 py-1 text-[10px] font-medium text-slate-700">
                  {
                    SORT_OPTIONS.find((item) => item.value === filters.sortBy)
                      ?.label
                  }
                </span>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
});

export default AdvancedFilterPanel;
