"use client";

import { memo, useState } from "react";

/**
 * 老王注释：高级筛选面板组件
 * 提供类型、标签、作者、状态等多维度筛选功能
 */
const AdvancedFilterPanel = memo(function AdvancedFilterPanel({ isOpen, onClose, onApply, initialFilters = {} }) {
  const [filters, setFilters] = useState({
    types: initialFilters.types || [],
    tags: initialFilters.tags || [],
    status: initialFilters.status || "all",
    sortBy: initialFilters.sortBy || "popular",
    author: initialFilters.author || "",
  });

  // 老王注释：可用的筛选选项
  const TYPE_OPTIONS = [
    { value: "comic", label: "Comic", icon: "📚" },
    { value: "novel", label: "Novel", icon: "📖" },
    { value: "webtoon", label: "Webtoon", icon: "📱" },
    { value: "manga", label: "Manga", icon: "🎌" },
  ];

  const TAG_OPTIONS = [
    { value: "romance", label: "Romance", color: "bg-pink-500" },
    { value: "action", label: "Action", color: "bg-red-500" },
    { value: "fantasy", label: "Fantasy", color: "bg-purple-500" },
    { value: "comedy", label: "Comedy", color: "bg-yellow-500" },
    { value: "drama", label: "Drama", color: "bg-blue-500" },
    { value: "horror", label: "Horror", color: "bg-gray-500" },
    { value: "mystery", label: "Mystery", color: "bg-indigo-500" },
    { value: "scifi", label: "Sci-Fi", color: "bg-cyan-500" },
    { value: "slice-of-life", label: "Slice of Life", color: "bg-green-500" },
    { value: "sports", label: "Sports", color: "bg-orange-500" },
  ];

  const STATUS_OPTIONS = [
    { value: "all", label: "All Status" },
    { value: "ongoing", label: "Ongoing" },
    { value: "completed", label: "Completed" },
    { value: "hiatus", label: "On Hiatus" },
  ];

  const SORT_OPTIONS = [
    { value: "popular", label: "Most Popular" },
    { value: "latest", label: "Latest Updates" },
    { value: "rating", label: "Highest Rated" },
    { value: "views", label: "Most Viewed" },
    { value: "alphabetical", label: "A-Z" },
  ];

  // 老王注释：切换类型选择
  const toggleType = (type) => {
    setFilters((prev) => ({
      ...prev,
      types: prev.types.includes(type)
        ? prev.types.filter((t) => t !== type)
        : [...prev.types, type],
    }));
  };

  // 老王注释：切换标签选择
  const toggleTag = (tag) => {
    setFilters((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
  };

  // 老王注释：重置所有筛选
  const handleReset = () => {
    setFilters({
      types: [],
      tags: [],
      status: "all",
      sortBy: "popular",
      author: "",
    });
  };

  // 老王注释：应用筛选
  const handleApply = () => {
    if (onApply) {
      onApply(filters);
    }
    if (onClose) {
      onClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-neutral-800 bg-neutral-950 p-4 shadow-xl md:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 老王注释：标题栏 */}
        <div className="mb-4 flex items-center justify-between md:mb-6">
          <div>
            <h2 className="text-base font-semibold text-white md:text-lg">Advanced Filters</h2>
            <p className="mt-1 text-xs text-neutral-400">
              Refine your search with multiple filters
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full p-2 text-neutral-400 hover:bg-neutral-900 hover:text-white active:bg-neutral-800"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4 md:space-y-6">
          {/* 老王注释：类型筛选 */}
          <div>
            <label className="mb-3 block text-sm font-medium text-neutral-300 md:text-base">Content Type</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {TYPE_OPTIONS.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => toggleType(type.value)}
                  className={`min-h-[44px] rounded-lg border px-4 py-3 text-sm font-medium transition-colors active:scale-95 ${
                    filters.types.includes(type.value)
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                      : "border-neutral-800 bg-neutral-900/50 text-neutral-400 hover:border-neutral-700 hover:text-neutral-300"
                  }`}
                >
                  <div className="text-xl md:text-2xl">{type.icon}</div>
                  <div className="mt-1 text-xs md:text-sm">{type.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 老王注释：标签筛选 */}
          <div>
            <label className="mb-3 block text-sm font-medium text-neutral-300 md:text-base">
              Genres & Tags
              {filters.tags.length > 0 ? (
                <span className="ml-2 text-xs text-emerald-400">
                  ({filters.tags.length} selected)
                </span>
              ) : null}
            </label>
            <div className="flex flex-wrap gap-2">
              {TAG_OPTIONS.map((tag) => (
                <button
                  key={tag.value}
                  type="button"
                  onClick={() => toggleTag(tag.value)}
                  className={`min-h-[44px] rounded-full px-4 py-2 text-xs font-medium transition-all active:scale-95 md:text-sm ${
                    filters.tags.includes(tag.value)
                      ? `${tag.color} text-white`
                      : "border border-neutral-800 bg-neutral-900/50 text-neutral-400 hover:border-neutral-700"
                  }`}
                >
                  {tag.label}
                </button>
              ))}
            </div>
          </div>

          {/* 老王注释：状态筛选 */}
          <div>
            <label className="mb-3 block text-sm font-medium text-neutral-300 md:text-base">Status</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {STATUS_OPTIONS.map((status) => (
                <button
                  key={status.value}
                  type="button"
                  onClick={() => setFilters((prev) => ({ ...prev, status: status.value }))}
                  className={`min-h-[44px] rounded-lg border px-4 py-3 text-sm font-medium transition-colors active:scale-95 ${
                    filters.status === status.value
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                      : "border-neutral-800 bg-neutral-900/50 text-neutral-400 hover:border-neutral-700 hover:text-neutral-300"
                  }`}
                >
                  {status.label}
                </button>
              ))}
            </div>
          </div>

          {/* 老王注释：排序方式 */}
          <div>
            <label className="mb-3 block text-sm font-medium text-neutral-300 md:text-base">Sort By</label>
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters((prev) => ({ ...prev, sortBy: e.target.value }))}
              className="w-full min-h-[44px] rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-white focus:border-emerald-500 focus:outline-none md:text-base"
            >
              {SORT_OPTIONS.map((sort) => (
                <option key={sort.value} value={sort.value}>
                  {sort.label}
                </option>
              ))}
            </select>
          </div>

          {/* 老王注释：作者筛选 */}
          <div>
            <label className="mb-3 block text-sm font-medium text-neutral-300 md:text-base">Author</label>
            <input
              type="text"
              value={filters.author}
              onChange={(e) => setFilters((prev) => ({ ...prev, author: e.target.value }))}
              placeholder="Search by author name..."
              className="w-full min-h-[44px] rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-white placeholder-neutral-600 focus:border-emerald-500 focus:outline-none md:text-base"
            />
          </div>
        </div>

        {/* 老王注释：底部按钮 */}
        <div className="mt-4 flex gap-3 md:mt-6">
          <button
            type="button"
            onClick={handleReset}
            className="min-h-[44px] flex-1 rounded-full border border-neutral-700 px-4 py-3 text-sm font-medium text-neutral-300 hover:bg-neutral-900 active:bg-neutral-800 md:text-base"
          >
            Reset All
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="min-h-[44px] flex-1 rounded-full bg-emerald-500 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-600 active:bg-emerald-700 md:text-base"
          >
            Apply Filters
          </button>
        </div>

        {/* 老王注释：当前筛选摘要 */}
        {(filters.types.length > 0 || filters.tags.length > 0 || filters.status !== "all" || filters.author) ? (
          <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-900/50 px-4 py-3">
            <p className="text-xs font-medium text-neutral-400">Active Filters:</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {filters.types.map((type) => (
                <span key={type} className="rounded-full bg-emerald-500/20 px-2 py-1 text-[10px] text-emerald-400">
                  {TYPE_OPTIONS.find((t) => t.value === type)?.label}
                </span>
              ))}
              {filters.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-emerald-500/20 px-2 py-1 text-[10px] text-emerald-400">
                  {TAG_OPTIONS.find((t) => t.value === tag)?.label}
                </span>
              ))}
              {filters.status !== "all" ? (
                <span className="rounded-full bg-emerald-500/20 px-2 py-1 text-[10px] text-emerald-400">
                  {STATUS_OPTIONS.find((s) => s.value === filters.status)?.label}
                </span>
              ) : null}
              {filters.author ? (
                <span className="rounded-full bg-emerald-500/20 px-2 py-1 text-[10px] text-emerald-400">
                  Author: {filters.author}
                </span>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
});

export default AdvancedFilterPanel;
