// 鑰佺帇锛氬垎椤甸€昏緫hook锛岀粺涓€绠＄悊鍒嗛〉鐘舵€?"use client";

import { useState, useMemo, useEffect } from "react";

export function usePagination(items, itemsPerPage = 20, dependencies = []) {
  const [currentPage, setCurrentPage] = useState(1);

  // 鑰佺帇锛氳绠楀綋鍓嶉〉鐨勬暟鎹?
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return items.slice(startIndex, endIndex);
  }, [items, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(items.length / itemsPerPage);

  // 鑰佺帇锛氫緷璧栭」鍙樺寲鏃堕噸缃埌绗竴椤?
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