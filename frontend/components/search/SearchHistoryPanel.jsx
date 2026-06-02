"use client";

import { memo, useEffect, useState } from "react";
import {
  clearSearchHistory,
  readSearchHistory,
  removeSearchHistoryItem,
  saveSearchHistoryItem,
  subscribeSearchHistory,
} from "../../lib/searchHistory";
import {
  storefrontBadgeClass,
  storefrontSecondaryButtonClass,
  storefrontSoftCardClass,
} from "../common/StorefrontPagePrimitives";

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
    <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,17,31,0.94)_0%,rgba(12,12,22,0.92)_100%)] p-5 text-white shadow-[0_22px_52px_rgba(8,6,20,0.3)] backdrop-blur-2xl sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,92,163,0.12),transparent_28%),radial-gradient(circle_at_top_right,rgba(92,228,255,0.08),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.07),transparent_32%)]" />
      <div className="pointer-events-none absolute inset-[1px] rounded-[27px] border border-white/6" />
      <div className="relative space-y-5">
        {history.length > 0 ? (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/62">
                Recent searches
              </p>
              <button
                type="button"
                onClick={clearHistory}
                className={`${storefrontSecondaryButtonClass} px-3 py-1.5 text-[11px]`}
              >
                Clear
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {history.map((keyword, index) => (
                <div
                  key={`${keyword}-${index}`}
                  className={`inline-flex min-w-0 items-center gap-1 ${storefrontSoftCardClass} rounded-full px-2 py-1.5`}
                >
                  <button
                    type="button"
                    onClick={() => handleSearch(keyword)}
                    className="max-w-[12rem] truncate px-2 text-sm font-semibold tracking-[0.01em] text-white/90"
                  >
                    {keyword}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFromHistory(keyword)}
                    className={`${storefrontBadgeClass} h-7 w-7 flex-shrink-0 justify-center border-transparent px-0 py-0 text-white/60 hover:border-white/12 hover:bg-[rgba(255,255,255,0.075)] hover:text-white`}
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
          <div className="space-y-2.5 border-t border-white/10 pt-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/62">
              Trending
            </p>
            <div className="flex flex-wrap gap-2">
              {trendingKeywords.map((keyword, index) => (
                <button
                  key={keyword.id}
                  type="button"
                  onClick={() => handleSearch(keyword.value)}
                  className={`inline-flex max-w-full items-center gap-2 rounded-full ${storefrontSoftCardClass} px-3 py-2 text-left hover:border-cyan-300/24 hover:bg-[rgba(255,255,255,0.075)]`}
                >
                  <span
                    className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                      index < 3
                        ? "border border-[rgba(255,214,130,0.22)] bg-[rgba(247,195,91,0.22)] text-white"
                        : `${storefrontBadgeClass} h-5 w-5 border-white/12 px-0 py-0 text-white/75`
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="max-w-[11rem] truncate text-sm font-semibold tracking-[0.01em] text-white">
                    {keyword.label}
                  </span>
                  {keyword.hint ? (
                    <span className="hidden max-w-[10rem] truncate text-xs font-semibold text-white/70 sm:inline">
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
