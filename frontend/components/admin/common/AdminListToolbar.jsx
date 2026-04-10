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
        "mb-6 rounded-[24px] border border-[color:var(--gush-border)] bg-white/96 p-4 shadow-[var(--gush-shadow-soft)]",
        className,
      )}
    >
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <label className="relative min-w-[220px] flex-1 xl:max-w-2xl">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(event) => onSearchTermChange(event.target.value)}
            className="h-11 w-full rounded-full border border-[color:var(--gush-border)] bg-white py-2 pl-10 pr-4 text-sm text-slate-900 outline-none transition-[border-color,box-shadow] duration-200 focus:border-[color:var(--gush-border-strong)] focus:ring-[3px] focus:ring-slate-200/70"
          />
        </label>

        <div className="flex flex-wrap items-center gap-2 xl:justify-end">
          <Button type="button" variant="outline" onClick={onOpenFilters}>
            <SlidersHorizontal className="size-4" />
            {filtersLabel}
          </Button>

          <Button type="button" variant="outline" onClick={onToggleSortOrder}>
            <ArrowUpDown className="size-4" />
            {sortOrder === "asc" ? ascendingLabel : descendingLabel}
          </Button>

          {extraActions ? <div className="flex flex-wrap items-center gap-2">{extraActions}</div> : null}
        </div>
      </div>
    </div>
  );
}
