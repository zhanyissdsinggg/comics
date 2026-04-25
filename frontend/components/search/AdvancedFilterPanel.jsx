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
    <div className="fixed inset-0 z-50 bg-black/35 backdrop-blur-[6px]">
      <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-[32px] border border-black/10 border-b-0 bg-[linear-gradient(180deg,#ffffff_0%,#fafbfc_100%)] px-4 pb-8 pt-6 shadow-[0_-20px_48px_rgba(15,23,42,0.16)] md:left-auto md:right-0 md:top-0 md:max-h-none md:w-full md:max-w-md md:rounded-l-[32px] md:rounded-tr-none md:border-b md:border-r-0 md:px-6 md:shadow-[-20px_0_48px_rgba(15,23,42,0.12)]">
        <div className="mb-6 flex items-start justify-between gap-4 border-b border-black/8 pb-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-black/45">
              Search setup
            </p>
            <h2 className="mt-2 text-xl font-black uppercase tracking-[0.08em] text-black md:text-2xl">
              Filters
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white text-black transition-[background-color,border-color,box-shadow,transform] duration-200 hover:border-black/16 hover:bg-black/[0.03] hover:shadow-[0_10px_20px_rgba(15,23,42,0.08)] active:translate-y-px"
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

        <div className="space-y-7">
          <section>
            <label className="mb-3 block text-[11px] font-black uppercase tracking-[0.2em] text-black/55 md:text-xs">
              Content Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              {TYPE_OPTIONS.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => toggleType(type.value)}
                  className={`min-h-[52px] rounded-[22px] border px-4 py-3 text-sm font-semibold uppercase tracking-[0.08em] transition-[background-color,border-color,box-shadow,transform] duration-200 active:translate-y-px ${
                    filters.types.includes(type.value)
                      ? "border-black/12 bg-[#f6f7f9] text-black shadow-[0_12px_24px_rgba(15,23,42,0.08)]"
                      : "border-black/10 bg-white text-black/65 hover:border-black/16 hover:bg-black/[0.03] hover:text-black hover:shadow-[0_10px_20px_rgba(15,23,42,0.08)]"
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
            <label className="mb-3 block text-[11px] font-black uppercase tracking-[0.2em] text-black/55 md:text-xs">
              Genres
            </label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {TAG_OPTIONS.map((tag) => (
                <button
                  key={tag.value}
                  type="button"
                  onClick={() => toggleTag(tag.value)}
                  className={`min-h-[52px] rounded-[20px] border px-4 py-3 text-sm font-semibold transition-[background-color,border-color,box-shadow,transform] duration-200 active:translate-y-px ${
                    filters.tags.includes(tag.value)
                      ? "border-black bg-black text-white shadow-[0_12px_24px_rgba(15,23,42,0.16)]"
                      : "border-black/10 bg-white text-black/65 hover:border-black/16 hover:bg-black/[0.03] hover:text-black hover:shadow-[0_10px_20px_rgba(15,23,42,0.08)]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-3.5 w-3.5 rounded-full border border-black ${tag.color}`}
                    />
                    <span className="truncate">{tag.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section>
            <label className="mb-3 block text-[11px] font-black uppercase tracking-[0.2em] text-black/55 md:text-xs">
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
                  className={`min-h-[52px] rounded-[20px] border px-4 py-3 text-sm font-semibold uppercase tracking-[0.06em] transition-[background-color,border-color,box-shadow,transform] duration-200 active:translate-y-px ${
                    filters.status === status.value
                      ? "border-sky-200/70 bg-sky-50 text-slate-700 shadow-[0_12px_24px_rgba(125,211,252,0.16)]"
                      : "border-black/10 bg-white text-black/65 hover:border-black/16 hover:bg-black/[0.03] hover:text-black hover:shadow-[0_10px_20px_rgba(15,23,42,0.08)]"
                  }`}
                >
                  {status.label}
                </button>
              ))}
            </div>
          </section>

          <section>
            <label className="mb-3 block text-[11px] font-black uppercase tracking-[0.2em] text-black/55 md:text-xs">
              Sort By
            </label>
            <select
              value={filters.sortBy}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, sortBy: event.target.value }))
              }
              className="w-full min-h-[52px] rounded-[20px] border border-black/10 bg-white px-4 py-3 text-sm font-medium text-black shadow-[0_10px_20px_rgba(15,23,42,0.06)] focus:border-black/16 focus:outline-none focus:shadow-[0_12px_24px_rgba(15,23,42,0.08)] md:text-base"
            >
              {SORT_OPTIONS.map((sort) => (
                <option key={sort.value} value={sort.value}>
                  {sort.label}
                </option>
              ))}
            </select>
          </section>
        </div>

        <div className="mt-7 flex gap-3 border-t border-black/8 pt-5">
          <button
            type="button"
            onClick={handleReset}
            className="min-h-[50px] flex-1 rounded-full border border-black/10 bg-white px-4 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-black shadow-[0_10px_20px_rgba(15,23,42,0.06)] transition-[background-color,border-color,box-shadow,transform] duration-200 hover:border-black/16 hover:bg-black/[0.03] hover:shadow-[0_12px_24px_rgba(15,23,42,0.08)] active:translate-y-px md:text-base"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="min-h-[50px] flex-1 rounded-full border border-black bg-black px-4 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-white shadow-[0_12px_24px_rgba(15,23,42,0.16)] transition-[background-color,box-shadow,transform] duration-200 hover:bg-black/90 hover:shadow-[0_10px_20px_rgba(15,23,42,0.14)] active:translate-y-px md:text-base"
          >
            Apply
          </button>
        </div>

        {hasActiveFilters ? (
          <div className="mt-4 rounded-[24px] border border-black/10 bg-white px-4 py-3 shadow-[0_12px_24px_rgba(15,23,42,0.08)]">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-black/45">
              Active
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {filters.types.map((type) => (
                <span
                  key={type}
                  className="rounded-full border border-black/10 bg-[#f6f7f9] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-black"
                >
                  {TYPE_OPTIONS.find((item) => item.value === type)?.label}
                </span>
              ))}
              {filters.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-sky-200/70 bg-sky-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-700"
                >
                  {TAG_OPTIONS.find((item) => item.value === tag)?.label}
                </span>
              ))}
              {filters.status !== "all" ? (
                <span className="rounded-full border border-amber-200/70 bg-amber-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-black">
                  {
                    STATUS_OPTIONS.find((item) => item.value === filters.status)
                      ?.label
                  }
                </span>
              ) : null}
              {filters.sortBy !== "relevance" ? (
                <span className="rounded-full border border-black/10 bg-[#f3f4f6] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-black">
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
