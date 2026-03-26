/**
 * FilterBar keeps series filters and sort controls together.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, RotateCcw } from "lucide-react";
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
  const [showGenrePicker, setShowGenrePicker] = useState(false);
  const genreMenuRef = useRef(null);
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

  const displayedGenres = showAllGenres ? genres : genres.slice(0, isQuiet ? 5 : 8);
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
    if (isQuiet) {
      setShowGenrePicker(false);
    }
    if (onGenreChange) onGenreChange(genre);
  };

  useEffect(() => {
    if (!showGenrePicker) {
      setShowAllGenres(false);
    }
  }, [showGenrePicker]);

  useEffect(() => {
    if (!isQuiet || !showGenrePicker) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!genreMenuRef.current?.contains(event.target)) {
        setShowGenrePicker(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setShowGenrePicker(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isQuiet, showGenrePicker]);

  const filterShellClass =
    isLight
      ? isQuiet
        ? "rounded-[18px] border border-black/5 bg-white/50 px-3 py-2.5 shadow-none backdrop-blur-[2px]"
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
  const visibleSectionLabelClass = isQuiet ? "sr-only" : sectionLabelClass;
  const chipClassName = isQuiet ? "px-3 py-1.5 text-[11px]" : "";
  const showHeaderRow = !isQuiet || activeFilterCount > 0;

  return (
    <div className={filterShellClass}>
      {showHeaderRow ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {!isQuiet ? (
            <div className="flex flex-wrap items-center gap-2.5">
              <p className={cn("text-[11px] font-semibold uppercase tracking-[0.24em]", labelClass)}>
                Refine
              </p>
              {activeFilterCount > 0 ? (
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                    isLight
                      ? "border-black/8 bg-white text-slate-500"
                      : "border-white/10 bg-white/[0.04] text-neutral-300",
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
                isLight
                  ? "border-black/8 bg-white text-slate-400"
                  : "border-white/10 bg-white/[0.04] text-neutral-300",
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
              className={`inline-flex items-center gap-2 rounded-full border ${
                isQuiet ? "px-3 py-1.5 text-[11px]" : "px-4 py-2 text-xs uppercase tracking-[0.16em]"
              } font-semibold transition-colors ${
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
        <div className="flex flex-col gap-2.5 xl:flex-row xl:items-start xl:justify-between">
          <div className={cn("flex flex-wrap items-center", isQuiet ? "gap-2" : "gap-2.5")}>
            <span className={visibleSectionLabelClass}>Sort</span>
            {sortOptions.map((option) => (
              <Chip
                key={option.id}
                label={option.label}
                active={sortBy === option.id}
                onClick={() => handleSortChange(option.id)}
                appearance={appearance}
                className={cn(
                  chipClassName,
                  "tracking-[0.16em]",
                  sortBy === option.id && !isLight ? "text-white" : "",
                )}
              />
            ))}
          </div>

          <div className={cn("flex flex-wrap items-center", isQuiet ? "gap-2" : "gap-2.5")}>
            <span className={visibleSectionLabelClass}>Status</span>
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
              `${isQuiet ? "pt-2.5" : "space-y-3 pt-3"} border-t`,
              isLight ? "border-black/6" : "border-white/10",
            )}
          >
            {isQuiet ? (
              <div
                ref={genreMenuRef}
                className="relative flex flex-wrap items-center justify-between gap-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowGenrePicker((current) => !current)}
                    aria-expanded={showGenrePicker}
                    aria-haspopup="dialog"
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors",
                      subtleButtonClass,
                      (showGenrePicker || selectedGenre !== "all") &&
                        (isLight
                          ? "border-[rgba(49,87,214,0.16)] bg-[rgba(49,87,214,0.06)] text-slate-900"
                          : "border-emerald-400/30 bg-emerald-400/12 text-emerald-100"),
                    )}
                  >
                    <span>Genres</span>
                    <ChevronDown
                      size={14}
                      className={cn("transition-transform", showGenrePicker ? "rotate-180" : "")}
                    />
                  </button>

                  {selectedGenre !== "all" ? (
                    <Chip
                      label={selectedGenre}
                      active
                      appearance={appearance}
                      className={chipClassName}
                    />
                  ) : null}
                </div>

                {showGenrePicker ? (
                  <div
                    className={cn(
                      "absolute left-0 top-full z-20 mt-2 w-full max-w-[min(20rem,calc(100vw-3rem))] rounded-[18px] border px-3 py-3 shadow-[0_18px_40px_rgba(15,23,42,0.08)]",
                      isLight
                        ? "border-black/6 bg-white/95 backdrop-blur-[10px]"
                        : "border-white/10 bg-black/90",
                    )}
                  >
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

                    {genres.length > 8 ? (
                      <div className="mt-3 flex justify-end">
                        <button
                          type="button"
                          onClick={() => setShowAllGenres(!showAllGenres)}
                          className={cn(
                            "rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors",
                            subtleButtonClass,
                          )}
                        >
                          {showAllGenres ? "Less" : "More"}
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <p className={visibleSectionLabelClass}>Genres</p>
                  {genres.length > 8 ? (
                    <button
                      type="button"
                      onClick={() => setShowAllGenres(!showAllGenres)}
                      className={cn(
                        "rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition-colors",
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
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
