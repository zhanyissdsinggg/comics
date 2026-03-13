/**
 * FilterBar keeps series filters and sort controls together.
 */

"use client";

import { useState } from "react";
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
}) {
  const [showAllGenres, setShowAllGenres] = useState(false);

  const sortOptions = [
    { id: "popular", label: "Popular", icon: "HOT" },
    { id: "latest", label: "Latest", icon: "NEW" },
  ];

  const statusOptions = [
    { id: "all", label: "All" },
    { id: "ongoing", label: "Ongoing" },
    { id: "completed", label: "Completed" },
  ];

  const displayedGenres = showAllGenres ? genres : genres.slice(0, 4);

  const handleSortChange = (id) => {
    if (onSortChange) onSortChange(id);
  };

  const handleStatusChange = (id) => {
    if (onStatusChange) onStatusChange(id);
  };

  const handleGenreChange = (genre) => {
    if (onGenreChange) onGenreChange(genre);
  };

  return (
    <div className="space-y-3 rounded-2xl bg-neutral-900/50 p-4 backdrop-blur-md border border-white/5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-400">
          {totalCount > 0 ? `${totalCount} series found` : "Loading..."}
        </p>
      </div>

      <div className="flex flex-col md:flex-row md:items-start gap-4">
        <div className="flex-1">
          <p className="mb-2 text-xs font-semibold text-neutral-300">Sort</p>
          <div className="flex flex-wrap gap-2">
            {sortOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => handleSortChange(option.id)}
                className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                  sortBy === option.id
                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                    : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                }`}
              >
                <span className="text-[10px] font-semibold tracking-wide">{option.icon}</span>
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1">
          <p className="mb-2 text-xs font-semibold text-neutral-300">Status</p>
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((option) => (
              <Chip
                key={option.id}
                label={option.label}
                active={status === option.id}
                onClick={() => handleStatusChange(option.id)}
              />
            ))}
          </div>
        </div>
      </div>

      {genres.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold text-neutral-300">Genres</p>
          <div className="flex flex-wrap gap-2">
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
            {genres.length > 4 && (
              <button
                onClick={() => setShowAllGenres(!showAllGenres)}
                className="rounded-xl bg-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-300 hover:bg-neutral-700 transition-colors"
              >
                {showAllGenres ? "Less" : `+${genres.length - 4} More`}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
