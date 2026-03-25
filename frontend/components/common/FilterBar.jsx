/**
 * FilterBar keeps series filters and sort controls together.
 */

"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
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
  onReset,
  appearance = "default",
  density = "default",
}) {
  const [showAllGenres, setShowAllGenres] = useState(false);
  const isLight = appearance === "light";
  const isQuiet = density === "quiet";

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

  const handleSortChange = (id) => {
    if (onSortChange) onSortChange(id);
  };

  const handleStatusChange = (id) => {
    if (onStatusChange) onStatusChange(id);
  };

  const handleGenreChange = (genre) => {
    if (onGenreChange) onGenreChange(genre);
  };

  const filterShellClass =
    isLight
      ? isQuiet
        ? "rounded-[20px] border border-black/6 bg-white/66 px-3.5 py-3 shadow-[0_8px_20px_rgba(15,23,42,0.03)]"
        : "rounded-[22px] border border-black/6 bg-white/78 px-4 py-3.5 shadow-[0_12px_28px_rgba(15,23,42,0.04)]"
      : "rounded-[24px] border border-white/10 bg-black/20 px-4 py-4 shadow-[0_18px_50px_rgba(0,0,0,0.14)]";
  const labelClass = isLight ? "text-slate-500" : "text-neutral-400";
  const subtleButtonClass = isLight
    ? "border-black/8 bg-white text-slate-500 hover:border-black/12 hover:bg-[#f8f9fc] hover:text-slate-900"
    : "border-white/10 bg-white/[0.04] text-neutral-300 hover:border-white/20 hover:bg-white/[0.08] hover:text-white";
  const sectionLabelClass = cn(
    "font-semibold uppercase",
    isQuiet ? "text-[10px] tracking-[0.18em]" : "text-[11px] tracking-[0.24em]",
    labelClass,
  );
  const chipClassName = isQuiet ? "px-3 py-1.5 text-[11px]" : "";
  const showHeaderRow = !isQuiet || activeFilterCount > 0;

  return (
    <div className={filterShellClass}>
      {showHeaderRow ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {!isQuiet ? (
            <div className="flex flex-wrap items-center gap-2.5">
              <p className={cn("text-[11px] font-semibold uppercase tracking-[0.24em]", labelClass)}>Refine</p>
              {activeFilterCount > 0 ? (
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                    isLight ? "border-black/8 bg-white text-slate-500" : "border-white/10 bg-white/[0.04] text-neutral-300",
                  )}
                >
                  {activeFilterCount} active
                </span>
              ) : null}
            </div>
          ) : activeFilterCount > 0 ? (
            <span
              className={cn(
                "rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]",
                isLight ? "border-black/8 bg-white text-slate-400" : "border-white/10 bg-white/[0.04] text-neutral-300",
              )}
            >
              {activeFilterCount} active
            </span>
          ) : (
            <span className="sr-only">Filters</span>
          )}

          {activeFilterCount > 0 && typeof onReset === "function" ? (
            <button
              type="button"
              onClick={onReset}
              className={`inline-flex items-center gap-2 rounded-full border ${isQuiet ? "px-3 py-1.5 text-[11px]" : "px-4 py-2 text-xs uppercase tracking-[0.16em]"} font-semibold transition-colors ${
                isLight
                  ? "border-black/8 bg-white text-slate-700 hover:border-black/12 hover:bg-[#f8f9fc]"
                  : "border-white/10 bg-black/20 text-neutral-200 hover:border-white/20 hover:bg-white/[0.08]"
              }`}
            >
              <RotateCcw size={14} />
              Reset
            </button>
          ) : null}
        </div>
      ) : null}

      <div className={cn(showHeaderRow ? "mt-3" : "", isQuiet ? "space-y-2.5" : "space-y-3")}>
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className={sectionLabelClass}>Sort</span>
            {sortOptions.map((option) => (
              <Chip
                key={option.id}
                label={option.label}
                active={sortBy === option.id}
                onClick={() => handleSortChange(option.id)}
                appearance={appearance}
                className={cn(chipClassName, "tracking-[0.16em]", sortBy === option.id && !isLight ? "text-white" : "")}
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <span className={sectionLabelClass}>Status</span>
            {statusOptions.map((option) => (
              <Chip
                key={option.id}
                label={option.label}
                active={status === option.id}
                onClick={() => handleStatusChange(option.id)}
                appearance={appearance}
                className={chipClassName}
              />
            ))}
          </div>
        </div>

        {genres.length > 0 ? (
          <div
            className={cn(
              `${isQuiet ? "space-y-2.5 pt-2.5" : "space-y-3 pt-3"} border-t`,
              isLight ? "border-black/6" : "border-white/10",
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className={sectionLabelClass}>Genres</p>
              {genres.length > 8 ? (
                <button
                  type="button"
                  onClick={() => setShowAllGenres(!showAllGenres)}
                  className={cn(
                    `rounded-full border ${isQuiet ? "px-3 py-1.5 text-[11px]" : "px-3 py-2 text-xs uppercase tracking-[0.16em]"} font-semibold transition-colors`,
                    subtleButtonClass,
                  )}
                >
                  {showAllGenres ? "Show less" : `Show all ${genres.length}`}
                </button>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <Chip
                label="All"
                active={selectedGenre === "all"}
                onClick={() => handleGenreChange("all")}
                appearance={appearance}
                className={chipClassName}
              />
              {displayedGenres.map((genre) => (
                <Chip
                  key={genre}
                  label={genre}
                  active={selectedGenre === genre}
                  onClick={() => handleGenreChange(genre)}
                  appearance={appearance}
                  className={chipClassName}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
