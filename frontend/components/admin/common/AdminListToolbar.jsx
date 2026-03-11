import React from 'react';

export function AdminListToolbar({
  searchTerm,
  onSearchTermChange,
  searchPlaceholder,
  onOpenFilters,
  sortOrder,
  onToggleSortOrder,
  extraActions = null,
  className = '',
}) {
  return (
    <div className={`mb-6 flex flex-wrap items-center gap-4 ${className}`.trim()}>
      <input
        type="text"
        placeholder={searchPlaceholder}
        value={searchTerm}
        onChange={(event) => onSearchTermChange(event.target.value)}
        className="rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-2 text-neutral-100 placeholder-neutral-500"
      />

      <button
        type="button"
        onClick={onOpenFilters}
        className="rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-2 text-neutral-300 transition hover:bg-neutral-700"
      >
        高级筛选
      </button>

      <button
        type="button"
        onClick={onToggleSortOrder}
        className="rounded-lg bg-neutral-800 px-4 py-2 text-neutral-300 transition hover:bg-neutral-700"
      >
        {sortOrder === 'asc' ? '↑ 升序' : '↓ 降序'}
      </button>

      {extraActions ? <div className="flex flex-wrap items-center gap-2">{extraActions}</div> : null}
    </div>
  );
}
