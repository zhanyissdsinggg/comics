"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SiteHeader from "../layout/SiteHeader";
import EditorialHero from "../common/EditorialHero";
import SurfacePanel from "../common/SurfacePanel";
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
  const selectedWindow = searchParams.get("window") || "all";
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isAdultMode } = useAdultGateStore();

  const activeTab = TABS.find((item) => item.id === tab) || TABS[0];
  const activeWindow = WINDOWS.find((item) => item.id === selectedWindow) || WINDOWS[0];

  const handleSeriesClick = useCallback(
    (seriesId) => {
      router.push(`/series/${seriesId}`);
    },
    [router],
  );

  useEffect(() => {
    setLoading(true);
    const adultFlag = isAdultMode ? "1" : "0";
    apiGet(`/api/rankings?type=${tab}&window=${selectedWindow}&adult=${adultFlag}`).then((response) => {
      if (response.ok) {
        setList(response.data?.rankings || []);
      } else {
        setList([]);
      }
      setLoading(false);
    });
  }, [tab, selectedWindow, isAdultMode]);

  const rankingStats = useMemo(
    () => [
      {
        label: "Chart",
        value: activeTab.label,
        hint: "Current ranking lens for this page.",
      },
      {
        label: "Window",
        value: activeWindow.label,
        hint: "Time range applied to the board.",
      },
      {
        label: "Titles",
        value: loading ? "..." : list.length.toLocaleString(),
        hint: "Series loaded into the visible ranking grid.",
      },
      {
        label: "Mode",
        value: isAdultMode ? "18+" : "Standard",
        hint: "Age gate changes which catalog slice is eligible.",
      },
    ],
    [activeTab.label, activeWindow.label, isAdultMode, list.length, loading],
  );

  const filterButtonClass = (isActive) =>
    [
      "rounded-full border px-4 py-2 text-xs font-semibold transition",
      isActive
        ? "border-white/20 bg-white text-neutral-950"
        : "border-white/10 bg-black/10 text-neutral-300 hover:border-white/20 hover:bg-white/10",
    ].join(" ");

  return (
    <main className="min-h-screen bg-transparent text-neutral-100">
      <SiteHeader />
      <div className="mx-auto max-w-[1280px] space-y-6 px-4 pb-14 pt-8 sm:px-6 lg:px-8">
        <EditorialHero
          eyebrow="Ranking desk"
          title="See what is rising without digging through stale category shelves."
          description="Trending, fresh, completed, and TTF charts now live inside the same editorial shell as the rest of the browsing flow."
          secondary="Switch chart type, change time window, and jump straight into a title from a cleaner leaderboard surface."
          stats={rankingStats}
          actions={
            <>
              <button
                type="button"
                onClick={() => router.push("/comics")}
                className="rounded-full bg-white px-5 py-2.5 text-xs font-semibold text-neutral-950 transition hover:bg-neutral-200"
              >
                Browse Comics
              </button>
              <button
                type="button"
                onClick={() => router.push("/novels")}
                className="rounded-full border border-white/10 bg-black/10 px-4 py-2 text-xs font-semibold text-neutral-200 transition hover:border-white/20 hover:bg-white/10"
              >
                Browse Novels
              </button>
            </>
          }
        />

        <SurfacePanel className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">
                Controls
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white">
                Ranking filters
              </h2>
            </div>
            <p className="text-xs text-neutral-500">
              {isAdultMode ? "18+ catalog enabled" : "Standard catalog enabled"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => router.replace(`/rankings?type=${item.id}&window=${selectedWindow}`)}
                className={filterButtonClass(tab === item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {WINDOWS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => router.replace(`/rankings?type=${tab}&window=${item.id}`)}
                className={filterButtonClass(selectedWindow === item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </SurfacePanel>

        {loading ? (
          <SurfacePanel>
            <p className="text-sm text-neutral-400">Loading rankings...</p>
          </SurfacePanel>
        ) : list.length === 0 ? (
          <SurfacePanel>
            <p className="text-sm text-neutral-300">No ranked titles are available for this filter set.</p>
          </SurfacePanel>
        ) : (
          <SurfacePanel className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">
                  Leaderboard
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white">
                  {activeTab.label} chart - {activeWindow.label}
                </h2>
              </div>
              <p className="text-xs text-neutral-500">{list.length} entries loaded</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((series, index) => (
                <button
                  key={series.id}
                  type="button"
                  onClick={() => handleSeriesClick(series.id)}
                  className="rounded-[24px] border border-white/10 bg-black/10 p-4 text-left transition hover:border-white/20 hover:bg-white/[0.06]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-neutral-500">
                        Rank
                      </p>
                      <p className="mt-2 font-display text-3xl font-semibold tracking-tight text-white">
                        #{index + 1}
                      </p>
                    </div>
                    {series.badge ? <Pill>{series.badge}</Pill> : null}
                  </div>
                  <Cover tone={series.coverTone} coverUrl={series.coverUrl} className="mt-4 h-44" />
                  <div className="mt-4 space-y-2">
                    <p className="text-base font-semibold text-white">{series.title}</p>
                    <p className="text-xs text-neutral-400">
                      {series.type} - Rating {series.rating}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </SurfacePanel>
        )}
      </div>
    </main>
  );
}
