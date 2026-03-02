/**
 * 老王打造：高级筛选面板 - iOS 26风格
 * 功能：
 * - 按状态筛选
 * - 按发布状态筛选
 * - 按成人内容筛选
 * - 排序功能
 */
"use client";

import { useState } from "react";
import { Filter, X, ChevronDown, SortAsc, SortDesc } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "all", label: "全部状态" },
  { value: "Ongoing", label: "连载中" },
  { value: "Completed", label: "已完结" },
  { value: "Hiatus", label: "暂停" },
];

const PUBLISH_OPTIONS = [
  { value: "all", label: "全部" },
  { value: "published", label: "已发布" },
  { value: "unpublished", label: "未发布" },
];

const ADULT_OPTIONS = [
  { value: "all", label: "全部" },
  { value: "adult", label: "成人内容" },
  { value: "general", label: "一般内容" },
];

const SORT_OPTIONS = [
  { value: "createdAt_desc", label: "创建时间（新→旧）" },
  { value: "createdAt_asc", label: "创建时间（旧→新）" },
  { value: "updatedAt_desc", label: "更新时间（新→旧）" },
  { value: "updatedAt_asc", label: "更新时间（旧→新）" },
  { value: "title_asc", label: "标题（A→Z）" },
  { value: "title_desc", label: "标题（Z→A）" },
];

export default function AdvancedFilters({ filters, onFiltersChange }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleFilterChange = (key, value) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const handleReset = () => {
    onFiltersChange({
      status: "all",
      publishStatus: "all",
      adultContent: "all",
      sortBy: "createdAt_desc",
    });
  };

  const activeFiltersCount = Object.values(filters).filter(
    (v) => v !== "all" && v !== "createdAt_desc"
  ).length;

  return (
    <div className="relative">
      {/* 老王添加：筛选按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 rounded-4xl border px-5 py-2.5 text-xs font-bold transition-all duration-300 hover:scale-105 hover:shadow-ios-sm active:scale-95 ${
          activeFiltersCount > 0
            ? "border-ios-green/30 bg-ios-green/10 text-ios-green shadow-ios-sm"
            : "border-ios-gray-700 bg-ios-gray-800/50 text-ios-gray-400 hover:bg-ios-gray-800 hover:text-neutral-200"
        }`}
      >
        <Filter size={14} />
        <span>筛选</span>
        {activeFiltersCount > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ios-green text-[10px] text-white">
            {activeFiltersCount}
          </span>
        )}
        <ChevronDown
          size={14}
          className={`transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* 老王添加：筛选面板 */}
      {isOpen && (
        <>
          {/* 遮罩层 */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* 筛选面板 */}
          <div className="absolute right-0 top-full mt-2 z-50 w-80 animate-scale-in">
            <div className="rounded-5xl border border-ios-gray-800 bg-neutral-900/95 backdrop-blur-2xl shadow-ios-xl p-6">
              {/* 标题 */}
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-bold text-neutral-100">高级筛选</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-ios-gray-800 text-ios-gray-400 transition-all duration-300 hover:bg-ios-gray-700 hover:text-neutral-200 active:scale-95"
                >
                  <X size={16} />
                </button>
              </div>

              {/* 筛选选项 */}
              <div className="space-y-4">
                {/* 状态筛选 */}
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-ios-green/60">
                    作品状态
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {STATUS_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handleFilterChange("status", option.value)}
                        className={`rounded-3xl px-3 py-2 text-xs font-medium transition-all duration-300 ${
                          filters.status === option.value
                            ? "bg-ios-green/20 text-ios-green shadow-ios-sm"
                            : "bg-ios-gray-800/50 text-ios-gray-400 hover:bg-ios-gray-800 hover:text-neutral-200"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 发布状态筛选 */}
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-ios-green/60">
                    发布状态
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {PUBLISH_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handleFilterChange("publishStatus", option.value)}
                        className={`rounded-3xl px-3 py-2 text-xs font-medium transition-all duration-300 ${
                          filters.publishStatus === option.value
                            ? "bg-ios-green/20 text-ios-green shadow-ios-sm"
                            : "bg-ios-gray-800/50 text-ios-gray-400 hover:bg-ios-gray-800 hover:text-neutral-200"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 成人内容筛选 */}
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-ios-green/60">
                    内容分级
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {ADULT_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handleFilterChange("adultContent", option.value)}
                        className={`rounded-3xl px-3 py-2 text-xs font-medium transition-all duration-300 ${
                          filters.adultContent === option.value
                            ? "bg-ios-green/20 text-ios-green shadow-ios-sm"
                            : "bg-ios-gray-800/50 text-ios-gray-400 hover:bg-ios-gray-800 hover:text-neutral-200"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 排序 */}
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-ios-green/60">
                    排序方式
                  </label>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => handleFilterChange("sortBy", e.target.value)}
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

              {/* 底部按钮 */}
              <div className="mt-6 flex items-center gap-2">
                <button
                  onClick={handleReset}
                  className="flex-1 rounded-3xl border border-ios-gray-700 bg-ios-gray-800/50 px-4 py-2.5 text-xs text-ios-gray-400 font-bold transition-all duration-300 hover:bg-ios-gray-800 hover:text-neutral-200 active:scale-95"
                >
                  重置
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex-1 rounded-3xl border border-ios-green/20 bg-ios-green/10 px-4 py-2.5 text-xs text-ios-green font-bold transition-all duration-300 hover:bg-ios-green/20 hover:scale-105 hover:shadow-ios-sm active:scale-95"
                >
                  应用
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
