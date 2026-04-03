"use client";

import { memo, useCallback, useEffect, useId, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowUpRight, Loader2, Search, Trash2, X } from "lucide-react";
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
    id: "featured-series",
    label: "Featured Series",
    hint: "Editorial shelf",
    href: "/rankings?view=featured",
  },
  {
    id: "completed",
    label: "Finished series",
    hint: "Completed stories",
    href: "/rankings?view=completed",
  },
  {
    id: "start-here",
    label: "Start Here",
    hint: "Reader picks",
    href: "/rankings?view=start-here",
  },
  {
    id: "romance",
    label: "Romance",
    hint: "Open the genre",
    query: "Romance",
  },
];

const HOME_DISCOVERY_LANES = [
  {
    id: "featured-series",
    label: "Featured Series",
    hint: "Editorial shelf",
    href: "/search",
  },
  {
    id: "completed-series",
    label: "Completed Series",
    hint: "Finished stories",
    href: "/search?status=Completed&sort=popular",
  },
  {
    id: "browse-comics",
    label: "Browse Comics",
    hint: "Comics library",
    href: "/comics",
  },
  {
    id: "creators",
    label: "Creators",
    hint: "People and studios",
    href: "/creators",
  },
];

const SearchBar = memo(function SearchBar({
  onSearch,
  placeholder = "Search series, creators...",
  variant = "default",
  showShortcut = true,
  initialValue = "",
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const listboxId = useId();
  const [value, setValue] = useState(initialValue);
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const shortcutLabel = useSearchShortcutLabel();
  const isHome = variant === "home";
  const isLight = variant === "light";
  const discoveryLanes = isLight || isHome ? HOME_DISCOVERY_LANES : DEFAULT_DISCOVERY_LANES;
  const discoveryHeading = "Browse";
  const shellClass = isHome
    ? isFocused
      ? "border-white/16 bg-white/[0.08] shadow-[0_0_0_4px_rgba(244,201,138,0.08)]"
      : "border-white/10 bg-white/[0.05] shadow-[0_14px_30px_rgba(0,0,0,0.18)] hover:border-white/16 hover:bg-white/[0.08]"
    : isLight
      ? isFocused
        ? "border-black/12 bg-white shadow-[0_0_0_4px_rgba(47,88,198,0.08)] dark:border-white/14 dark:bg-white/[0.08] dark:shadow-[0_0_0_4px_rgba(137,167,255,0.12)]"
        : "border-black/8 bg-white/92 shadow-[0_10px_22px_rgba(15,23,42,0.045)] hover:border-black/12 hover:bg-white dark:border-white/10 dark:bg-white/[0.06] dark:shadow-[0_14px_30px_rgba(0,0,0,0.22)] dark:hover:border-white/18 dark:hover:bg-white/[0.08]"
      : isFocused
        ? "border-emerald-400/35 bg-white/[0.08] shadow-[0_0_0_4px_rgba(16,185,129,0.12)]"
        : "border-white/8 bg-white/[0.04] hover:border-white/14 hover:bg-white/[0.06]";
  const searchIconClass = isHome
    ? isFocused
      ? "text-[var(--gush-home-accent)]"
      : "text-white/42"
    : isLight
      ? isFocused
        ? "text-[var(--gush-accent,#3157d6)] dark:text-[var(--gush-accent,#89a7ff)]"
        : "text-slate-400 dark:text-neutral-500"
      : isFocused
        ? "text-emerald-300"
        : "text-neutral-400";

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
    setShowSuggestions(true);
    if (pathname === "/search") {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("q");
      params.delete("query");
      params.delete("page");
      const nextPath = params.toString() ? `${pathname}?${params.toString()}` : pathname;
      router.replace(nextPath);
    }
    inputRef.current?.focus();
  }, [onSearch, pathname, router, searchParams]);

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
          "relative flex items-center gap-2 rounded-full border px-4 py-2.5 transition-all duration-200 touch-manipulation focus-within:ring-[3px] focus-within:ring-[rgba(49,87,214,0.16)]",
          shellClass,
        )}
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        <Search
          size={18}
          className={cn(
            "transition-colors duration-200 md:h-4 md:w-4",
            searchIconClass,
          )}
        />
        {isSearching ? (
          <Loader2
            size={16}
            className={cn("animate-spin", isHome ? "text-[var(--gush-home-accent)]" : isLight ? "text-[var(--gush-accent,#3157d6)]" : "text-emerald-300")}
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
            "min-w-0 flex-1 bg-transparent text-base focus:outline-none md:text-sm",
            isHome
              ? "text-white placeholder:text-white/40"
              : isLight
                ? "text-slate-900 placeholder:text-slate-400 dark:text-white dark:placeholder:text-neutral-500"
                : "text-neutral-100 placeholder:text-neutral-500",
          )}
          aria-expanded={showSuggestions}
          aria-controls={listboxId}
          aria-label="Search series, creators, or genres"
        />
        {value ? (
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            onClick={handleClear}
            className={cn(
              "rounded-full",
              isHome
                ? "text-white/42 hover:bg-white/[0.08] hover:text-white"
                : isLight
                  ? "text-slate-400 hover:bg-black/[0.04] hover:text-slate-900 dark:text-neutral-500 dark:hover:bg-white/[0.06] dark:hover:text-white"
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
              isHome
                ? "border border-white/10 bg-black/18 text-white/42"
                : isLight
                  ? "border border-black/8 bg-[rgba(246,243,237,0.92)] text-slate-400 dark:border-white/10 dark:bg-white/[0.06] dark:text-neutral-500"
                  : "border border-white/10 bg-black/20 text-neutral-400",
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
            "absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-[22px] border backdrop-blur-md",
            isHome
              ? "border-white/10 bg-[rgba(9,13,20,0.96)] shadow-[0_24px_80px_rgba(0,0,0,0.34)]"
              : isLight
                ? "border-black/8 bg-[rgba(255,255,255,0.95)] shadow-[0_16px_34px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-[rgba(12,17,25,0.96)] dark:shadow-[0_24px_80px_rgba(0,0,0,0.34)]"
              : "border-white/10 bg-neutral-950/95 shadow-[0_24px_80px_rgba(0,0,0,0.28)]",
          )}
        >
          <div className="p-2">
            {searchHistory.length > 0 ? (
              <div>
                <div className="mb-2 flex items-center justify-between px-3 py-1">
                  <div className="flex items-center gap-2">
                    <Search size={14} className={cn(isHome ? "text-[var(--gush-home-accent)]" : isLight ? "text-[var(--gush-accent,#3157d6)]" : "text-emerald-300")} />
                    <span className={cn("text-xs font-semibold", isHome ? "text-white/58" : isLight ? "text-slate-500 dark:text-neutral-400" : "text-emerald-200/80")}>
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
                      isHome
                        ? "text-white/44 hover:bg-red-500/10 hover:text-red-200"
                        : isLight
                          ? "text-slate-400 hover:bg-red-500/10 hover:text-red-500 dark:text-neutral-500 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                          : "text-neutral-400 hover:bg-red-500/10 hover:text-red-300",
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
                        isHome ? "hover:bg-white/[0.04]" : isLight ? "hover:bg-[rgba(246,243,237,0.9)] dark:hover:bg-white/[0.05]" : "hover:bg-white/[0.04]",
                      )}
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => handleHistoryClick(query)}
                        className={cn(
                          "h-auto flex-1 justify-start gap-3 rounded-[14px] px-3 py-2.5 text-left text-sm hover:bg-transparent",
                          isHome ? "text-white/78 hover:text-white" : isLight ? "text-slate-700 hover:text-slate-950 dark:text-neutral-200 dark:hover:text-white" : "text-neutral-200 hover:text-white",
                        )}
                      >
                        <Search className={cn("size-3.5", isHome ? "text-white/34" : isLight ? "text-slate-400 dark:text-neutral-500" : "text-neutral-500")} />
                        <span className="truncate">{query}</span>
                      </Button>
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="ghost"
                        onClick={() => handleDeleteHistory(query)}
                        className={cn(
                          "rounded-full",
                          isHome
                            ? "text-white/34 hover:bg-red-500/10 hover:text-red-200"
                            : isLight
                              ? "text-slate-400 hover:bg-red-500/10 hover:text-red-500 dark:text-neutral-500 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                              : "text-neutral-500 hover:bg-red-500/10 hover:text-red-300",
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

            <div className={cn(searchHistory.length > 0 ? (isHome ? "mt-2 border-t border-white/8 pt-2" : isLight ? "mt-2 border-t border-black/6 pt-2" : "mt-2 border-t border-white/8 pt-2") : "")}>
                <div className="mb-2 flex items-center gap-2 px-3 py-1">
                  <Search size={14} className={cn(isHome ? "text-white/34" : isLight ? "text-slate-400" : "text-neutral-400")} />
                  <span className={cn("text-xs font-semibold", isHome ? "text-white/58" : isLight ? "text-slate-500 dark:text-neutral-400" : "text-neutral-300")}>
                    {discoveryHeading}
                  </span>
                </div>
                <div className="space-y-1">
                  {discoveryLanes.map((lane) => (
                  <Button
                    key={lane.id}
                    type="button"
                    variant="ghost"
                    onClick={() => handleLaneClick(lane)}
                    className={cn(
                      "h-auto w-full justify-between rounded-[16px] px-3 py-3 text-left",
                      isHome ? "hover:bg-white/[0.04]" : isLight ? "hover:bg-[rgba(246,243,237,0.9)] dark:hover:bg-white/[0.05]" : "hover:bg-white/[0.04]",
                    )}
                  >
                    <span className="min-w-0">
                      <span className={cn("block text-sm font-medium", isHome ? "text-white/84" : isLight ? "text-slate-800 dark:text-white" : "text-neutral-200")}>{lane.label}</span>
                      <span className={cn("mt-0.5 block text-xs", isHome ? "text-white/42" : isLight ? "text-slate-500 dark:text-neutral-500" : "text-neutral-500")}>{lane.hint}</span>
                    </span>
                    <span className={cn("inline-flex items-center gap-1 text-xs font-semibold", isHome ? "text-white/38" : isLight ? "text-slate-400 dark:text-neutral-500" : "text-neutral-500")}>
                      Open
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
