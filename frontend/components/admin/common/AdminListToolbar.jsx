import React from "react";
import { ArrowUpDown, Search, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AdminListToolbar({
  searchTerm,
  onSearchTermChange,
  searchPlaceholder,
  onOpenFilters,
  sortOrder,
  onToggleSortOrder,
  extraActions = null,
  className = "",
  filtersLabel = "筛选",
  ascendingLabel = "较早优先",
  descendingLabel = "最新优先",
}) {
  return (
    <div
      className={cn(
        "mb-6 rounded-[28px] border border-[color:var(--gush-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,246,248,0.94))] p-4 shadow-[0_14px_32px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.02] sm:p-5",
        className,
      )}
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
            列表工具
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            先缩小范围，再执行排序和批量动作，减少误操作。
          </p>
          <label className="relative mt-3 block min-w-[220px] xl:max-w-2xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(event) => onSearchTermChange(event.target.value)}
              className="h-11 w-full rounded-full border border-[color:var(--gush-border)] bg-white py-2 pl-10 pr-4 text-sm text-slate-900 outline-none transition-[background-color,border-color,box-shadow] duration-200 focus:border-[color:var(--gush-border-strong)] focus:bg-white focus:ring-[3px] focus:ring-slate-200/70"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-[22px] border border-[color:var(--gush-border)] bg-white/95 p-2 shadow-[0_10px_24px_rgba(15,23,42,0.03)] xl:justify-end">
          <span className="px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            控制区
          </span>
          <Button type="button" variant="outline" onClick={onOpenFilters}>
            <SlidersHorizontal className="size-4" />
            {filtersLabel}
          </Button>

          <Button type="button" variant="outline" onClick={onToggleSortOrder}>
            <ArrowUpDown className="size-4" />
            {sortOrder === "asc" ? ascendingLabel : descendingLabel}
          </Button>

          {extraActions ? (
            <div className="flex flex-wrap items-center gap-2">
              {extraActions}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
