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
}) {
  const [showAllGenres, setShowAllGenres] = useState(false);
  const isLight = appearance === "light";

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

  const filterSectionClass =
    isLight
      ? "rounded-[20px] border border-black/6 bg-white/78 px-4 py-3"
      : "rounded-[24px] border border-white/10 bg-black/20 px-4 py-4 shadow-[0_18px_50px_rgba(0,0,0,0.14)]";

  return (
    <div className="space-y-2.5">
      {activeFilterCount > 0 && typeof onReset === "function" ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onReset}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition-colors ${
              isLight
                ? "border-black/8 bg-white text-slate-700 hover:border-black/12 hover:bg-[#f8f9fc]"
                : "border-white/10 bg-black/20 text-neutral-200 hover:border-white/20 hover:bg-white/[0.08]"
            }`}
          >
            <RotateCcw size={14} />
            Reset
          </button>
        </div>
      ) : null}

      <div className={cn("grid gap-2.5", genres.length > 0 ? "xl:grid-cols-[0.92fr_0.92fr_1.16fr]" : "xl:grid-cols-2")}>
        <div className={filterSectionClass}>
          <p className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${isLight ? "text-slate-500" : "text-neutral-400"}`}>
            Sort
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {sortOptions.map((option) => (
              <div key={option.id}>
                <Chip
                  label={option.label}
                  active={sortBy === option.id}
                  onClick={() => handleSortChange(option.id)}
                  appearance={appearance}
                  className={cn("tracking-[0.16em]", sortBy === option.id && !isLight ? "text-white" : "")}
                />
              </div>
            ))}
          </div>
        </div>

        <div className={filterSectionClass}>
          <p className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${isLight ? "text-slate-500" : "text-neutral-400"}`}>
            Status
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {statusOptions.map((option) => (
              <div key={option.id}>
                <Chip
                  label={option.label}
                  active={status === option.id}
                  onClick={() => handleStatusChange(option.id)}
                  appearance={appearance}
                />
              </div>
            ))}
          </div>
        </div>

        {genres.length > 0 ? (
          <div className={filterSectionClass}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${isLight ? "text-slate-500" : "text-neutral-400"}`}>
                  Genres
                </p>
              </div>
              {genres.length > 8 ? (
                <button
                  type="button"
                  onClick={() => setShowAllGenres(!showAllGenres)}
                  className={`rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition-colors ${
                    isLight
                      ? "border-black/8 bg-white text-slate-500 hover:border-black/12 hover:bg-[rgba(246,243,237,0.92)]"
                      : "border-white/10 bg-white/[0.04] text-neutral-300 hover:border-white/20 hover:bg-white/[0.08]"
                  }`}
                >
                  {showAllGenres ? "Show less" : `Show all ${genres.length}`}
                </button>
              ) : null}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Chip
                label="All"
                active={selectedGenre === "all"}
                onClick={() => handleGenreChange("all")}
                appearance={appearance}
              />
              {displayedGenres.map((genre) => (
                <Chip
                  key={genre}
                  label={genre}
                  active={selectedGenre === genre}
                  onClick={() => handleGenreChange(genre)}
                  appearance={appearance}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
