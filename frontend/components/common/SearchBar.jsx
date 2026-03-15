"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search, Trash2, TrendingUp, X } from "lucide-react";
import { useSearchShortcutLabel } from "../../hooks/useSearchShortcutLabel";
import {
  clearSearchHistory,
  readSearchHistory,
  removeSearchHistoryItem,
  saveSearchHistoryItem,
  subscribeSearchHistory,
} from "../../lib/searchHistory";

const MAX_HISTORY_ITEMS = 5;
const DEFAULT_DISCOVERY_LANES = [
  {
    id: "popular-week",
    label: "Popular this week",
    hint: "Open the live chart",
    href: "/rankings?type=popular&window=week",
  },
  {
    id: "completed",
    label: "Completed",
    hint: "Binge-ready series",
    href: "/search?status=Completed&sort=popular",
  },
  {
    id: "free-unlocks",
    label: "Free unlocks",
    hint: "Read before topping up",
    href: "/rankings?type=ttf&window=all",
  },
  {
    id: "romance",
    label: "Romance",
    hint: "Jump into a proven lane",
    query: "Romance",
  },
];

const SearchBar = memo(function SearchBar({ onSearch, placeholder = "Search series" }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const shortcutLabel = useSearchShortcutLabel();

  useEffect(() => {
    setSearchHistory(readSearchHistory({ limit: MAX_HISTORY_ITEMS }));
    return subscribeSearchHistory(setSearchHistory, { limit: MAX_HISTORY_ITEMS });
  }, []);

  const saveToHistory = useCallback((query) => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return;
    }

    const updated = saveSearchHistoryItem(trimmed, { limit: MAX_HISTORY_ITEMS });
    setSearchHistory(updated);
  }, []);

  const handleSearch = useCallback(
    (query) => {
      const trimmed = query.trim();
      if (!trimmed) {
        return;
      }
      setIsSearching(true);
      saveToHistory(trimmed);
      setShowSuggestions(false);
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
      window.setTimeout(() => setIsSearching(false), 500);
    },
    [router, saveToHistory]
  );

  const handleChange = useCallback(
    (event) => {
      const nextValue = event.target.value;
      setValue(nextValue);
      onSearch?.(nextValue);
      setShowSuggestions(nextValue.length > 0 || searchHistory.length > 0);
    },
    [onSearch, searchHistory.length]
  );

  const handleClear = useCallback(() => {
    setValue("");
    onSearch?.("");
    setShowSuggestions(false);
    inputRef.current?.focus();
  }, [onSearch]);

  const handleHistoryClick = useCallback(
    (query) => {
      setValue(query);
      handleSearch(query);
    },
    [handleSearch]
  );
  const handleLaneClick = useCallback(
    (lane) => {
      if (lane.query) {
        setValue(lane.query);
        handleSearch(lane.query);
        return;
      }
      setShowSuggestions(false);
      router.push(lane.href);
    },
    [handleSearch, router]
  );

  const handleDeleteHistory = useCallback((event, query) => {
    event.stopPropagation();
    const updated = removeSearchHistoryItem(query, {
      currentItems: searchHistory,
      limit: MAX_HISTORY_ITEMS,
    });
    setSearchHistory(updated);
  }, [searchHistory]);

  const handleClearAllHistory = useCallback(() => {
    setSearchHistory(clearSearchHistory());
    setShowSuggestions(false);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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
      <div
        className={`relative flex items-center gap-2 rounded-[20px] border bg-white/5 backdrop-blur-md px-4 py-3 transition-all duration-300 md:py-2.5 touch-manipulation ${
          isFocused
            ? "scale-[1.02] border-emerald-500/30 shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-500/20"
            : "border-white/5 hover:border-emerald-500/20 hover:bg-white/10"
        }`}
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        <Search
          size={18}
          className={`transition-colors duration-300 md:w-4 md:h-4 ${
            isFocused ? "text-emerald-400" : "text-neutral-400"
          }`}
        />
        {isSearching ? <Loader2 size={16} className="animate-spin text-emerald-400" /> : null}
        <input
          ref={inputRef}
          type="search"
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          onFocus={() => {
            setIsFocused(true);
            setShowSuggestions(true);
          }}
          onBlur={() => setIsFocused(false)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              handleSearch(value);
            }
          }}
          className="flex-1 bg-transparent text-base md:text-sm text-neutral-200 placeholder:text-neutral-400 focus:outline-none"
        />
        {value ? (
          <button
            type="button"
            onClick={handleClear}
            className="group rounded-full p-1.5 text-neutral-400 transition-all duration-300 hover:bg-white/10 hover:text-emerald-400 hover:scale-110 active:scale-95"
            aria-label="Clear search"
          >
            <X size={14} className="transition-transform duration-300 group-hover:rotate-90" />
          </button>
        ) : null}
        {shortcutLabel ? (
          <kbd className="hidden rounded-[8px] border border-white/5 bg-white/5 px-2 py-1 text-[10px] text-neutral-400 md:block">
            {shortcutLabel}
          </kbd>
        ) : null}
      </div>

      {showSuggestions ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 animate-slide-up overflow-hidden rounded-[20px] border border-white/5 bg-neutral-900/90 backdrop-blur-xl shadow-2xl shadow-black/20">
          <div className="p-2">
            {searchHistory.length > 0 ? (
              <div>
                <div className="mb-2 flex items-center justify-between px-3 py-1">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={14} className="text-emerald-400" />
                    <span className="text-xs font-semibold text-emerald-400/80">Recent Searches</span>
                  </div>
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
                  <div
                    key={`${query}-${index}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleHistoryClick(query)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleHistoryClick(query);
                      }
                    }}
                    className="group flex w-full cursor-pointer items-center gap-3 rounded-[12px] px-3 py-2.5 text-left text-sm text-neutral-300 transition-all duration-300 hover:bg-emerald-500/10 hover:text-emerald-300 hover:translate-x-1 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 active:scale-[0.98]"
                  >
                    <Search
                      size={14}
                      className="text-neutral-400 transition-colors duration-300 group-hover:text-emerald-400"
                    />
                    <span className="flex-1">{query}</span>
                    <button
                      type="button"
                      onClick={(event) => handleDeleteHistory(event, query)}
                      className="opacity-0 group-hover:opacity-100 rounded-full p-1 text-neutral-400 transition-all duration-300 hover:bg-red-500/10 hover:text-red-400 hover:scale-110 active:scale-95"
                      aria-label="Delete this search"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            <div className={searchHistory.length > 0 ? "mt-2 border-t border-white/5 pt-2" : ""}>
              <div className="mb-2 flex items-center gap-2 px-3 py-1">
                <Search size={14} className="text-neutral-400" />
                <span className="text-xs font-semibold text-neutral-300">Quick Paths</span>
              </div>
              {DEFAULT_DISCOVERY_LANES.map((lane) => (
                <button
                  key={lane.id}
                  type="button"
                  onClick={() => handleLaneClick(lane)}
                  className="group flex w-full items-center justify-between gap-3 rounded-[12px] px-3 py-2.5 text-left transition-all duration-300 hover:bg-white/5"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-neutral-200">{lane.label}</span>
                    <span className="mt-0.5 block text-xs text-neutral-500">{lane.hint}</span>
                  </span>
                  <span className="text-xs font-semibold text-neutral-500 transition-colors duration-300 group-hover:text-emerald-300">
                    Open
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
});

export default SearchBar;
