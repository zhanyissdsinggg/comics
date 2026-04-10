import React from "react";

import { Button } from "@/components/ui/button";

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
      className={`mb-6 flex flex-col gap-3 rounded-[24px] border border-[color:var(--gush-border)] bg-white/96 p-4 shadow-[var(--gush-shadow-soft)] lg:flex-row lg:items-center lg:justify-between ${className}`.trim()}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--gush-page-bg-muted)] text-sm font-semibold text-slate-950">
          {selectedCount}
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">已选择 {selectedCount} 项</p>
          <p className="text-xs text-slate-500">批量操作会按当前选择立即生效。</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {children}
        <Button type="button" variant="ghost" onClick={onClear}>
          {clearLabel}
        </Button>
      </div>
    </div>
  );
}
