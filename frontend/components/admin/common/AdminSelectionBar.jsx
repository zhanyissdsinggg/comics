import React from "react";

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
      className={`mb-6 flex flex-col gap-3 rounded-[24px] border border-[rgba(47,88,198,0.14)] bg-[rgba(47,88,198,0.06)] p-4 shadow-[var(--gush-shadow-soft)] sm:flex-row sm:items-center sm:justify-between ${className}`.trim()}
    >
      <span className="text-sm font-medium text-slate-700">
        已选择 {selectedCount} 项
      </span>
      <div className="flex flex-wrap gap-2">
        {children}
        <button
          type="button"
          onClick={onClear}
          className="rounded-full border border-black/8 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[rgba(250,248,244,0.96)]"
        >
          {clearLabel}
        </button>
      </div>
    </div>
  );
}
