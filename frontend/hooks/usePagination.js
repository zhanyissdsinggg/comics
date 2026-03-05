// NOTE: cleaned corrupted comment.

import { useState, useMemo, useEffect } from "react";

export function usePagination(items, itemsPerPage = 20, dependencies = []) {
  const [currentPage, setCurrentPage] = useState(1);

  // NOTE: cleaned corrupted comment.
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return items.slice(startIndex, endIndex);
  }, [items, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(items.length / itemsPerPage);

  // NOTE: cleaned corrupted comment.
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