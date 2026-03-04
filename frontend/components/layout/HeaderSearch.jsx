"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const SearchBar = dynamic(() => import("../common/SearchBar"), {
  ssr: false,
});

/**
 * 老王注释：搜索栏组件 - 只负责搜索功能
 * 职责单一：显示搜索栏，处理搜索事件
 */
export default function HeaderSearch({ onSearch }) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const onHotkey = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setEnabled(true);
      }
    };
    window.addEventListener("keydown", onHotkey);
    return () => window.removeEventListener("keydown", onHotkey);
  }, []);

  if (!enabled) {
    return (
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setEnabled(true)}
          className="flex w-full items-center gap-2 rounded-[20px] border border-white/5 bg-white/5 px-4 py-2.5 text-left text-sm text-neutral-400 transition-all duration-300 hover:border-emerald-500/20 hover:bg-white/10 hover:text-neutral-200"
          aria-label="Open search"
        >
          <span className="text-base leading-none">S</span>
          <span>Search series</span>
          <span className="ml-auto hidden rounded-[8px] border border-white/5 bg-white/5 px-2 py-1 text-[10px] text-neutral-500 md:inline-block">
            Ctrl+K
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <SearchBar onSearch={onSearch} placeholder="Search series" />
    </div>
  );
}
