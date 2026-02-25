"use client";

import SearchBar from "../common/SearchBar";

/**
 * 老王注释：搜索栏组件 - 只负责搜索功能
 * 职责单一：显示搜索栏，处理搜索事件
 */
export default function HeaderSearch({ onSearch }) {
  return (
    <div className="flex items-center gap-3">
      <SearchBar onSearch={onSearch} placeholder="Search series" />
    </div>
  );
}
