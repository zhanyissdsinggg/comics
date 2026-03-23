"use client";

import { memo, useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Loader2, Search, Trash2, TrendingUp, X } from "lucide-react";
import { useSearchShortcutLabel } from "../../hooks/useSearchShortcutLabel";
import {
  clearSearchHistory,
  readSearchHistory,
  removeSearchHistoryItem,
  saveSearchHistoryItem,
  subscribeSearchHistory,
} from "../../lib/searchHistory";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const MAX_HISTORY_ITEMS = 5;
const DEFAULT_DISCOVERY_LANES = [
  {
    id: "popular-week",
    label: "Trending",
    hint: "See what readers are opening now",
    href: "/rankings?type=popular&window=week",
  },
  {
    id: "completed",
    label: "Finished series",
    hint: "Start something you can finish",
    href: "/search?status=Completed&sort=popular",
  },
  {
    id: "free-unlocks",
    label: "Start free",
    hint: "Try a few chapters first",
    href: "/rankings?type=ttf&window=all",
  },
  {
    id: "romance",
    label: "Romance",
    hint: "Start with a crowd favorite",
    query: "Romance",
  },
];

const SearchBar = memo(function SearchBar({
  onSearch,
  placeholder = "Search series",
  variant = "default",
  showShortcut = true,
  initialValue = "",
}) {
  const router = useRouter();
  const listboxId = useId();
  const [value, setValue] = useState(initialValue);
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const shortcutLabel = useSearchShortcutLabel();
  const isLight = variant === "light";

  useEffect(() => {
    setSearchHistory(readSearchHistory({ limit: MAX_HISTORY_ITEMS }));
    return subscribeSearchHistory(setSearchHistory, { limit: MAX_HISTORY_ITEMS });
  }, []);

  useEffect(() => {
    setValue(initialValue || "");
  }, [initialValue]);

  const openSuggestions = useCallback(() => {
    setShowSuggestions(true);
  }, []);

  const closeSuggestions = useCallback(() => {
    setShowSuggestions(false);
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
      closeSuggestions();
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
      window.setTimeout(() => setIsSearching(false), 500);
    },
    [closeSuggestions, router, saveToHistory],
  );

  const handleChange = useCallback(
    (event) => {
      const nextValue = event.target.value;
      setValue(nextValue);
      onSearch?.(nextValue);
      setShowSuggestions(nextValue.length > 0 || searchHistory.length > 0);
    },
    [onSearch, searchHistory.length],
  );

  const handleClear = useCallback(() => {
    setValue("");
    onSearch?.("");
    closeSuggestions();
    inputRef.current?.focus();
  }, [closeSuggestions, onSearch]);

  const handleHistoryClick = useCallback(
    (query) => {
      setValue(query);
      handleSearch(query);
    },
    [handleSearch],
  );

  const handleLaneClick = useCallback(
    (lane) => {
      if (lane.query) {
        setValue(lane.query);
        handleSearch(lane.query);
        return;
      }

      closeSuggestions();
      router.push(lane.href);
    },
    [closeSuggestions, handleSearch, router],
  );

  const handleDeleteHistory = useCallback(
    (query) => {
      const updated = removeSearchHistoryItem(query, {
        currentItems: searchHistory,
        limit: MAX_HISTORY_ITEMS,
      });
      setSearchHistory(updated);
    },
    [searchHistory],
  );

  const handleClearAllHistory = useCallback(() => {
    setSearchHistory(clearSearchHistory());
    closeSuggestions();
  }, [closeSuggestions]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        openSuggestions();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openSuggestions]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        closeSuggestions();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [closeSuggestions]);

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        className={cn(
          "relative flex items-center gap-2 rounded-full border px-4 py-2.5 transition-all duration-200 touch-manipulation",
          isLight
            ? isFocused
              ? "border-black/10 bg-white shadow-[0_0_0_4px_rgba(47,107,255,0.08)]"
              : "border-black/8 bg-white/78 shadow-[0_8px_24px_rgba(15,23,42,0.05)] hover:border-black/12 hover:bg-white"
            : isFocused
              ? "border-emerald-400/35 bg-white/[0.08] shadow-[0_0_0_4px_rgba(16,185,129,0.12)]"
              : "border-white/8 bg-white/[0.04] hover:border-white/14 hover:bg-white/[0.06]",
        )}
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        <Search
          size={18}
          className={cn(
            "transition-colors duration-200 md:h-4 md:w-4",
            isLight
              ? isFocused
                ? "text-[var(--gush-accent,#2f6bff)]"
                : "text-slate-400"
              : isFocused
                ? "text-emerald-300"
                : "text-neutral-400",
          )}
        />
        {isSearching ? (
          <Loader2
            size={16}
            className={cn("animate-spin", isLight ? "text-[var(--gush-accent,#2f6bff)]" : "text-emerald-300")}
          />
        ) : null}
        <input
          ref={inputRef}
          type="search"
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          onFocus={() => {
            setIsFocused(true);
            openSuggestions();
          }}
          onBlur={() => setIsFocused(false)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              handleSearch(value);
            }
            if (event.key === "Escape") {
              closeSuggestions();
              inputRef.current?.blur();
            }
          }}
          className={cn(
            "flex-1 bg-transparent text-base focus:outline-none md:text-sm",
            isLight ? "text-slate-900 placeholder:text-slate-400" : "text-neutral-100 placeholder:text-neutral-500",
          )}
          aria-expanded={showSuggestions}
          aria-controls={listboxId}
          aria-label="Search titles, genres, or creators"
        />
        {value ? (
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            onClick={handleClear}
            className={cn(
              "rounded-full",
              isLight
                ? "text-slate-400 hover:bg-black/[0.04] hover:text-slate-900"
                : "text-neutral-400 hover:bg-white/[0.06] hover:text-white",
            )}
            aria-label="Clear search"
          >
            <X className="size-3.5" />
          </Button>
        ) : null}
        {shortcutLabel && showShortcut ? (
          <kbd
            className={cn(
              "hidden rounded-full px-2.5 py-1 text-[10px] font-medium md:block",
              isLight ? "border border-black/8 bg-black/[0.03] text-slate-400" : "border border-white/10 bg-black/20 text-neutral-400",
            )}
          >
            {shortcutLabel}
          </kbd>
        ) : null}
      </div>

      {showSuggestions ? (
        <div
          id={listboxId}
          className={cn(
            "absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-[24px] border backdrop-blur-xl",
            isLight
              ? "border-black/8 bg-[rgba(255,255,255,0.88)] shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
              : "border-white/10 bg-neutral-950/95 shadow-[0_24px_80px_rgba(0,0,0,0.28)]",
          )}
        >
          <div className="p-2">
            {searchHistory.length > 0 ? (
              <div>
                <div className="mb-2 flex items-center justify-between px-3 py-1">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={14} className={cn(isLight ? "text-[var(--gush-accent,#2f6bff)]" : "text-emerald-300")} />
                    <span className={cn("text-xs font-semibold uppercase tracking-[0.18em]", isLight ? "text-slate-500" : "text-emerald-200/80")}>
                      Recent
                    </span>
                  </div>
                  <Button
                    type="button"
                    size="xs"
                    variant="ghost"
                    onClick={handleClearAllHistory}
                    className={cn(
                      "h-7 rounded-full px-2.5 text-[11px]",
                      isLight ? "text-slate-400 hover:bg-red-500/10 hover:text-red-500" : "text-neutral-400 hover:bg-red-500/10 hover:text-red-300",
                    )}
                    aria-label="Clear all history"
                  >
                    <Trash2 className="size-3" />
                    Clear
                  </Button>
                </div>

                <div className="space-y-1">
                  {searchHistory.map((query, index) => (
                    <div
                      key={`${query}-${index}`}
                      className={cn(
                        "flex items-center gap-2 rounded-[16px] px-2 py-1",
                        isLight ? "hover:bg-black/[0.03]" : "hover:bg-white/[0.04]",
                      )}
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => handleHistoryClick(query)}
                        className={cn(
                          "h-auto flex-1 justify-start gap-3 rounded-[14px] px-3 py-2.5 text-left text-sm hover:bg-transparent",
                          isLight ? "text-slate-700 hover:text-slate-950" : "text-neutral-200 hover:text-white",
                        )}
                      >
                        <Search className={cn("size-3.5", isLight ? "text-slate-400" : "text-neutral-500")} />
                        <span className="truncate">{query}</span>
                      </Button>
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="ghost"
                        onClick={() => handleDeleteHistory(query)}
                        className={cn(
                          "rounded-full",
                          isLight ? "text-slate-400 hover:bg-red-500/10 hover:text-red-500" : "text-neutral-500 hover:bg-red-500/10 hover:text-red-300",
                        )}
                        aria-label={`Delete ${query} from recent searches`}
                      >
                        <X className="size-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className={cn(searchHistory.length > 0 ? (isLight ? "mt-2 border-t border-black/6 pt-2" : "mt-2 border-t border-white/8 pt-2") : "")}>
              <div className="mb-2 flex items-center gap-2 px-3 py-1">
                <Search size={14} className={cn(isLight ? "text-slate-400" : "text-neutral-400")} />
                <span className={cn("text-xs font-semibold uppercase tracking-[0.18em]", isLight ? "text-slate-500" : "text-neutral-300")}>
                  Start with
                </span>
              </div>
              <div className="space-y-1">
                {DEFAULT_DISCOVERY_LANES.map((lane) => (
                  <Button
                    key={lane.id}
                    type="button"
                    variant="ghost"
                    onClick={() => handleLaneClick(lane)}
                    className={cn(
                      "h-auto w-full justify-between rounded-[16px] px-3 py-3 text-left",
                      isLight ? "hover:bg-black/[0.03]" : "hover:bg-white/[0.04]",
                    )}
                  >
                    <span className="min-w-0">
                      <span className={cn("block text-sm font-medium", isLight ? "text-slate-800" : "text-neutral-200")}>{lane.label}</span>
                      <span className={cn("mt-0.5 block text-xs", isLight ? "text-slate-500" : "text-neutral-500")}>{lane.hint}</span>
                    </span>
                    <span className={cn("inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.16em]", isLight ? "text-slate-400" : "text-neutral-500")}>
                      Go
                      <ArrowUpRight className="size-3" />
                    </span>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
});

export default SearchBar;
