"use client";

import { memo, useEffect, useState } from "react";
import {
  clearSearchHistory,
  readSearchHistory,
  removeSearchHistoryItem,
  saveSearchHistoryItem,
  subscribeSearchHistory,
} from "../../lib/searchHistory";

const MAX_HISTORY_ITEMS = 10;

function normalizeKeywordItem(item, index = 0) {
  if (typeof item === "string") {
    const value = item.trim();
    if (!value) {
      return null;
    }
    return {
      id: `keyword-${index}-${value}`,
      label: value,
      value,
      hint: "",
      badge: "",
    };
  }

  if (!item || typeof item !== "object") {
    return null;
  }

  const labelSource =
    item.keyword ||
    item.term ||
    item.label ||
    item.name ||
    item.query ||
    item.title ||
    "";
  const label = String(labelSource).trim();
  if (!label) {
    return null;
  }

  const hintSource =
    item.hint || item.context || item.genre || item.category || item.type || "";
  const badgeSource =
    item.badge ||
    item.trendLabel ||
    item.momentum ||
    item.deltaLabel ||
    (item.rank ? `#${item.rank}` : "");

  return {
    id: String(item.id || `keyword-${index}-${label}`),
    label,
    value: String(item.query || label).trim(),
    hint: typeof hintSource === "string" ? hintSource : "",
    badge: typeof badgeSource === "string" ? badgeSource : "",
  };
}

function normalizeKeywordList(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item, index) => normalizeKeywordItem(item, index))
    .filter(Boolean);
}

const SearchHistoryPanel = memo(function SearchHistoryPanel({
  onSearch,
  hotKeywords = [],
  quickKeywords = [],
}) {
  const [history, setHistory] = useState([]);
  const normalizedHotKeywords = normalizeKeywordList(hotKeywords);
  const normalizedQuickKeywords = normalizeKeywordList(quickKeywords);
  const trendingKeywords =
    normalizedHotKeywords.length > 0
      ? normalizedHotKeywords.slice(0, 6)
      : normalizedQuickKeywords.slice(0, 6);

  useEffect(() => {
    setHistory(readSearchHistory({ limit: MAX_HISTORY_ITEMS }));
    return subscribeSearchHistory(setHistory, { limit: MAX_HISTORY_ITEMS });
  }, []);

  const addToHistory = (keyword) => {
    if (!keyword || !keyword.trim()) {
      return;
    }

    const trimmed = keyword.trim();
    const newHistory = saveSearchHistoryItem(trimmed, {
      currentItems: history,
      limit: MAX_HISTORY_ITEMS,
    });
    setHistory(newHistory);
  };

  const removeFromHistory = (keyword) => {
    const newHistory = removeSearchHistoryItem(keyword, {
      currentItems: history,
      limit: MAX_HISTORY_ITEMS,
    });
    setHistory(newHistory);
  };

  const clearHistory = () => {
    setHistory(clearSearchHistory());
  };

  const handleSearch = (keyword) => {
    addToHistory(keyword);
    if (onSearch) {
      onSearch(keyword);
    }
  };

  return (
    <section className="border-[3px] border-black bg-white p-5 shadow-[8px_8px_0_0_rgba(0,0,0,1)] sm:p-6">
      <div className="space-y-5">
        {history.length > 0 ? (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/45">
                Recent searches
              </p>
              <button
                type="button"
                onClick={clearHistory}
                className="border-2 border-black bg-[#ffe500] px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.08em] text-black transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
              >
                Clear
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {history.map((keyword, index) => (
                <div
                  key={`${keyword}-${index}`}
                  className="inline-flex min-w-0 items-center gap-1 border-[2px] border-black bg-[#f5f1ea] px-2 py-1.5 transition-all hover:bg-[#fff6c7]"
                >
                  <button
                    type="button"
                    onClick={() => handleSearch(keyword)}
                    className="max-w-[12rem] truncate px-2 text-sm font-bold uppercase tracking-[0.04em] text-black transition-colors hover:text-[#ff007a]"
                  >
                    {keyword}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFromHistory(keyword)}
                    className="flex h-7 w-7 flex-shrink-0 items-center justify-center border border-transparent text-black/55 transition-colors hover:border-black hover:bg-white hover:text-black"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
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

        {trendingKeywords.length > 0 ? (
          <div className="space-y-2.5 border-t-[3px] border-black pt-5">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/45">
              {normalizedHotKeywords.length > 0
                ? "Popular right now"
                : "Browse"}
            </p>
            <div className="flex flex-wrap gap-2">
              {trendingKeywords.map((keyword, index) => (
                <button
                  key={keyword.id}
                  type="button"
                  onClick={() => handleSearch(keyword.value)}
                  className="inline-flex max-w-full items-center gap-2 border-[2px] border-black bg-white px-3 py-2 text-left shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-[#fff6c7] hover:shadow-none active:bg-[#ffe500]"
                >
                  <span
                    className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                      index < 3
                        ? "bg-[#ff007a] text-white"
                        : "bg-[#f5f1ea] text-black/65"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="max-w-[11rem] truncate text-sm font-bold uppercase tracking-[0.04em] text-black">
                    {keyword.label}
                  </span>
                  {keyword.hint ? (
                    <span className="hidden max-w-[10rem] truncate text-xs font-semibold text-black/55 sm:inline">
                      {keyword.hint}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
});

export default SearchHistoryPanel;
