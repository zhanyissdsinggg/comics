"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Sparkles } from "lucide-react";
import {
  storefrontBadgeClass,
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
} from "../common/StorefrontPagePrimitives";

function buildTrackedParams(params = {}) {
  return Object.entries(params).filter(
    ([, value]) => String(value || "").trim().length > 0,
  );
}

export default function SearchPageInput({
  initialQuery = "",
  includeAdult = false,
  persistedParams = {},
  onQueryChange,
  onTrackSearch,
  onSubmitSearch,
}) {
  const [value, setValue] = useState(String(initialQuery || ""));
  const trackedParams = useMemo(
    () => buildTrackedParams(persistedParams),
    [persistedParams],
  );

  useEffect(() => {
    setValue(String(initialQuery || ""));
  }, [initialQuery]);

  return (
    <form
      action="/search"
      method="get"
      className="space-y-3"
      onSubmit={(event) => {
        if (typeof onSubmitSearch === "function") {
          event.preventDefault();
          onSubmitSearch(value);
        }
      }}
    >
      {trackedParams.map(([key, currentValue]) => (
        <input key={key} type="hidden" name={key} value={String(currentValue)} />
      ))}
      <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.04))] px-4 py-3.5 shadow-[0_18px_40px_rgba(8,6,20,0.24)] backdrop-blur-xl">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className={`${storefrontBadgeClass} gap-2 text-white/64`}>
            <Sparkles className="size-3.5" />
            Search
          </span>
          <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/40">
            {includeAdult ? "Mature stories" : "Story picks"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className={`${storefrontSecondaryButtonClass} h-10 w-10 shrink-0 px-0 text-white/72`}>
            <Search className="size-4.5" />
          </span>
          <input
            type="search"
            name="q"
            value={value}
            placeholder="Search titles, creators, or genres..."
            aria-label="Search series, creators, or genres"
            autoComplete="off"
            onChange={(event) => {
              const nextValue = event.target.value;
              setValue(nextValue);
              onQueryChange?.(nextValue);
              onTrackSearch?.(nextValue);
            }}
            className="w-full bg-transparent text-base font-medium text-white outline-none placeholder:text-white/45"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="submit" className={storefrontPrimaryButtonClass}>
          Search stories
        </button>
      </div>
    </form>
  );
}
