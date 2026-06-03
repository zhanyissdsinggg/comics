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
import {
  storefrontBadgeClass,
  storefrontSecondaryButtonClass,
} from "./StorefrontPagePrimitives";

const MAX_HISTORY_ITEMS = 5;
const HOME_DISCOVERY_LANES = [
  {
    id: "featured-series",
    label: "Featured Series",
    hint: "",
    href: "/search",
  },
  {
    id: "completed-series",
    label: "Completed Series",
    hint: "",
    href: "/search?status=Completed&sort=popular",
  },
  {
    id: "browse-comics",
    label: "Comics",
    hint: "",
    href: "/comics",
  },
  {
    id: "creators",
    label: "Creators",
    hint: "",
    href: "/creators",
  },
  {
    id: "browse-interactive",
    label: "Interactive",
    hint: "",
    href: "/interactive",
  },
];

const SearchBar = memo(function SearchBar({
  onSearch,
  placeholder = "Search titles, creators, or genres",
  variant = "default",
  showShortcut = true,
  initialValue = "",
  showInteractiveNav = true,
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
  const isDark = variant === "dark";
  const discoveryLanes = HOME_DISCOVERY_LANES.filter(
    (lane) => lane.id !== "browse-interactive" || showInteractiveNav,
  );
  const discoveryHeading = "Browse";
  const shellClass = isFocused
    ? "border border-[rgba(255,79,154,0.34)] bg-[rgba(255,255,255,0.075)] text-white shadow-[0_0_0_4px_rgba(255,79,154,0.14),0_16px_36px_rgba(8,6,20,0.24)]"
    : "border border-white/12 bg-[rgba(255,255,255,0.035)] text-white shadow-[0_14px_32px_rgba(8,6,20,0.18)] hover:-translate-y-0.5 hover:border-white/18 hover:bg-[rgba(255,255,255,0.075)]";
  const searchIconClass = isFocused
    ? isDark
      ? "text-[var(--gush-accent)]"
      : "text-white"
    : isDark
      ? "text-white/60"
      : "text-white/55";

  useEffect(() => {
    setSearchHistory(readSearchHistory({ limit: MAX_HISTORY_ITEMS }));
    return subscribeSearchHistory(setSearchHistory, {
      limit: MAX_HISTORY_ITEMS,
    });
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

    const updated = saveSearchHistoryItem(trimmed, {
      limit: MAX_HISTORY_ITEMS,
    });
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
      const nextPath = params.toString()
        ? `${pathname}?${params.toString()}`
        : pathname;
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
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        closeSuggestions();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [closeSuggestions]);

  const shortcutClass = `${storefrontBadgeClass} hidden text-white/72 md:block`;

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        className={cn(
          "relative flex items-center gap-2 rounded-full px-4 py-2.5 transition-all duration-150 touch-manipulation",
          shellClass,
        )}
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        <Search
          aria-hidden="true"
          size={18}
          className={cn(
            "transition-colors duration-200 md:h-4 md:w-4",
            searchIconClass,
          )}
        />
        {isSearching ? (
          <Loader2
            size={16}
            className={cn(
              "animate-spin",
              isDark ? "text-white/60" : "text-white/55",
            )}
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
            isDark
              ? "text-white placeholder:text-white/50"
              : "text-white placeholder:text-white/50",
          )}
          aria-expanded={showSuggestions}
          aria-controls={listboxId}
          aria-label="Search series, creators, or genres"
          data-testid="storefront-search-input"
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
                ? "text-white/45 hover:bg-[rgba(255,255,255,0.075)] hover:text-white"
                : "text-white/45 hover:bg-[rgba(255,255,255,0.075)] hover:text-white",
            )}
            aria-label="Clear search"
            data-testid="storefront-search-clear"
          >
            <X className="size-3.5" />
          </Button>
        ) : null}
        {shortcutLabel && showShortcut ? (
          <kbd
            className={cn(
              "hidden rounded-full px-2.5 py-1 text-[10px] font-medium md:block",
              shortcutClass,
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
            "absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-[24px] border shadow-[0_20px_48px_rgba(0,0,0,0.32)] backdrop-blur-md",
            isDark
              ? "border-white/12 bg-[rgba(18,16,27,0.96)]"
              : "border-white/12 bg-[rgba(18,16,27,0.96)]",
          )}
        >
          <div className="p-2">
            {searchHistory.length > 0 ? (
              <div>
                <div className="mb-2 flex items-center justify-between px-3 py-1">
                  <div className="flex items-center gap-2">
                    <Search size={14} className="text-white/55" />
                    <span
                      className={cn(
                        "text-xs font-semibold",
                        isHome ? "text-white/55" : "text-white/55",
                      )}
                    >
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
                        ? "text-white/45 hover:bg-red-500/10 hover:text-red-400"
                        : "text-white/45 hover:bg-red-500/10 hover:text-red-400",
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
                        "flex items-center gap-2 rounded-[16px] px-2 py-1 hover:bg-[rgba(255,255,255,0.075)]",
                      )}
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => handleHistoryClick(query)}
                        className={cn(
                          "h-auto flex-1 justify-start gap-3 rounded-[14px] px-3 py-2.5 text-left text-sm hover:bg-transparent",
                          isHome
                            ? "text-white/70 hover:text-white"
                            : "text-white/70 hover:text-white",
                        )}
                      >
                        <Search
                          className={cn(
                            "size-3.5",
                            isHome ? "text-white/40" : "text-white/40",
                          )}
                        />
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
                            ? "text-white/40 hover:bg-red-500/10 hover:text-red-400"
                            : "text-white/40 hover:bg-red-500/10 hover:text-red-400",
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

            <div
              className={cn(
                searchHistory.length > 0
                  ? "mt-2 border-t border-white/10 pt-2"
                  : "",
              )}
            >
              <div className="mb-2 flex items-center gap-2 px-3 py-1">
                <Search
                  size={14}
                  className={cn(isHome ? "text-white/40" : "text-white/40")}
                />
                <span
                  className={cn(
                    "text-xs font-semibold",
                    isHome ? "text-white/55" : "text-white/55",
                  )}
                >
                  {discoveryHeading}
                </span>
              </div>
              <div className="space-y-1">
                {discoveryLanes.map((lane, index) => (
                  <Button
                    key={lane.id}
                    type="button"
                    variant="ghost"
                    onClick={() => handleLaneClick(lane)}
                    className={cn(
                      "h-auto w-full justify-between rounded-[16px] px-3 py-3 text-left hover:bg-[rgba(255,255,255,0.075)]",
                    )}
                  >
                    <span className="min-w-0">
                      <span
                        className={cn(
                          "block text-sm font-medium",
                          isHome ? "text-white" : "text-white",
                        )}
                      >
                        {lane.label}
                      </span>
                      {lane.hint ? (
                        <span
                          className={cn(
                            "mt-0.5 block text-xs",
                            isHome ? "text-white/55" : "text-white/55",
                          )}
                        >
                          {lane.hint}
                        </span>
                      ) : null}
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 text-xs font-semibold",
                        isHome ? "text-white/45" : "text-white/45",
                      )}
                    >
                      Explore
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
