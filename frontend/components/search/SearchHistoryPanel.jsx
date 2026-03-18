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
const DEFAULT_QUICK_SEARCHES = ["Romance", "Action", "Fantasy", "Comedy", "Completed", "New Releases"];

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
    item.keyword || item.term || item.label || item.name || item.query || item.title || "";
  const label = String(labelSource).trim();
  if (!label) {
    return null;
  }

  const hintSource = item.hint || item.context || item.genre || item.category || item.type || "";
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

  return items.map((item, index) => normalizeKeywordItem(item, index)).filter(Boolean);
}

const SearchHistoryPanel = memo(function SearchHistoryPanel({
  onSearch,
  hotKeywords = [],
  quickKeywords = [],
}) {
  const [history, setHistory] = useState([]);
  const normalizedHotKeywords = normalizeKeywordList(hotKeywords);
  const normalizedQuickKeywords = normalizeKeywordList(quickKeywords);
  const quickSearches = normalizedQuickKeywords.length > 0
    ? normalizedQuickKeywords.slice(0, 6)
    : normalizeKeywordList(DEFAULT_QUICK_SEARCHES);

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
    <div className="space-y-4 md:space-y-6">
      {history.length > 0 ? (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-700 md:text-base">Recent</h3>
            <button
              type="button"
              onClick={clearHistory}
              className="min-h-[44px] rounded-lg px-3 py-2 text-xs text-slate-400 hover:text-slate-700 active:bg-slate-100 md:text-sm"
            >
              Clear All
            </button>
          </div>
          <div className="space-y-2">
            {history.map((keyword, index) => (
              <div
                key={`${keyword}-${index}`}
                className="flex items-center gap-2 rounded-[20px] border border-black/6 bg-white/80 px-3 py-3 shadow-[0_12px_28px_rgba(15,23,42,0.05)] hover:border-black/10 md:py-2"
              >
                <svg
                  className="h-4 w-4 flex-shrink-0 text-slate-400 md:h-5 md:w-5"
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
                  className="flex-1 text-left text-sm text-slate-700 hover:text-slate-950 active:text-[var(--gush-accent,#2f6bff)] md:text-base"
                >
                  {keyword}
                </button>
                <button
                  type="button"
                  onClick={() => removeFromHistory(keyword)}
                  className="flex min-h-[44px] min-w-[44px] flex-shrink-0 items-center justify-center text-slate-400 hover:text-slate-700 active:text-red-500"
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

      {normalizedHotKeywords.length > 0 ? (
        <div>
          <h3 className="mb-3 text-sm font-medium text-slate-700 md:text-base">Trending searches</h3>
          <div className="space-y-2">
            {normalizedHotKeywords.slice(0, 8).map((keyword, index) => (
              <button
                key={keyword.id}
                type="button"
                onClick={() => handleSearch(keyword.value)}
                className="flex min-h-[44px] w-full items-center gap-3 rounded-[20px] border border-black/6 bg-white/80 px-3 py-3 text-left shadow-[0_12px_28px_rgba(15,23,42,0.05)] hover:border-black/10 active:border-[var(--gush-accent,#2f6bff)] active:bg-[rgba(47,107,255,0.06)] md:py-2"
              >
                <span
                  className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-xs font-bold md:h-5 md:w-5 md:text-[10px] ${
                    index < 3
                      ? "bg-[var(--gush-accent,#2f6bff)] text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-slate-700 md:text-base">
                    {keyword.label}
                  </span>
                  {keyword.hint ? (
                    <span className="mt-0.5 block truncate text-xs text-slate-500">
                      {keyword.hint}
                    </span>
                  ) : null}
                </span>
                {keyword.badge ? (
                  <span className="rounded-full border border-black/8 bg-[#f8f9fc] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {keyword.badge}
                  </span>
                ) : null}
                <svg
                  className="h-4 w-4 flex-shrink-0 text-slate-400 md:h-5 md:w-5"
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

      <div>
        <h3 className="mb-3 text-sm font-medium text-slate-700 md:text-base">Browse fast</h3>
        <div className="flex flex-wrap gap-2">
          {quickSearches.map((suggestion) => (
            <button
              key={suggestion.id}
              type="button"
              onClick={() => handleSearch(suggestion.value)}
              className="min-h-[44px] rounded-full border border-black/8 bg-white/84 px-4 py-2 text-xs text-slate-500 shadow-[0_8px_22px_rgba(15,23,42,0.04)] hover:border-[var(--gush-accent,#2f6bff)] hover:text-[var(--gush-accent,#2f6bff)] active:bg-[rgba(47,107,255,0.06)] md:text-sm"
            >
              {suggestion.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});

export default SearchHistoryPanel;
