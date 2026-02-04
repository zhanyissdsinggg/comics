"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SiteHeader from "../layout/SiteHeader";
import Cover from "../common/Cover";
import Pill from "../common/Pill";
import { apiGet } from "../../lib/apiClient";
import { useAdultGateStore } from "../../store/useAdultGateStore";

const TABS = [
  { id: "popular", label: "Popular" },
  { id: "new", label: "New" },
  { id: "completed", label: "Completed" },
  { id: "ttf", label: "TTF" },
];

const WINDOWS = [
  { id: "all", label: "All time" },
  { id: "week", label: "Weekly" },
  { id: "month", label: "Monthly" },
];

export default function RankingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("type") || "popular";
  const window = searchParams.get("window") || "all";
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isAdultMode } = useAdultGateStore();

  useEffect(() => {
    setLoading(true);
    const adultFlag = isAdultMode ? "1" : "0";
    apiGet(`/api/rankings?type=${tab}&window=${window}&adult=${adultFlag}`).then((response) => {
      if (response.ok) {
        setList(response.data?.results || []);
      }
      setLoading(false);
    });
  }, [tab, window, isAdultMode]);

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Rankings</h1>
          <p className="mt-2 text-sm text-neutral-400">
            Explore trending and top-rated series.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => router.replace(`/rankings?type=${item.id}&window=${window}`)}
              className={`rounded-full border px-4 py-2 text-xs ${
                tab === item.id
                  ? "border-white text-white"
                  : "border-neutral-800 text-neutral-400"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-neutral-400">
          {WINDOWS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => router.replace(`/rankings?type=${tab}&window=${item.id}`)}
              className={`rounded-full border px-3 py-1 text-xs ${
                window === item.id
                  ? "border-white text-white"
                  : "border-neutral-800 text-neutral-400"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="rounded-2xl border border-neutral-900 bg-neutral-900/50 p-6 text-sm text-neutral-400">
            Loading rankings...
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((series, index) => (
              <button
                key={series.id}
                type="button"
                onClick={() => router.push(`/series/${series.id}`)}
                className="rounded-2xl border border-neutral-900 bg-neutral-900/40 p-4 text-left"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs text-neutral-500">#{index + 1}</p>
                  {series.badge ? <Pill>{series.badge}</Pill> : null}
                </div>
                <Cover tone={series.coverTone} coverUrl={series.coverUrl} className="mt-3 h-40" />
                <div className="mt-3 space-y-1">
                  <p className="text-sm font-semibold">{series.title}</p>
                  <p className="text-xs text-neutral-400">
                    {series.type} · {series.rating}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
