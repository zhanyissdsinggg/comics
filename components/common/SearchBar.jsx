"use client";

import { memo, useState, useEffect, useRef, useCallback } from "react";
import { Search, X, TrendingUp } from "lucide-react";
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
  const saveToHistory = useCallback((query) => {
    if (!query || query.trim().length < 2) {
      return;
    }
    const trimmed = query.trim();
    setSearchHistory((prev) => {
      const filtered = prev.filter((item) => item !== trimmed);
      const updated = [trimmed, ...filtered].slice(0, 5);
      localStorage.setItem("mn_search_history", JSON.stringify(updated));
      return updated;
    });
  }, []);

  // 老王注释：处理搜索
  const handleSearch = useCallback(
    (query) => {
      const trimmed = query.trim();
      if (!trimmed) {
        return;
      }
      saveToHistory(trimmed);
      setShowSuggestions(false);
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
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
      {/* 老王注释：搜索输入框 */}
      <div
        className={`relative flex items-center gap-2 rounded-full border bg-neutral-900 px-4 py-2 transition-all md:py-2.5 ${
          isFocused
            ? "border-emerald-500/40 ring-2 ring-emerald-500/20"
            : "border-neutral-800"
        }`}
      >
        <Search size={16} className="text-neutral-500" />
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
          className="flex-1 bg-transparent text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none"
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="rounded-full p-1 text-neutral-500 transition-colors hover:bg-neutral-800 hover:text-neutral-300"
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
        <kbd className="hidden rounded border border-neutral-800 bg-neutral-900/50 px-1.5 py-0.5 text-[10px] text-neutral-500 md:block">
          ⌘K
        </kbd>
      </div>

      {/* 老王注释：搜索建议/历史 */}
      {showSuggestions && searchHistory.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900 shadow-xl">
          <div className="p-2">
            <div className="mb-2 flex items-center gap-2 px-3 py-1">
              <TrendingUp size={14} className="text-neutral-500" />
              <span className="text-xs font-semibold text-neutral-400">Recent Searches</span>
            </div>
            {searchHistory.map((query, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleHistoryClick(query)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-neutral-300 transition-colors hover:bg-neutral-800"
              >
                <Search size={14} className="text-neutral-500" />
                <span>{query}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

export default SearchBar;
