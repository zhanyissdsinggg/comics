"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Filter, X } from "lucide-react";

import { Button } from "@/components/ui/button";

const STATUS_OPTIONS = [
  { value: "all", label: "全部状态" },
  { value: "Ongoing", label: "连载中" },
  { value: "Completed", label: "已完结" },
  { value: "Hiatus", label: "休更中" },
];

const PUBLISH_OPTIONS = [
  { value: "all", label: "全部" },
  { value: "published", label: "已发布" },
  { value: "unpublished", label: "草稿" },
];

const ADULT_OPTIONS = [
  { value: "all", label: "全部分级" },
  { value: "adult", label: "18+" },
  { value: "general", label: "常规内容" },
];

const SORT_OPTIONS = [
  { value: "createdAt_desc", label: "最新创建" },
  { value: "createdAt_asc", label: "最早创建" },
  { value: "updatedAt_desc", label: "最近更新" },
  { value: "updatedAt_asc", label: "最久未更新" },
  { value: "episodeCount_desc", label: "章节最多" },
  { value: "episodeCount_asc", label: "章节最少" },
  { value: "title_asc", label: "标题 A-Z" },
  { value: "title_desc", label: "标题 Z-A" },
];

const DEFAULT_FILTERS = {
  status: "all",
  publishStatus: "all",
  adultContent: "all",
  sortBy: "createdAt_desc",
};

function FilterChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
        active
          ? "border-[color:var(--gush-border-strong)] bg-white text-slate-950 shadow-[0_8px_18px_rgba(15,23,42,0.035)]"
          : "border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)]/78 text-slate-600 hover:border-[color:var(--gush-border-strong)] hover:bg-white hover:text-slate-950"
      }`}
    >
      {children}
    </button>
  );
}

export default function AdvancedFilters({ filters, onFiltersChange }) {
  const [isOpen, setIsOpen] = useState(false);

  const resolvedFilters = useMemo(
    () => ({
      ...DEFAULT_FILTERS,
      ...filters,
    }),
    [filters],
  );

  const activeFiltersCount = Object.entries(resolvedFilters).filter(([key, value]) => {
    if (key === "sortBy") {
      return value !== DEFAULT_FILTERS.sortBy;
    }

    return value !== "all";
  }).length;

  const handleFilterChange = (key, value) => {
    onFiltersChange({
      ...resolvedFilters,
      [key]: value,
    });
  };

  const handleReset = () => {
    onFiltersChange(DEFAULT_FILTERS);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className={`flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition ${
          activeFiltersCount > 0
            ? "border-[color:var(--gush-border-strong)] bg-white text-slate-950 shadow-[0_8px_18px_rgba(15,23,42,0.035)]"
            : "border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)]/78 text-slate-600 hover:border-[color:var(--gush-border-strong)] hover:bg-white hover:text-slate-950"
        }`}
      >
        <Filter size={14} />
        <span>筛选</span>
        {activeFiltersCount > 0 ? (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full border border-[color:var(--gush-border)] bg-[linear-gradient(180deg,#ffffff,#f5f5f7)] px-1 text-[10px] font-semibold text-slate-950 shadow-[0_6px_14px_rgba(15,23,42,0.05)]">
            {activeFiltersCount}
          </span>
        ) : null}
        <ChevronDown size={14} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-[22rem]">
            <div className="rounded-[28px] border border-[color:var(--gush-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(247,247,249,0.94))] p-6 shadow-[0_20px_44px_rgba(15,23,42,0.08)] ring-1 ring-black/[0.02] backdrop-blur-xl">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-950">进一步筛选</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    只保留当前真正需要处理的作品，让列表更清楚。
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon-sm"
                  onClick={() => setIsOpen(false)}
                  aria-label="关闭筛选面板"
                >
                  <X size={16} />
                </Button>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    连载状态
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {STATUS_OPTIONS.map((option) => (
                      <FilterChip
                        key={option.value}
                        active={resolvedFilters.status === option.value}
                        onClick={() => handleFilterChange("status", option.value)}
                      >
                        {option.label}
                      </FilterChip>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    发布状态
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {PUBLISH_OPTIONS.map((option) => (
                      <FilterChip
                        key={option.value}
                        active={resolvedFilters.publishStatus === option.value}
                        onClick={() => handleFilterChange("publishStatus", option.value)}
                      >
                        {option.label}
                      </FilterChip>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    内容分级
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {ADULT_OPTIONS.map((option) => (
                      <FilterChip
                        key={option.value}
                        active={resolvedFilters.adultContent === option.value}
                        onClick={() => handleFilterChange("adultContent", option.value)}
                      >
                        {option.label}
                      </FilterChip>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    排序方式
                  </label>
                  <select
                    value={resolvedFilters.sortBy}
                    onChange={(event) => handleFilterChange("sortBy", event.target.value)}
                    className="h-11 w-full rounded-full border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)]/76 px-4 text-sm text-slate-900 outline-none transition-[background-color,border-color,box-shadow] duration-200 focus:border-[color:var(--gush-border-strong)] focus:bg-white focus:ring-[3px] focus:ring-slate-200/70"
                  >
                    {SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-2">
                <Button type="button" variant="secondary" className="flex-1" onClick={handleReset}>
                  重置
                </Button>
                <Button type="button" className="flex-1" onClick={() => setIsOpen(false)}>
                  应用
                </Button>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
