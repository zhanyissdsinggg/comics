"use client";

import { useState } from "react";
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
  { value: "unpublished", label: "Unpublished" },
];

const ADULT_OPTIONS = [
  { value: "all", label: "All" },
  { value: "adult", label: "Adult" },
  { value: "general", label: "General" },
];

const SORT_OPTIONS = [
  { value: "createdAt_desc", label: "Created date (newest first)" },
  { value: "createdAt_asc", label: "Created date (oldest first)" },
  { value: "updatedAt_desc", label: "Updated date (newest first)" },
  { value: "updatedAt_asc", label: "Updated date (oldest first)" },
  { value: "title_asc", label: "Title (A-Z)" },
  { value: "title_desc", label: "Title (Z-A)" },
];

const DEFAULT_FILTERS = {
  status: "all",
  publishStatus: "all",
  adultContent: "all",
  sortBy: "createdAt_desc",
};

export default function AdvancedFilters({ filters, onFiltersChange }) {
  const [isOpen, setIsOpen] = useState(false);

  const resolvedFilters = {
    ...DEFAULT_FILTERS,
    ...filters,
  };

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
        className={`flex items-center gap-2 rounded-4xl border px-5 py-2.5 text-xs font-bold transition-all duration-300 hover:scale-105 hover:shadow-ios-sm active:scale-95 ${
          activeFiltersCount > 0
            ? "border-ios-green/30 bg-ios-green/10 text-ios-green shadow-ios-sm"
            : "border-ios-gray-700 bg-ios-gray-800/50 text-ios-gray-400 hover:bg-ios-gray-800 hover:text-neutral-200"
        }`}
      >
        <Filter size={14} />
        <span>Filters</span>
        {activeFiltersCount > 0 ? (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ios-green text-[10px] text-white">
            {activeFiltersCount}
          </span>
        ) : null}
        <ChevronDown size={14} className={`transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-80 animate-scale-in">
            <div className="rounded-5xl border border-ios-gray-800 bg-neutral-900/95 p-6 shadow-ios-xl backdrop-blur-2xl">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-bold text-neutral-100">Advanced Filters</h3>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-ios-gray-800 text-ios-gray-400 transition-all duration-300 hover:bg-ios-gray-700 hover:text-neutral-200 active:scale-95"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-ios-green/60">
                    Status
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {STATUS_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleFilterChange("status", option.value)}
                        className={`rounded-3xl px-3 py-2 text-xs font-medium transition-all duration-300 ${
                          resolvedFilters.status === option.value
                            ? "bg-ios-green/20 text-ios-green shadow-ios-sm"
                            : "bg-ios-gray-800/50 text-ios-gray-400 hover:bg-ios-gray-800 hover:text-neutral-200"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-ios-green/60">
                    Publish status
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {PUBLISH_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleFilterChange("publishStatus", option.value)}
                        className={`rounded-3xl px-3 py-2 text-xs font-medium transition-all duration-300 ${
                          resolvedFilters.publishStatus === option.value
                            ? "bg-ios-green/20 text-ios-green shadow-ios-sm"
                            : "bg-ios-gray-800/50 text-ios-gray-400 hover:bg-ios-gray-800 hover:text-neutral-200"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-ios-green/60">
                    Content rating
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {ADULT_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleFilterChange("adultContent", option.value)}
                        className={`rounded-3xl px-3 py-2 text-xs font-medium transition-all duration-300 ${
                          resolvedFilters.adultContent === option.value
                            ? "bg-ios-green/20 text-ios-green shadow-ios-sm"
                            : "bg-ios-gray-800/50 text-ios-gray-400 hover:bg-ios-gray-800 hover:text-neutral-200"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-ios-green/60">
                    Sort order
                  </label>
                  <select
                    value={resolvedFilters.sortBy}
                    onChange={(event) => handleFilterChange("sortBy", event.target.value)}
                    className="w-full rounded-3xl border border-ios-gray-700 bg-ios-gray-800/50 px-4 py-2.5 text-sm text-neutral-200 transition-all duration-300 focus:border-ios-green/50 focus:outline-none focus:ring-2 focus:ring-ios-green/20"
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
                  className="flex-1 rounded-3xl border border-ios-gray-700 bg-ios-gray-800/50 px-4 py-2.5 text-xs font-bold text-ios-gray-400 transition-all duration-300 hover:bg-ios-gray-800 hover:text-neutral-200 active:scale-95"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 rounded-3xl border border-ios-green/20 bg-ios-green/10 px-4 py-2.5 text-xs font-bold text-ios-green transition-all duration-300 hover:bg-ios-green/20 hover:scale-105 hover:shadow-ios-sm active:scale-95"
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
