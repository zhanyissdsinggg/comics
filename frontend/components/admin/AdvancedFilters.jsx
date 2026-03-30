"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Filter, X } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "Ongoing", label: "Ongoing" },
  { value: "Completed", label: "Completed" },
  { value: "Hiatus", label: "Hiatus" },
];

const PUBLISH_OPTIONS = [
  { value: "all", label: "All" },
  { value: "published", label: "Published" },
  { value: "unpublished", label: "Drafts" },
];

const ADULT_OPTIONS = [
  { value: "all", label: "All audiences" },
  { value: "adult", label: "18+" },
  { value: "general", label: "General" },
];

const SORT_OPTIONS = [
  { value: "createdAt_desc", label: "Newest created" },
  { value: "createdAt_asc", label: "Oldest created" },
  { value: "updatedAt_desc", label: "Recently updated" },
  { value: "updatedAt_asc", label: "Least recently updated" },
  { value: "episodeCount_desc", label: "Most episodes" },
  { value: "episodeCount_asc", label: "Fewest episodes" },
  { value: "title_asc", label: "Title A-Z" },
  { value: "title_desc", label: "Title Z-A" },
];

const DEFAULT_FILTERS = {
  status: "all",
  publishStatus: "all",
  adultContent: "all",
  sortBy: "createdAt_desc",
};

function FilterChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
        active
          ? "border border-[rgba(47,88,198,0.14)] bg-[rgba(47,88,198,0.08)] text-[var(--gush-accent,#2f58c6)]"
          : "border border-black/8 bg-white text-slate-600 hover:border-black/12 hover:bg-[rgba(250,248,244,0.96)] hover:text-slate-950"
      }`}
    >
      {children}
    </button>
  );
}

export default function AdvancedFilters({ filters, onFiltersChange }) {
  const [isOpen, setIsOpen] = useState(false);

  const resolvedFilters = useMemo(
    () => ({
      ...DEFAULT_FILTERS,
      ...filters,
    }),
    [filters],
  );

  const activeFiltersCount = Object.entries(resolvedFilters).filter(([key, value]) => {
    if (key === "sortBy") {
      return value !== DEFAULT_FILTERS.sortBy;
    }

    return value !== "all";
  }).length;

  const handleFilterChange = (key, value) => {
    onFiltersChange({
      ...resolvedFilters,
      [key]: value,
    });
  };

  const handleReset = () => {
    onFiltersChange(DEFAULT_FILTERS);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className={`flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition ${
          activeFiltersCount > 0
            ? "border-[rgba(47,88,198,0.14)] bg-[rgba(47,88,198,0.08)] text-[var(--gush-accent,#2f58c6)]"
            : "border-black/8 bg-white text-slate-600 hover:border-black/12 hover:bg-[rgba(250,248,244,0.96)] hover:text-slate-950"
        }`}
      >
        <Filter size={14} />
        <span>Filters</span>
        {activeFiltersCount > 0 ? (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--gush-accent,#2f58c6)] text-[10px] text-white">
            {activeFiltersCount}
          </span>
        ) : null}
        <ChevronDown size={14} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-[22rem]">
            <div className="rounded-[28px] border border-black/8 bg-white/96 p-6 shadow-[var(--gush-shadow-panel)] backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-950">Refine this list</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Keep the catalog readable and easy to review.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-black/8 bg-[rgba(250,247,241,0.9)] text-slate-500 transition hover:border-black/12 hover:bg-white hover:text-slate-950"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Status
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {STATUS_OPTIONS.map((option) => (
                      <FilterChip
                        key={option.value}
                        active={resolvedFilters.status === option.value}
                        onClick={() => handleFilterChange("status", option.value)}
                      >
                        {option.label}
                      </FilterChip>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Visibility
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {PUBLISH_OPTIONS.map((option) => (
                      <FilterChip
                        key={option.value}
                        active={resolvedFilters.publishStatus === option.value}
                        onClick={() => handleFilterChange("publishStatus", option.value)}
                      >
                        {option.label}
                      </FilterChip>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Audience
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {ADULT_OPTIONS.map((option) => (
                      <FilterChip
                        key={option.value}
                        active={resolvedFilters.adultContent === option.value}
                        onClick={() => handleFilterChange("adultContent", option.value)}
                      >
                        {option.label}
                      </FilterChip>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Sort
                  </label>
                  <select
                    value={resolvedFilters.sortBy}
                    onChange={(event) => handleFilterChange("sortBy", event.target.value)}
                    className="h-11 w-full rounded-full border border-black/8 bg-[rgba(250,247,241,0.9)] px-4 text-sm text-slate-900 outline-none transition focus:border-[var(--gush-accent,#2f58c6)]"
                  >
                    {SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex-1 rounded-full border border-black/8 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[rgba(250,248,244,0.96)]"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
