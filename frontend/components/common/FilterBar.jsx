/**
 * FilterBar keeps series filters and sort controls together.
 */

"use client";

import { useState } from "react";
import { ArrowDownUp, RotateCcw, SlidersHorizontal, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import Chip from "./Chip";

export default function FilterBar({
  genres = [],
  selectedGenre = "all",
  onGenreChange,
  sortBy = "popular",
  onSortChange,
  status = "all",
  onStatusChange,
  totalCount = 0,
  loading = false,
  onReset,
}) {
  const [showAllGenres, setShowAllGenres] = useState(false);

  const sortOptions = [
    { id: "popular", label: "Popular", icon: "Hot" },
    { id: "latest", label: "Latest", icon: "New" },
  ];

  const statusOptions = [
    { id: "all", label: "All" },
    { id: "ongoing", label: "Ongoing" },
    { id: "completed", label: "Completed" },
  ];

  const displayedGenres = showAllGenres ? genres : genres.slice(0, 8);
  const activeFilterCount = [
    selectedGenre !== "all" ? selectedGenre : "",
    sortBy !== "popular" ? sortBy : "",
    status !== "all" ? status : "",
  ].filter(Boolean).length;
  const statusLabel = statusOptions.find((option) => option.id === status)?.label || "All";
  const sortLabel = sortOptions.find((option) => option.id === sortBy)?.label || "Popular";
  const activeSummaries = [
    sortBy !== "popular" ? `Sort: ${sortLabel}` : "",
    status !== "all" ? `Status: ${statusLabel}` : "",
    selectedGenre !== "all" ? `Genre: ${selectedGenre}` : "",
  ].filter(Boolean);

  const handleSortChange = (id) => {
    if (onSortChange) onSortChange(id);
  };

  const handleStatusChange = (id) => {
    if (onStatusChange) onStatusChange(id);
  };

  const handleGenreChange = (genre) => {
    if (onGenreChange) onGenreChange(genre);
  };

  const filterSectionClass =
    "rounded-[24px] border border-white/10 bg-black/20 px-4 py-4 shadow-[0_18px_50px_rgba(0,0,0,0.14)]";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-300">
            <SlidersHorizontal size={14} className="text-emerald-200" />
            Browsing controls
          </div>
          <h3 className="mt-3 font-display text-xl font-semibold tracking-tight text-white sm:text-2xl">
            {loading ? "Refreshing the catalog..." : `${totalCount.toLocaleString()} titles ready to browse.`}
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeSummaries.length > 0 ? (
            activeSummaries.map((item) => (
              <span
                key={item}
                className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-300"
              >
                {item}
              </span>
            ))
          ) : (
            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/[0.08] px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-100">
              No filters active
            </span>
          )}

          {activeFilterCount > 0 && typeof onReset === "function" ? (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-200 transition-colors hover:border-white/20 hover:bg-white/[0.08]"
            >
              <RotateCcw size={14} />
              Reset
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-[0.92fr_0.92fr_1.16fr]">
        <div className={filterSectionClass}>
          <div className="flex items-center gap-2">
            <ArrowDownUp size={16} className="text-emerald-200" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-400">
              Sort order
            </p>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            {sortOptions.map((option) => (
              <div key={option.id}>
                <Chip
                  label={option.label}
                  active={sortBy === option.id}
                  onClick={() => handleSortChange(option.id)}
                  className={cn("tracking-[0.16em]", sortBy === option.id ? "text-white" : "")}
                />
                <p className="mt-1 text-[11px] text-neutral-500">{option.icon}</p>
              </div>
            ))}
          </div>
        </div>

        <div className={filterSectionClass}>
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-emerald-200" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-400">
              Release state
            </p>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            {statusOptions.map((option) => (
              <div key={option.id}>
                <Chip
                  label={option.label}
                  active={status === option.id}
                  onClick={() => handleStatusChange(option.id)}
                />
              </div>
            ))}
          </div>
        </div>

        {genres.length > 0 ? (
          <div className={filterSectionClass}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-400">
                  Genres
                </p>
              </div>
              {genres.length > 8 ? (
                <button
                  type="button"
                  onClick={() => setShowAllGenres(!showAllGenres)}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-300 transition-colors hover:border-white/20 hover:bg-white/[0.08]"
                >
                  {showAllGenres ? "Show less" : `Show all ${genres.length}`}
                </button>
              ) : null}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Chip
                label="All"
                active={selectedGenre === "all"}
                onClick={() => handleGenreChange("all")}
              />
              {displayedGenres.map((genre) => (
                <Chip
                  key={genre}
                  label={genre}
                  active={selectedGenre === genre}
                  onClick={() => handleGenreChange(genre)}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className={cn(filterSectionClass, "flex items-center")}>
            <p className="text-sm leading-7 text-neutral-500">
              Genre filters will appear automatically once this catalog has tagged titles to browse.
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-neutral-400">
        <p>{loading ? "Loading catalog signals..." : `${totalCount.toLocaleString()} series found`}</p>
        <p>
          {activeFilterCount > 0
            ? `${activeFilterCount} filter${activeFilterCount === 1 ? "" : "s"} active`
            : "Full catalog view"}
        </p>
      </div>
    </div>
  );
}
