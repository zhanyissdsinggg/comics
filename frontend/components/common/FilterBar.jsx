/**
 * FilterBar - 绛涢€夊拰鎺掑簭缁勪欢
 * 鑰佺帇娉ㄩ噴锛氬弬鑰僕ebtoon鍜孧angaDex鐨勭瓫閫夋爮璁捐
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

  // 鑰佺帇娉ㄩ噴锛氭帓搴忛€夐」 - 绠€鍖栦负2涓渶甯哥敤鐨?
  const sortOptions = [
    { id: "popular", label: "Popular", icon: "馃敟" },
    { id: "latest", label: "Latest", icon: "馃啎" },
  ];

  // 鑰佺帇娉ㄩ噴锛氬畬缁撶姸鎬侀€夐」
  const statusOptions = [
    { id: "all", label: "All" },
    { id: "ongoing", label: "Ongoing" },
    { id: "completed", label: "Completed" },
  ];

  // 鑰佺帇娉ㄩ噴锛氶粯璁ゆ樉绀哄墠4涓被鍨嬶紝鐐瑰嚮"More"鏄剧ず鍏ㄩ儴
  const displayedGenres = showAllGenres ? genres : genres.slice(0, 4);

  // 鑰佺帇娉ㄩ噴锛氬畨鍏ㄧ殑鍥炶皟鍑芥暟璋冪敤
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
      {/* 鑰佺帇娉ㄩ噴锛氱粺璁′俊鎭?*/}
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-400">
          {totalCount > 0 ? `${totalCount} series found` : "Loading..."}
        </p>
      </div>

      {/* 鑰佺帇娉ㄩ噴锛氭帓搴忓拰鐘舵€佸悎骞跺埌涓€琛?*/}
      <div className="flex flex-col md:flex-row md:items-start gap-4">
        {/* 鎺掑簭閫夐」 */}
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
                <span>{option.icon}</span>
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 瀹岀粨鐘舵€佺瓫閫?*/}
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

      {/* 鑰佺帇娉ㄩ噴锛氱被鍨嬬瓫閫?*/}
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