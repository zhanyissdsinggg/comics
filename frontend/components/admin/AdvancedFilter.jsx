"use client";

import { RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";

export function AdvancedFilter({
  onFilter = null,
  filters = [],
  loading = false,
}) {
  const [filterValues, setFilterValues] = useState({});
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleFilterChange = (filterId, value) => {
    const newValues = {
      ...filterValues,
      [filterId]: value,
    };
    setFilterValues(newValues);
  };

  const handleApplyFilter = () => {
    if (onFilter) {
      onFilter(filterValues);
    }
  };

  const handleResetFilter = () => {
    setFilterValues({});
    if (onFilter) {
      onFilter({});
    }
  };

  const hasActiveFilters = Object.values(filterValues).some((value) => {
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return value !== "" && value !== null && value !== undefined;
  });

  return (
    <div className="mb-6 space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search..."
            value={filterValues.search || ""}
            onChange={(e) => handleFilterChange("search", e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleApplyFilter();
              }
            }}
            className="w-full rounded border border-white/10 bg-neutral-900/50 px-4 py-2 text-white placeholder-neutral-500 focus:border-emerald-500/50 focus:outline-none"
          />
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-neutral-500" />
        </div>

        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="inline-flex items-center gap-2 rounded border border-white/10 bg-neutral-900/50 px-4 py-2 text-neutral-300 transition-colors hover:bg-white/5"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Advanced
        </button>

        <button
          type="button"
          onClick={handleApplyFilter}
          disabled={loading}
          className="rounded border border-emerald-500/30 bg-emerald-500/20 px-4 py-2 text-emerald-400 transition-colors hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Searching..." : "Search"}
        </button>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleResetFilter}
            className="inline-flex items-center gap-2 rounded border border-white/10 bg-neutral-900/50 px-4 py-2 text-neutral-300 transition-colors hover:bg-white/5"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
        )}
      </div>

      {showAdvanced && (
        <div className="space-y-4 rounded border border-white/10 bg-neutral-900/30 p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filters.map((filter) => (
              <div key={filter.id} className="space-y-2">
                <label className="text-sm font-medium text-neutral-300">
                  {filter.label}
                </label>

                {filter.type === "text" && (
                  <input
                    type="text"
                    placeholder={filter.placeholder}
                    value={filterValues[filter.id] || ""}
                    onChange={(e) => handleFilterChange(filter.id, e.target.value)}
                    className="w-full rounded border border-white/10 bg-neutral-900/50 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:border-emerald-500/50 focus:outline-none"
                  />
                )}

                {filter.type === "select" && (
                  <select
                    value={filterValues[filter.id] || ""}
                    onChange={(e) => handleFilterChange(filter.id, e.target.value)}
                    className="w-full rounded border border-white/10 bg-neutral-900/50 px-3 py-2 text-sm text-white focus:border-emerald-500/50 focus:outline-none"
                  >
                    <option value="">All</option>
                    {filter.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                )}

                {filter.type === "dateRange" && (
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={filterValues[`${filter.id}_start`] || ""}
                      onChange={(e) =>
                        handleFilterChange(`${filter.id}_start`, e.target.value)
                      }
                      className="flex-1 rounded border border-white/10 bg-neutral-900/50 px-3 py-2 text-sm text-white focus:border-emerald-500/50 focus:outline-none"
                    />
                    <input
                      type="date"
                      value={filterValues[`${filter.id}_end`] || ""}
                      onChange={(e) =>
                        handleFilterChange(`${filter.id}_end`, e.target.value)
                      }
                      className="flex-1 rounded border border-white/10 bg-neutral-900/50 px-3 py-2 text-sm text-white focus:border-emerald-500/50 focus:outline-none"
                    />
                  </div>
                )}

                {filter.type === "checkbox" && (
                  <div className="space-y-2">
                    {filter.options?.map((option) => (
                      <label key={option.value} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={(filterValues[filter.id] || []).includes(option.value)}
                          onChange={(e) => {
                            const current = filterValues[filter.id] || [];
                            const updated = e.target.checked
                              ? [...current, option.value]
                              : current.filter((v) => v !== option.value);
                            handleFilterChange(filter.id, updated);
                          }}
                          className="h-4 w-4 rounded border-white/20"
                        />
                        <span className="text-sm text-neutral-300">{option.label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={() => setShowAdvanced(false)}
              className="rounded border border-white/10 px-4 py-2 text-sm text-neutral-300 transition-colors hover:bg-white/5"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleResetFilter}
              className="rounded border border-white/10 px-4 py-2 text-sm text-neutral-300 transition-colors hover:bg-white/5"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={handleApplyFilter}
              disabled={loading}
              className="rounded border border-emerald-500/30 bg-emerald-500/20 px-4 py-2 text-sm text-emerald-400 transition-colors hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Searching..." : "Apply Filters"}
            </button>
          </div>
        </div>
      )}

      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(filterValues).map(([key, value]) => {
            if (!value || value === "" || (Array.isArray(value) && value.length === 0)) {
              return null;
            }

            const displayValue = Array.isArray(value) ? value.join(", ") : value;

            return (
              <div
                key={key}
                className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-sm text-emerald-400"
              >
                <span>{displayValue}</span>
                <button
                  type="button"
                  onClick={() => handleFilterChange(key, "")}
                  className="hover:text-emerald-300"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
