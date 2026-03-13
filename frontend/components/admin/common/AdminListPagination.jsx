import React from 'react';

export function AdminListPagination({
  pagination,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [20, 50, 100],
  containerClassName = 'flex flex-col gap-3 border-t border-neutral-700 bg-neutral-900/70 px-4 py-4 text-sm text-neutral-400 lg:flex-row lg:items-center lg:justify-between',
  pageSizeSelectClassName = 'rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none',
  buttonClassName = 'rounded-lg border border-neutral-700 px-3 py-2 text-sm text-neutral-100 transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50',
}) {
  const totalPages = Math.max(1, pagination?.totalPages || 1);
  const total = pagination?.total ?? 0;

  return (
    <div className={containerClassName}>
      <div>
        第 <span className="font-medium text-neutral-100">{page}</span> / {totalPages} 页，共{' '}
        <span className="font-medium text-neutral-100">{total}</span> 条
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2">
          <span>每页</span>
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
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={!pagination?.hasPrevPage}
            className={buttonClassName}
          >
            上一页
          </button>
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={!pagination?.hasNextPage}
            className={buttonClassName}
          >
            下一页
          </button>
        </div>
      </div>
    </div>
  );
}
