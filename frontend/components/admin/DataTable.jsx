"use client";

import { useState, useMemo } from "react";

/**
 * 老王注释：通用数据表格组件 - 支持排序、过滤、分页
 * 这个SB组件让所有admin页面都能用统一的表格，减少重复代码
 */
export function DataTable({
  columns = [],
  data = [],
  loading = false,
  error = null,
  onRowClick = null,
  selectable = false,
  onSelectionChange = null,
  sortable = true,
  paginated = true,
  pageSize = 10,
}) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState(new Set());

  // 老王说：处理排序
  const handleSort = (columnKey) => {
    if (!sortable) return;

    setSortConfig((prev) => ({
      key: columnKey,
      direction: prev.key === columnKey && prev.direction === "asc" ? "desc" : "asc",
    }));
    setCurrentPage(1);
  };

  // 老王说：排序数据
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return data;

    const sorted = [...data].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (typeof aValue === "string") {
        return sortConfig.direction === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortConfig.direction === "asc" ? aValue - bValue : bValue - aValue;
    });

    return sorted;
  }, [data, sortConfig]);

  // 老王说：分页数据
  const paginatedData = useMemo(() => {
    if (!paginated) return sortedData;

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return sortedData.slice(startIndex, endIndex);
  }, [sortedData, currentPage, pageSize, paginated]);

  const totalPages = Math.ceil(sortedData.length / pageSize);

  // 老王说：处理行选择
  const handleRowSelect = (rowId) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(rowId)) {
      newSelected.delete(rowId);
    } else {
      newSelected.add(rowId);
    }
    setSelectedRows(newSelected);
    onSelectionChange?.(Array.from(newSelected));
  };

  // 老王说：处理全选
  const handleSelectAll = () => {
    if (selectedRows.size === paginatedData.length) {
      setSelectedRows(new Set());
      onSelectionChange?.([]);
    } else {
      const allIds = new Set(paginatedData.map((row) => row.id));
      setSelectedRows(allIds);
      onSelectionChange?.(Array.from(allIds));
    }
  };

  // 老王说：渲染表格
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-neutral-400">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-400">错误: {error}</div>
      </div>
    );
  }

  if (paginatedData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-neutral-400">暂无数据</div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* 老王说：表格容器 */}
      <div className="overflow-x-auto border border-white/10 rounded-lg">
        <table className="w-full">
          {/* 老王说：表头 */}
          <thead className="bg-neutral-900/50 border-b border-white/10">
            <tr>
              {selectable && (
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === paginatedData.length && paginatedData.length > 0}
                    onChange={handleSelectAll}
                    className="h-4 w-4 rounded border-white/20"
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  onClick={() => handleSort(column.key)}
                  className={`px-4 py-3 text-left text-sm font-semibold text-neutral-300 ${
                    sortable && column.sortable !== false ? "cursor-pointer hover:text-white" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {column.label}
                    {sortable && column.sortable !== false && sortConfig.key === column.key && (
                      <span className="text-xs">
                        {sortConfig.direction === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* 老王说：表体 */}
          <tbody>
            {paginatedData.map((row, rowIndex) => (
              <tr
                key={row.id || rowIndex}
                onClick={() => onRowClick?.(row)}
                className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
              >
                {selectable && (
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedRows.has(row.id)}
                      onChange={() => handleRowSelect(row.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4 rounded border-white/20"
                    />
                  </td>
                )}
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-3 text-sm text-neutral-300">
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 老王说：分页控件 */}
      {paginated && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-neutral-400">
            显示 {(currentPage - 1) * pageSize + 1} 到{" "}
            {Math.min(currentPage * pageSize, sortedData.length)} 条，共 {sortedData.length} 条
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded border border-white/10 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/5"
            >
              上一页
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-2 py-1 rounded text-sm ${
                    currentPage === page
                      ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400"
                      : "border border-white/10 hover:bg-white/5"
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded border border-white/10 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/5"
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
