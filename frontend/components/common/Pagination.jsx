"use client";

import { memo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * 老王注释：分页组件 - 支持页码跳转和显示总数
 * 功能：提供分页导航功能
 * 遵循KISS原则：简洁的分页实现
 * 遵循DRY原则：可复用的Pagination组件
 */

export const Pagination = memo(function Pagination({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  itemsPerPage = 20,
  onPageChange,
  className = ""
}) {
  // 老王注释：计算显示的页码范围
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5; // 最多显示5个页码

    if (totalPages <= maxVisible) {
      // 如果总页数小于等于5，全部显示
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // 否则显示当前页附近的页码
      let start = Math.max(1, currentPage - 2);
      let end = Math.min(totalPages, currentPage + 2);

      // 调整范围确保始终显示5个页码
      if (end - start < maxVisible - 1) {
        if (start === 1) {
          end = Math.min(totalPages, start + maxVisible - 1);
        } else {
          start = Math.max(1, end - maxVisible + 1);
        }
      }

      // 添加第一页
      if (start > 1) {
        pages.push(1);
        if (start > 2) {
          pages.push("...");
        }
      }

      // 添加中间页码
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      // 添加最后一页
      if (end < totalPages) {
        if (end < totalPages - 1) {
          pages.push("...");
        }
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange?.(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange?.(currentPage + 1);
    }
  };

  const handlePageClick = (page) => {
    if (typeof page === "number" && page !== currentPage) {
      onPageChange?.(page);
    }
  };

  // 老王注释：计算当前显示的数据范围
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  if (totalPages <= 1) {
    return null; // 只有一页时不显示分页
  }

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 ${className}`}>
      {/* 老王注释：显示数据范围 */}
      <div className="text-sm text-neutral-400">
        显示 <span className="font-medium text-neutral-200">{startItem}</span> 到{" "}
        <span className="font-medium text-neutral-200">{endItem}</span> 条，共{" "}
        <span className="font-medium text-neutral-200">{totalItems}</span> 条
      </div>

      {/* 老王注释：分页按钮 */}
      <div className="flex items-center gap-2">
        {/* 上一页按钮 */}
        <button
          type="button"
          onClick={handlePrevious}
          disabled={currentPage === 1}
          className="flex items-center justify-center w-9 h-9 rounded-lg border border-neutral-800 text-neutral-400 transition-all duration-300 hover:border-neutral-700 hover:bg-white/5 hover:text-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-neutral-800 disabled:hover:bg-transparent"
          aria-label="Previous page"
        >
          <ChevronLeft size={18} />
        </button>

        {/* 页码按钮 */}
        {getPageNumbers().map((page, index) => {
          if (page === "...") {
            return (
              <span
                key={`ellipsis-${index}`}
                className="flex items-center justify-center w-9 h-9 text-neutral-500"
              >
                ...
              </span>
            );
          }

          return (
            <button
              key={page}
              type="button"
              onClick={() => handlePageClick(page)}
              className={`flex items-center justify-center w-9 h-9 rounded-lg text-sm font-medium transition-all duration-300 ${
                page === currentPage
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                  : "border border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:bg-white/5 hover:text-neutral-200"
              }`}
              aria-label={`Page ${page}`}
              aria-current={page === currentPage ? "page" : undefined}
            >
              {page}
            </button>
          );
        })}

        {/* 下一页按钮 */}
        <button
          type="button"
          onClick={handleNext}
          disabled={currentPage === totalPages}
          className="flex items-center justify-center w-9 h-9 rounded-lg border border-neutral-800 text-neutral-400 transition-all duration-300 hover:border-neutral-700 hover:bg-white/5 hover:text-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-neutral-800 disabled:hover:bg-transparent"
          aria-label="Next page"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
});

export default Pagination;
