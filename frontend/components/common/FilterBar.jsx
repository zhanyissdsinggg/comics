/**
 * FilterBar keeps series filters and sort controls together.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import Chip from "./Chip";
import {
  storefrontBadgeClass,
  storefrontSecondaryButtonClass,
  storefrontSoftCardClass,
} from "./StorefrontPagePrimitives";

export default function FilterBar({
  genres = [],
  genreHrefMap = {},
  selectedGenre = "all",
  onGenreChange,
  sortBy = "latest",
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
    { id: "latest", label: "Latest", icon: "New" },
    { id: "title", label: "Title", icon: "A-Z" },
  ];

  const statusOptions = [
    { id: "all", label: "All" },
    { id: "ongoing", label: "Ongoing" },
    { id: "completed", label: "Finished" },
  ];

  const displayedGenres = showAllGenres
    ? genres
    : genres.slice(0, isQuiet ? 5 : 8);
  const activeFilterCount = [
    selectedGenre !== "all" ? selectedGenre : "",
    sortBy !== "latest" ? sortBy : "",
    status !== "all" ? status : "",
  ].filter(Boolean).length;

  const handleSortChange = (id) => {
    if (onSortChange) onSortChange(id);
  };

  const handleStatusChange = (id) => {
    if (onStatusChange) onStatusChange(id);
  };

  const handleGenreChange = (genre, options = {}) => {
    if (isQuiet) {
      setShowGenrePicker(false);
    }
    if (onGenreChange) onGenreChange(genre, options);
  };

  const renderGenreChip = (genre) => (
    <Chip
      key={genre}
      label={genre}
      active={selectedGenre === genre}
      onClick={() => handleGenreChange(genre)}
      appearance={appearance}
      className={chipClassName}
    />
  );

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

  const filterShellClass = isLight
    ? isQuiet
      ? "rounded-[24px] border border-[rgba(29,29,31,0.12)] bg-[rgba(255,255,255,0.95)] px-3 py-2.5 shadow-[0_14px_34px_rgba(58,44,86,0.12)]"
      : "rounded-[28px] border border-[rgba(29,29,31,0.12)] bg-[rgba(255,255,255,0.95)] px-4 py-3.5 shadow-[0_16px_38px_rgba(58,44,86,0.12)]"
    : `rounded-[28px] px-4 py-4 ${storefrontSoftCardClass}`;
  const labelClass = isLight ? "text-white/70" : "text-white/70";
  const subtleButtonClass = isLight
    ? "rounded-full border border-[rgba(29,29,31,0.12)] bg-white text-slate-700 shadow-[0_10px_24px_rgba(58,44,86,0.1)] transition-all duration-150 hover:-translate-y-0.5 hover:border-[rgba(29,29,31,0.18)] hover:bg-[rgba(29,29,31,0.04)]"
    : storefrontSecondaryButtonClass;
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
              <p
                className={cn(
                  "text-[11px] font-semibold uppercase tracking-[0.24em]",
                  labelClass,
                )}
              >
                Refine
              </p>
              {activeFilterCount > 0 ? (
                <span
                  className={cn(
                    "border px-2.5 py-1 text-[11px] font-semibold",
                    isLight
                      ? "rounded-full border-[rgba(29,29,31,0.14)] bg-[rgba(29,29,31,0.06)] text-slate-900 shadow-[0_10px_24px_rgba(58,44,86,0.1)]"
                        : `${storefrontBadgeClass} text-white`,
                  )}
                >
                  {activeFilterCount} active
                </span>
              ) : null}
            </div>
          ) : activeFilterCount > 0 ? (
            <span
              className={cn(
                "border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]",
                isLight
                  ? "rounded-full border-[rgba(29,29,31,0.14)] bg-[rgba(29,29,31,0.06)] text-slate-900 shadow-[0_10px_24px_rgba(58,44,86,0.1)]"
                  : `${storefrontBadgeClass} text-white`,
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
              className={`inline-flex items-center gap-2 border ${
                isQuiet
                  ? "px-3 py-1.5 text-[11px]"
                  : "px-4 py-2 text-xs uppercase tracking-[0.16em]"
              } font-semibold transition-colors ${
                isLight
                  ? "rounded-full border border-[rgba(29,29,31,0.12)] bg-white text-slate-700 shadow-[0_10px_24px_rgba(58,44,86,0.1)] transition-all duration-150 hover:-translate-y-0.5 hover:border-[rgba(29,29,31,0.18)] hover:bg-[rgba(29,29,31,0.04)]"
                  : `${storefrontSecondaryButtonClass} text-white`
              }`}
            >
              <RotateCcw size={14} />
              Reset
            </button>
          ) : null}
        </div>
      ) : null}

      <div
        className={cn(
          showHeaderRow ? "mt-3" : "",
          isQuiet ? "space-y-2.5" : "space-y-3",
        )}
      >
        <div className="flex flex-col gap-2.5 xl:flex-row xl:items-start xl:justify-between">
          <div
            className={cn(
              "flex flex-wrap items-center",
              isQuiet ? "gap-2" : "gap-2.5",
            )}
          >
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

          <div
            className={cn(
              "flex flex-wrap items-center",
              isQuiet ? "gap-2" : "gap-2.5",
            )}
          >
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
              isLight ? "border-black/20" : "border-white/20",
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
                      "inline-flex items-center gap-1.5 border px-3 py-1.5 text-[11px] font-semibold transition-colors",
                      subtleButtonClass,
                      (showGenrePicker || selectedGenre !== "all") &&
                        (isLight
                          ? "border-[rgba(29,29,31,0.14)] bg-[rgba(29,29,31,0.06)] text-slate-900"
                          : "border-[rgba(255,79,154,0.28)] bg-[rgba(255,79,154,0.16)] text-white"),
                    )}
                  >
                    <span>Genres</span>
                    <ChevronDown
                      size={14}
                      className={cn(
                        "transition-transform",
                        showGenrePicker ? "rotate-180" : "",
                      )}
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
                      "absolute left-0 top-full z-20 mt-2 w-full max-w-[min(20rem,calc(100vw-3rem))] border px-3 py-3 shadow-[0_18px_40px_rgba(15,23,42,0.08)]",
                      isLight
                        ? "rounded-[22px] border-[rgba(29,29,31,0.12)] bg-[rgba(255,255,255,0.98)]"
                        : "rounded-[22px] border-white/10 bg-[rgba(17,13,24,0.98)]",
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
                      {displayedGenres.map((genre) => renderGenreChip(genre))}
                    </div>

                    {genres.length > 8 ? (
                      <div className="mt-3 flex justify-end">
                        <button
                          type="button"
                          onClick={() => setShowAllGenres(!showAllGenres)}
                          className={cn(
                            "border px-3 py-1.5 text-[11px] font-semibold transition-colors",
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
                        "border px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition-colors",
                        subtleButtonClass,
                      )}
                    >
                      {showAllGenres
                        ? "Show less"
                        : `Show all ${genres.length}`}
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
                  {displayedGenres.map((genre) => renderGenreChip(genre))}
                </div>
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
