"use client";

import { memo, useEffect, useState } from "react";
import {
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
} from "../common/StorefrontPagePrimitives";

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
  { value: "completed", label: "Finished" },
  { value: "hiatus", label: "On Hiatus" },
];

const SORT_OPTIONS = [
  { value: "relevance", label: "Best Match" },
  { value: "popular", label: "Popular This Week" },
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
      <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-[32px] border-2 border-black border-b-0 bg-[#0b0b0b] px-4 pb-8 pt-6 text-white shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] md:left-auto md:right-0 md:top-0 md:max-h-none md:w-full md:max-w-md md:rounded-l-[32px] md:rounded-tr-none md:border-b md:border-r-0 md:px-6">
        <div className="mb-6 flex items-start justify-between gap-4 border-b-2 border-black pb-5">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-white/65">
              Search setup
            </p>
            <h2 className="mt-2 text-xl font-black uppercase tracking-[0.08em] text-white md:text-2xl">
              Filters
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border-2 border-black bg-[#FFE500] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform duration-150 ease-out hover:translate-x-0.5 hover:translate-y-0.5 active:translate-y-px"
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
            <label className="mb-3 block text-[11px] font-black uppercase tracking-[0.2em] text-white/70 md:text-xs">
              Content Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              {TYPE_OPTIONS.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => toggleType(type.value)}
                  className={`min-h-[52px] rounded-[22px] border-2 border-black px-4 py-3 text-sm font-black uppercase tracking-[0.08em] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform duration-150 ease-out active:translate-y-px hover:translate-x-0.5 hover:translate-y-0.5 ${
                    filters.types.includes(type.value)
                      ? "bg-[#00E5FF] text-black"
                      : "bg-[#0b0b0b] text-white/85"
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
            <label className="mb-3 block text-[11px] font-black uppercase tracking-[0.2em] text-white/70 md:text-xs">
              Genres
            </label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {TAG_OPTIONS.map((tag) => (
                <button
                  key={tag.value}
                  type="button"
                  onClick={() => toggleTag(tag.value)}
                  className={`min-h-[52px] rounded-[20px] border-2 border-black px-4 py-3 text-sm font-black transition-transform duration-150 ease-out shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-px hover:translate-x-0.5 hover:translate-y-0.5 ${
                    filters.tags.includes(tag.value)
                      ? "bg-[#FF007A] text-white"
                      : "bg-[#0b0b0b] text-white/85"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-3.5 w-3.5 rounded-full border-2 border-black ${tag.color}`}
                    />
                    <span className="truncate">{tag.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section>
            <label className="mb-3 block text-[11px] font-black uppercase tracking-[0.2em] text-white/70 md:text-xs">
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
                  className={`min-h-[52px] rounded-[20px] border-2 border-black px-4 py-3 text-sm font-black uppercase tracking-[0.06em] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform duration-150 ease-out active:translate-y-px hover:translate-x-0.5 hover:translate-y-0.5 ${
                    filters.status === status.value
                      ? "bg-[#FFE500] text-black"
                      : "bg-[#0b0b0b] text-white/85"
                  }`}
                >
                  {status.label}
                </button>
              ))}
            </div>
          </section>

          <section>
            <label className="mb-3 block text-[11px] font-black uppercase tracking-[0.2em] text-white/70 md:text-xs">
              Sort By
            </label>
            <select
              value={filters.sortBy}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, sortBy: event.target.value }))
              }
              className="w-full min-h-[52px] rounded-[20px] border-2 border-black bg-[#080808] px-4 py-3 text-sm font-semibold text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFE500] md:text-base"
            >
              {SORT_OPTIONS.map((sort) => (
                <option key={sort.value} value={sort.value}>
                  {sort.label}
                </option>
              ))}
            </select>
          </section>
        </div>

        <div className="mt-7 flex gap-3 border-t-2 border-black pt-5">
          <button
            type="button"
            onClick={handleReset}
            className={`min-h-[50px] flex-1 ${storefrontSecondaryButtonClass} md:text-base`}
          >
            Reset
          </button>
          <button
            type="button"
            onClick={handleApply}
            className={`min-h-[50px] flex-1 ${storefrontPrimaryButtonClass} md:text-base`}
          >
            Apply
          </button>
        </div>

        {hasActiveFilters ? (
          <div className="mt-4 rounded-[22px] border-2 border-black bg-black px-4 py-3 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/70">
              Active
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {filters.types.map((type) => (
                <span
                  key={type}
                  className="rounded-full border-2 border-black bg-[#00E5FF] px-3 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                >
                  {TYPE_OPTIONS.find((item) => item.value === type)?.label}
                </span>
              ))}
              {filters.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border-2 border-black bg-[#FF007A] px-3 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                >
                  {TAG_OPTIONS.find((item) => item.value === tag)?.label}
                </span>
              ))}
              {filters.status !== "all" ? (
                <span className="rounded-full border-2 border-black bg-[#FFE500] px-3 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  {
                    STATUS_OPTIONS.find((item) => item.value === filters.status)
                      ?.label
                  }
                </span>
              ) : null}
              {filters.sortBy !== "relevance" ? (
                <span className="rounded-full border-2 border-black bg-[#00E5FF] px-3 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
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
