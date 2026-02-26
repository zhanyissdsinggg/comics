// 老王：分页逻辑hook，统一管理分页状态
"use client";

import { useState, useMemo, useEffect } from "react";

export function usePagination(items, itemsPerPage = 20, dependencies = []) {
  const [currentPage, setCurrentPage] = useState(1);

  // 老王：计算当前页的数据
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return items.slice(startIndex, endIndex);
  }, [items, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(items.length / itemsPerPage);

  // 老王：依赖项变化时重置到第一页
  useEffect(() => {
    setCurrentPage(1);
  }, dependencies);

  return {
    currentPage,
    setCurrentPage,
    paginatedItems,
    totalPages,
    itemsPerPage,
  };
}
