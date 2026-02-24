"use client";

import { memo, useEffect, useState } from "react";

const SEARCH_HISTORY_KEY = "mn_search_history";
const MAX_HISTORY_ITEMS = 10;

/**
 * 老王注释：搜索历史和建议组件
 * 显示最近搜索历史和热门搜索建议
 */
const SearchHistoryPanel = memo(function SearchHistoryPanel({ onSearch, hotKeywords = [] }) {
  const [history, setHistory] = useState([]);

  // 老王注释：从localStorage加载搜索历史
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem(SEARCH_HISTORY_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setHistory(Array.isArray(parsed) ? parsed : []);
        } catch (err) {
          setHistory([]);
        }
      }
    }
  }, []);

  // 老王注释：添加搜索历史
  const addToHistory = (keyword) => {
    if (!keyword || !keyword.trim()) {
      return;
    }

    const trimmed = keyword.trim();
    const newHistory = [
      trimmed,
      ...history.filter((item) => item !== trimmed),
    ].slice(0, MAX_HISTORY_ITEMS);

    setHistory(newHistory);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
    }
  };

  // 老王注释：删除单个历史记录
  const removeFromHistory = (keyword) => {
    const newHistory = history.filter((item) => item !== keyword);
    setHistory(newHistory);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
    }
  };

  // 老王注释：清空所有历史
  const clearHistory = () => {
    setHistory([]);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(SEARCH_HISTORY_KEY);
    }
  };

  // 老王注释：处理搜索点击
  const handleSearch = (keyword) => {
    addToHistory(keyword);
    if (onSearch) {
      onSearch(keyword);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* 老王注释：搜索历史 */}
      {history.length > 0 ? (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium text-neutral-300 md:text-base">Recent Searches</h3>
            <button
              type="button"
              onClick={clearHistory}
              className="min-h-[44px] rounded-lg px-3 py-2 text-xs text-neutral-500 hover:text-neutral-300 active:bg-neutral-900 md:text-sm"
            >
              Clear All
            </button>
          </div>
          <div className="space-y-2">
            {history.map((keyword, index) => (
              <div
                key={`${keyword}-${index}`}
                className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900/50 px-3 py-3 hover:border-neutral-700 md:py-2"
              >
                <svg
                  className="h-4 w-4 flex-shrink-0 text-neutral-500 md:h-5 md:w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <button
                  type="button"
                  onClick={() => handleSearch(keyword)}
                  className="flex-1 text-left text-sm text-neutral-300 hover:text-white active:text-emerald-400 md:text-base"
                >
                  {keyword}
                </button>
                <button
                  type="button"
                  onClick={() => removeFromHistory(keyword)}
                  className="flex min-h-[44px] min-w-[44px] flex-shrink-0 items-center justify-center text-neutral-500 hover:text-neutral-300 active:text-red-400"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* 老王注释：热门搜索 */}
      {hotKeywords.length > 0 ? (
        <div>
          <h3 className="mb-3 text-sm font-medium text-neutral-300 md:text-base">Trending Searches</h3>
          <div className="space-y-2">
            {hotKeywords.slice(0, 8).map((keyword, index) => (
              <button
                key={`${keyword}-${index}`}
                type="button"
                onClick={() => handleSearch(keyword)}
                className="flex min-h-[44px] w-full items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-900/50 px-3 py-3 text-left hover:border-neutral-700 active:border-emerald-500 active:bg-emerald-500/10 md:py-2"
              >
                <span
                  className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-xs font-bold md:h-5 md:w-5 md:text-[10px] ${
                    index < 3
                      ? "bg-emerald-500 text-white"
                      : "bg-neutral-800 text-neutral-400"
                  }`}
                >
                  {index + 1}
                </span>
                <span className="flex-1 text-sm text-neutral-300 md:text-base">{keyword}</span>
                <svg
                  className="h-4 w-4 flex-shrink-0 text-neutral-500 md:h-5 md:w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* 老王注释：搜索建议 */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-neutral-300 md:text-base">Quick Searches</h3>
        <div className="flex flex-wrap gap-2">
          {["Romance", "Action", "Fantasy", "Comedy", "Completed", "New Releases"].map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => handleSearch(suggestion)}
              className="min-h-[44px] rounded-full border border-neutral-800 bg-neutral-900/50 px-4 py-2 text-xs text-neutral-400 hover:border-emerald-500 hover:text-emerald-400 active:bg-emerald-500/10 md:text-sm"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});

export default SearchHistoryPanel;
