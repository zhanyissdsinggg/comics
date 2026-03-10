"use client";

import { memo, useEffect, useState } from "react";

const TYPE_OPTIONS = [
  { value: "comic", label: "Comic", icon: "CM" },
  { value: "novel", label: "Novel", icon: "NV" },
  { value: "webtoon", label: "Webtoon", icon: "WT" },
  { value: "manga", label: "Manga", icon: "MG" },
];

const TAG_OPTIONS = [
  { value: "romance", label: "Romance", color: "bg-pink-500" },
  { value: "action", label: "Action", color: "bg-red-500" },
  { value: "fantasy", label: "Fantasy", color: "bg-purple-500" },
  { value: "comedy", label: "Comedy", color: "bg-yellow-500" },
  { value: "drama", label: "Drama", color: "bg-blue-500" },
  { value: "horror", label: "Horror", color: "bg-gray-500" },
  { value: "mystery", label: "Mystery", color: "bg-indigo-500" },
  { value: "scifi", label: "Sci-Fi", color: "bg-cyan-500" },
  { value: "slice-of-life", label: "Slice of Life", color: "bg-green-500" },
  { value: "sports", label: "Sports", color: "bg-orange-500" },
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
  { value: "rating", label: "Highest Rated" },
  { value: "latest", label: "Latest Updates" },
  { value: "alphabetical", label: "A-Z" },
];

function buildFilters(initialFilters = {}) {
  return {
    types: initialFilters.types || [],
    tags: initialFilters.tags || [],
    status: initialFilters.status || "all",
    sortBy: initialFilters.sortBy || "relevance",
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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm">
      <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-neutral-800 bg-neutral-950 px-4 pb-8 pt-6 shadow-2xl md:left-auto md:right-0 md:top-0 md:max-h-none md:w-full md:max-w-md md:rounded-l-3xl md:rounded-tr-none md:border-l md:border-t-0 md:px-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white md:text-xl">Advanced Filters</h2>
            <p className="mt-1 text-xs text-neutral-400 md:text-sm">
              Refine the catalog with real filters that map to search results.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-neutral-400 transition-colors hover:bg-neutral-900 hover:text-white"
            aria-label="Close advanced filters"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          <section>
            <label className="mb-3 block text-sm font-medium text-neutral-300 md:text-base">Content Type</label>
            <div className="grid grid-cols-2 gap-3">
              {TYPE_OPTIONS.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => toggleType(type.value)}
                  className={`min-h-[44px] rounded-xl border px-4 py-3 text-sm font-medium transition-colors active:scale-95 ${
                    filters.types.includes(type.value)
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                      : "border-neutral-800 bg-neutral-900/50 text-neutral-400 hover:border-neutral-700 hover:text-neutral-300"
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
            <label className="mb-3 block text-sm font-medium text-neutral-300 md:text-base">Genres</label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {TAG_OPTIONS.map((tag) => (
                <button
                  key={tag.value}
                  type="button"
                  onClick={() => toggleTag(tag.value)}
                  className={`min-h-[44px] rounded-lg border px-4 py-3 text-sm font-medium transition-colors active:scale-95 ${
                    filters.tags.includes(tag.value)
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                      : "border-neutral-800 bg-neutral-900/50 text-neutral-400 hover:border-neutral-700 hover:text-neutral-300"
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
            <label className="mb-3 block text-sm font-medium text-neutral-300 md:text-base">Status</label>
            <div className="grid grid-cols-2 gap-3">
              {STATUS_OPTIONS.map((status) => (
                <button
                  key={status.value}
                  type="button"
                  onClick={() => setFilters((prev) => ({ ...prev, status: status.value }))}
                  className={`min-h-[44px] rounded-lg border px-4 py-3 text-sm font-medium transition-colors active:scale-95 ${
                    filters.status === status.value
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                      : "border-neutral-800 bg-neutral-900/50 text-neutral-400 hover:border-neutral-700 hover:text-neutral-300"
                  }`}
                >
                  {status.label}
                </button>
              ))}
            </div>
          </section>

          <section>
            <label className="mb-3 block text-sm font-medium text-neutral-300 md:text-base">Sort By</label>
            <select
              value={filters.sortBy}
              onChange={(event) => setFilters((prev) => ({ ...prev, sortBy: event.target.value }))}
              className="w-full min-h-[44px] rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-white focus:border-emerald-500 focus:outline-none md:text-base"
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
            className="min-h-[44px] flex-1 rounded-full border border-neutral-700 px-4 py-3 text-sm font-medium text-neutral-300 hover:bg-neutral-900 active:bg-neutral-800 md:text-base"
          >
            Reset All
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="min-h-[44px] flex-1 rounded-full bg-emerald-500 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-600 active:bg-emerald-700 md:text-base"
          >
            Apply Filters
          </button>
        </div>

        {hasActiveFilters ? (
          <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-900/50 px-4 py-3">
            <p className="text-xs font-medium text-neutral-400">Active Filters:</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {filters.types.map((type) => (
                <span key={type} className="rounded-full bg-emerald-500/20 px-2 py-1 text-[10px] text-emerald-400">
                  {TYPE_OPTIONS.find((item) => item.value === type)?.label}
                </span>
              ))}
              {filters.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-emerald-500/20 px-2 py-1 text-[10px] text-emerald-400">
                  {TAG_OPTIONS.find((item) => item.value === tag)?.label}
                </span>
              ))}
              {filters.status !== "all" ? (
                <span className="rounded-full bg-emerald-500/20 px-2 py-1 text-[10px] text-emerald-400">
                  {STATUS_OPTIONS.find((item) => item.value === filters.status)?.label}
                </span>
              ) : null}
              {filters.sortBy !== "relevance" ? (
                <span className="rounded-full bg-emerald-500/20 px-2 py-1 text-[10px] text-emerald-400">
                  {SORT_OPTIONS.find((item) => item.value === filters.sortBy)?.label}
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