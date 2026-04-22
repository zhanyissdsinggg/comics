import React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AdminSelectionBar({
  selectedCount,
  children,
  onClear,
  className = "",
  clearLabel = "清空选择",
}) {
  if (!selectedCount) {
    return null;
  }

  return (
    <div
      className={cn(
        "mb-6 flex flex-col gap-3 rounded-[26px] border border-[color:var(--gush-border-strong)] bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.02] lg:flex-row lg:items-center lg:justify-between",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 min-w-10 items-center justify-center rounded-full border border-[color:var(--gush-border)] bg-white text-sm font-semibold text-slate-950 shadow-[0_6px_16px_rgba(15,23,42,0.04)]">
          {selectedCount}
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">批量操作</p>
          <p className="text-sm font-semibold text-slate-900">已选择 {selectedCount} 项</p>
          <p className="text-xs text-slate-500">批量操作会立即应用到已选内容。</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {children}
        <Button type="button" variant="ghost" size="sm" onClick={onClear}>
          {clearLabel}
        </Button>
      </div>
    </div>
  );
}
