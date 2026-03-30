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
  filtersLabel = "Filters",
  ascendingLabel = "Oldest first",
  descendingLabel = "Newest first",
}) {
  return (
    <div
      className={cn(
        "mb-6 flex flex-wrap items-center gap-3 rounded-[24px] border border-black/8 bg-white/88 p-4 shadow-[var(--gush-shadow-soft)]",
        className,
      )}
    >
      <label className="relative min-w-[220px] flex-1">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChange={(event) => onSearchTermChange(event.target.value)}
          className="h-11 w-full rounded-full border border-black/8 bg-[rgba(250,247,241,0.8)] py-2 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-[var(--gush-accent,#2f58c6)]"
        />
      </label>

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
  );
}
