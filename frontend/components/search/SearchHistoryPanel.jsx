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
    <section className="rounded-[28px] border border-black/10 bg-[linear-gradient(180deg,#ffffff_0%,#fafbfc_100%)] p-5 shadow-[0_18px_42px_rgba(15,23,42,0.08)] sm:p-6">
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
                className="rounded-full border border-black/12 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-black/72 shadow-[0_8px_18px_rgba(15,23,42,0.06)] transition-[background-color,border-color,box-shadow,transform] duration-200 hover:border-black/18 hover:bg-black/[0.03] hover:shadow-[0_10px_20px_rgba(15,23,42,0.08)] active:translate-y-px"
              >
                Clear
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {history.map((keyword, index) => (
                <div
                  key={`${keyword}-${index}`}
                  className="inline-flex min-w-0 items-center gap-1 rounded-full border border-black/10 bg-[#f6f7f9] px-2 py-1.5 transition-colors duration-200 hover:bg-white"
                >
                  <button
                    type="button"
                    onClick={() => handleSearch(keyword)}
                    className="max-w-[12rem] truncate px-2 text-sm font-semibold tracking-[0.01em] text-black transition-colors hover:text-black/72"
                  >
                    {keyword}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFromHistory(keyword)}
                    className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-transparent text-black/45 transition-colors hover:border-black/10 hover:bg-white hover:text-black"
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
          <div className="space-y-2.5 border-t border-black/8 pt-5">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/45">
              {normalizedHotKeywords.length > 0
                ? "Popular"
                : "Browse"}
            </p>
            <div className="flex flex-wrap gap-2">
              {trendingKeywords.map((keyword, index) => (
                <button
                  key={keyword.id}
                  type="button"
                  onClick={() => handleSearch(keyword.value)}
                  className="inline-flex max-w-full items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-2 text-left shadow-[0_10px_24px_rgba(15,23,42,0.06)] transition-[background-color,border-color,box-shadow,transform] duration-200 hover:border-black/16 hover:bg-black/[0.02] hover:shadow-[0_12px_26px_rgba(15,23,42,0.08)] active:translate-y-px"
                >
                  <span
                    className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                      index < 3
                        ? "bg-black text-white"
                        : "bg-[#f3f4f6] text-black/55"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="max-w-[11rem] truncate text-sm font-semibold tracking-[0.01em] text-black">
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
