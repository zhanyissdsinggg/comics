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
      <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-[32px] border-[3px] border-b-0 border-black bg-[#fffdf7] px-4 pb-8 pt-6 shadow-[0_-8px_0_0_rgba(0,0,0,1)] md:left-auto md:right-0 md:top-0 md:max-h-none md:w-full md:max-w-md md:rounded-l-[32px] md:rounded-tr-none md:border-b-[3px] md:border-r-0 md:px-6 md:shadow-[-8px_0_0_0_rgba(0,0,0,1)]">
        <div className="mb-6 flex items-start justify-between gap-4 border-b-[3px] border-black pb-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-black/45">
              Search setup
            </p>
            <h2 className="mt-2 text-xl font-black uppercase tracking-[0.08em] text-black md:text-2xl">
              Filters
            </h2>
            <p className="mt-2 text-sm text-black/60 md:text-[15px]">
              Keep the list tight and skip the noise.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-black bg-white text-black transition duration-200 hover:bg-[#ffe500]"
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
                  className={`min-h-[52px] rounded-[22px] border-[3px] px-4 py-3 text-sm font-semibold uppercase tracking-[0.08em] transition active:scale-95 ${
                    filters.types.includes(type.value)
                      ? "border-black bg-[#ffe500] text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
                      : "border-black bg-white text-black/65 hover:-translate-y-0.5 hover:bg-[#fff1f7] hover:text-black"
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
                  className={`min-h-[52px] rounded-[20px] border-[3px] px-4 py-3 text-sm font-semibold transition active:scale-95 ${
                    filters.tags.includes(tag.value)
                      ? "border-black bg-[#ff007a] text-white shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
                      : "border-black bg-white text-black/65 hover:-translate-y-0.5 hover:bg-[#eefcff] hover:text-black"
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
                  className={`min-h-[52px] rounded-[20px] border-[3px] px-4 py-3 text-sm font-semibold uppercase tracking-[0.06em] transition active:scale-95 ${
                    filters.status === status.value
                      ? "border-black bg-[#00e5ff] text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
                      : "border-black bg-white text-black/65 hover:-translate-y-0.5 hover:bg-[#fff7cf] hover:text-black"
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
              className="w-full min-h-[52px] rounded-[20px] border-[3px] border-black bg-white px-4 py-3 text-sm font-medium text-black focus:outline-none md:text-base"
            >
              {SORT_OPTIONS.map((sort) => (
                <option key={sort.value} value={sort.value}>
                  {sort.label}
                </option>
              ))}
            </select>
          </section>
        </div>

        <div className="mt-7 flex gap-3 border-t-[3px] border-black pt-5">
          <button
            type="button"
            onClick={handleReset}
            className="min-h-[50px] flex-1 rounded-full border-[3px] border-black bg-white px-4 py-3 text-sm font-bold uppercase tracking-[0.08em] text-black transition hover:bg-[#f3f0ea] md:text-base"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="min-h-[50px] flex-1 rounded-full border-[3px] border-black bg-[#ff007a] px-4 py-3 text-sm font-black uppercase tracking-[0.08em] text-white shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] active:scale-[0.99] md:text-base"
          >
            Apply
          </button>
        </div>

        {hasActiveFilters ? (
          <div className="mt-4 rounded-[24px] border-[3px] border-black bg-white px-4 py-3 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-black/45">
              Active Filters:
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {filters.types.map((type) => (
                <span
                  key={type}
                  className="rounded-full border-[2px] border-black bg-[#fff1f7] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-black"
                >
                  {TYPE_OPTIONS.find((item) => item.value === type)?.label}
                </span>
              ))}
              {filters.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border-[2px] border-black bg-[#eefcff] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-black"
                >
                  {TAG_OPTIONS.find((item) => item.value === tag)?.label}
                </span>
              ))}
              {filters.status !== "all" ? (
                <span className="rounded-full border-[2px] border-black bg-[#fff7cf] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-black">
                  {
                    STATUS_OPTIONS.find((item) => item.value === filters.status)
                      ?.label
                  }
                </span>
              ) : null}
              {filters.sortBy !== "relevance" ? (
                <span className="rounded-full border-[2px] border-black bg-[#f3f0ea] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-black">
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
