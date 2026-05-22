"use client";

import { useEffect, useMemo, useState } from "react";

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
      <div className="rounded-[22px] border border-white/10 bg-[rgba(255,255,255,0.05)] px-4 py-3 shadow-[0_16px_38px_rgba(8,6,20,0.22)]">
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
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center rounded-full border border-white/12 bg-[rgba(255,79,154,0.16)] px-5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(8,6,20,0.18)] transition-all hover:-translate-y-0.5 hover:border-white/18 hover:bg-[rgba(255,79,154,0.22)]"
        >
          Search
        </button>
      </div>
    </form>
  );
}
