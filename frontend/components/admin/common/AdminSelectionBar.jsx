import React from 'react';

export function AdminSelectionBar({
  selectedCount,
  children,
  onClear,
  className = '',
  clearLabel = '清空选择',
}) {
  if (!selectedCount) {
    return null;
  }

  return (
    <div className={`mb-6 flex items-center justify-between rounded-lg border border-blue-700 bg-blue-900/20 p-4 ${className}`.trim()}>
      <span className="text-blue-300">已选择 {selectedCount} 项</span>
      <div className="flex flex-wrap gap-2">
        {children}
        <button
          type="button"
          onClick={onClear}
          className="rounded-lg bg-neutral-700 px-4 py-2 text-sm text-neutral-300 transition hover:bg-neutral-600"
        >
          {clearLabel}
        </button>
      </div>
    </div>
  );
}

