"use client";

import { memo, useState, useEffect, useRef, useCallback } from "react";
import { Search, X, TrendingUp, Loader2, Trash2 } from "lucide-react"; // 老王添加：Loader2 和 Trash2 图标
import { useRouter } from "next/navigation";

/**
 * 老王注释：搜索栏组件
 * 功能：提供搜索输入、建议、历史记录
 * 遵循KISS原则：简洁的搜索体验
 * 遵循DRY原则：统一的搜索逻辑
 */
const SearchBar = memo(function SearchBar({ onSearch, placeholder = "Search series" }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  const [isSearching, setIsSearching] = useState(false); // 老王添加：搜索加载状态
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  // 老王注释：加载搜索历史
  useEffect(() => {
    const history = localStorage.getItem("mn_search_history");
    if (history) {
      try {
        setSearchHistory(JSON.parse(history));
      } catch (error) {
        // 老王注释：解析失败就清空
        localStorage.removeItem("mn_search_history");
      }
    }
  }, []);

  // 老王注释：保存搜索历史
  // 老王修复：将localStorage操作移到React状态更新之外，确保立即执行
  const saveToHistory = useCallback((query) => {
    if (!query || query.trim().length < 2) {
      return;
    }
    const trimmed = query.trim();

    // ✅ 立即更新localStorage（同步操作，不依赖React状态更新时机）
    const history = JSON.parse(localStorage.getItem("mn_search_history") || "[]");
    const filtered = history.filter((item) => item !== trimmed);
    const updated = [trimmed, ...filtered].slice(0, 5);
    localStorage.setItem("mn_search_history", JSON.stringify(updated));

    // ✅ 然后更新React状态（用于UI显示）
    setSearchHistory(updated);
  }, []);

  // 老王注释：处理搜索
  const handleSearch = useCallback(
    (query) => {
      const trimmed = query.trim();
      if (!trimmed) {
        return;
      }
      setIsSearching(true); // 老王添加：显示加载状态
      saveToHistory(trimmed);
      setShowSuggestions(false);
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
      // 老王添加：延迟重置加载状态，让用户看到反馈
      setTimeout(() => setIsSearching(false), 500);
    },
    [router, saveToHistory]
  );

  // 老王注释：处理输入变化
  const handleChange = useCallback(
    (event) => {
      const newValue = event.target.value;
      setValue(newValue);
      onSearch?.(newValue);
      setShowSuggestions(newValue.length > 0 || searchHistory.length > 0);
    },
    [onSearch, searchHistory.length]
  );

  // 老王注释：清除输入
  const handleClear = useCallback(() => {
    setValue("");
    onSearch?.("");
    setShowSuggestions(false);
    inputRef.current?.focus();
  }, [onSearch]);

  // 老王注释：点击历史记录
  const handleHistoryClick = useCallback(
    (query) => {
      setValue(query);
      handleSearch(query);
    },
    [handleSearch]
  );

  // 老王添加：删除单个搜索历史
  const handleDeleteHistory = useCallback((event, query) => {
    event.stopPropagation(); // 阻止事件冒泡，避免触发搜索
    setSearchHistory((prev) => {
      const updated = prev.filter((item) => item !== query);
      localStorage.setItem("mn_search_history", JSON.stringify(updated));
      return updated;
    });
  }, []);

  // 老王添加：清空所有搜索历史
  const handleClearAllHistory = useCallback(() => {
    setSearchHistory([]);
    localStorage.removeItem("mn_search_history");
    setShowSuggestions(false);
  }, []);

  // 老王注释：快捷键支持（Ctrl+K / Cmd+K）
  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // 老王注释：点击外部关闭建议
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* iOS风格搜索输入框 - 毛玻璃背景 + 大圆角 + 聚焦时放大并发光 */}
      <div
        className={`relative flex items-center gap-2 rounded-[20px] border bg-white/5 backdrop-blur-md px-4 py-3 transition-all duration-300 md:py-2.5 touch-manipulation ${
          isFocused
            ? "scale-[1.02] border-emerald-500/30 shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-500/20"
            : "border-white/5 hover:border-emerald-500/20 hover:bg-white/10"
        }`}
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        <Search size={18} className={`transition-colors duration-300 md:w-4 md:h-4 ${isFocused ? "text-emerald-400" : "text-neutral-400"}`} />
        {/* 老王添加：搜索加载状态 */}
        {isSearching && (
          <Loader2 size={16} className="animate-spin text-emerald-400" />
        )}
        <input
          ref={inputRef}
          type="search"
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          onFocus={() => {
            setIsFocused(true);
            setShowSuggestions(value.length > 0 || searchHistory.length > 0);
          }}
          onBlur={() => setIsFocused(false)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              handleSearch(value);
            }
          }}
          className="flex-1 bg-transparent text-base md:text-sm text-neutral-200 placeholder:text-neutral-400 focus:outline-none"
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="group rounded-full p-1.5 text-neutral-400 transition-all duration-300 hover:bg-white/10 hover:text-emerald-400 hover:scale-110 active:scale-95"
            aria-label="Clear search"
          >
            <X size={14} className="transition-transform duration-300 group-hover:rotate-90" />
          </button>
        )}
        <kbd className="hidden rounded-[8px] border border-white/5 bg-white/5 px-2 py-1 text-[10px] text-neutral-400 md:block">
          ⌘K
        </kbd>
      </div>

      {/* iOS风格搜索建议/历史 - 毛玻璃卡片 + 滑入动画 */}
      {showSuggestions && searchHistory.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 animate-slide-up overflow-hidden rounded-[20px] border border-white/5 bg-neutral-900/90 backdrop-blur-xl shadow-2xl shadow-black/20">
          <div className="p-2">
            <div className="mb-2 flex items-center justify-between px-3 py-1">
              <div className="flex items-center gap-2">
                <TrendingUp size={14} className="text-emerald-400" />
                <span className="text-xs font-semibold text-emerald-400/80">Recent Searches</span>
              </div>
              {/* 老王添加：清空所有历史按钮 */}
              <button
                type="button"
                onClick={handleClearAllHistory}
                className="group flex items-center gap-1 rounded-[8px] px-2 py-1 text-[10px] text-neutral-400 transition-all duration-300 hover:bg-red-500/10 hover:text-red-400 active:scale-95"
                aria-label="Clear all history"
              >
                <Trash2 size={10} className="transition-transform duration-300 group-hover:scale-110" />
                <span>Clear</span>
              </button>
            </div>
            {searchHistory.map((query, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleHistoryClick(query)}
                className="group flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-left text-sm text-neutral-300 transition-all duration-300 hover:bg-emerald-500/10 hover:text-emerald-300 hover:translate-x-1 active:scale-[0.98]"
              >
                <Search size={14} className="text-neutral-400 transition-colors duration-300 group-hover:text-emerald-400" />
                <span className="flex-1">{query}</span>
                {/* 老王添加：删除单个历史按钮 */}
                <button
                  type="button"
                  onClick={(e) => handleDeleteHistory(e, query)}
                  className="opacity-0 group-hover:opacity-100 rounded-full p-1 text-neutral-400 transition-all duration-300 hover:bg-red-500/10 hover:text-red-400 hover:scale-110 active:scale-95"
                  aria-label="Delete this search"
                >
                  <X size={12} />
                </button>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

export default SearchBar;
