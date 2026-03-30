import React from "react";
import { Button } from "@/components/ui/button";

export function AdminListPagination({
  pagination,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [20, 50, 100],
  containerClassName = "flex flex-col gap-4 border-t border-black/6 bg-[rgba(250,247,241,0.72)] px-4 py-4 text-sm text-slate-600 lg:flex-row lg:items-center lg:justify-between",
  pageSizeSelectClassName = "rounded-full border border-black/8 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-[var(--gush-accent,#2f58c6)]",
}) {
  const totalPages = Math.max(1, pagination?.totalPages || 1);
  const total = pagination?.total ?? 0;

  return (
    <div className={containerClassName}>
      <div>
        Page <span className="font-semibold text-slate-950">{page}</span> of{" "}
        <span className="font-semibold text-slate-950">{totalPages}</span>
        {" · "}
        <span className="font-semibold text-slate-950">{total}</span> total items
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2">
          <span>Rows</span>
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className={pageSizeSelectClassName}
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={!pagination?.hasPrevPage}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={!pagination?.hasNextPage}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
