"use client";

import { useEffect, useMemo, useState } from "react";
import SiteHeader from "../layout/SiteHeader";
import HeroCarousel from "./HeroCarousel";
import Rail from "./Rail";
import Chip from "../common/Chip";
import Skeleton from "../common/Skeleton";
import useCountdown from "../../hooks/useCountdown";
import { useAdultGateStore } from "../../store/useAdultGateStore";
import { useHomeStore } from "../../store/useHomeStore";
import { useWalletStore } from "../../store/useWalletStore";
import { useFollowStore } from "../../store/useFollowStore";
import { track } from "../../lib/analytics";
import { SERIES_CATALOG } from "../../lib/seriesCatalog";

const heroItems = [
  {
    id: "hero-1",
    title: "Midnight Contract",
    description: "A contract that binds two rivals under the midnight moon.",
    coverTone: "warm",
  },
  {
    id: "hero-2",
    title: "Crimson Promise",
    description: "A deadly promise turns into an unexpected romance.",
    coverTone: "dusk",
  },
];

const railData = {
  popular: [
    { id: "p1", title: "Bloom", subtitle: "Romance", coverTone: "warm" },
    { id: "p2", title: "Ashes", subtitle: "Drama", coverTone: "noir" },
    { id: "p3", title: "Nova", subtitle: "Sci-Fi", coverTone: "cool" },
  ],
  daily: [
    { id: "d1", title: "Everyday", subtitle: "Slice", coverTone: "cool" },
    { id: "d2", title: "Velvet", subtitle: "Drama", coverTone: "dusk" },
    { id: "d3", title: "Echo", subtitle: "Mystery", coverTone: "neon" },
  ],
  ttf: [
    { id: "t1", title: "Sunrise", subtitle: "TTF", coverTone: "warm", badge: "TTF" },
    { id: "t2", title: "Low Tide", subtitle: "TTF", coverTone: "cool", badge: "TTF" },
    { id: "t3", title: "Nightfall", subtitle: "TTF", coverTone: "noir", badge: "TTF" },
  ],
  completed: [
    { id: "c1", title: "Closure", subtitle: "Completed", coverTone: "neon" },
    { id: "c2", title: "Finale", subtitle: "Completed", coverTone: "dusk" },
  ],
  adult: [
    { id: "a1", title: "After Dark", subtitle: "Adult", coverTone: "noir", badge: "18+" },
    { id: "a2", title: "Velvet Room", subtitle: "Adult", coverTone: "dusk", badge: "18+" },
  ],
};

function parseLatestNumber(value) {
  if (!value) {
    return 0;
  }
  const match = String(value).match(/(\d+)/);
  if (!match) {
    return 0;
  }
  return Number.parseInt(match[1], 10) || 0;
}

function WalletAside() {
  const { paidPts, bonusPts, plan } = useWalletStore();
  const readyAt = useMemo(() => Date.now() + 2 * 60 * 60 * 1000, []);
  const { formatted } = useCountdown(readyAt);

  return (
    <aside className="space-y-4">
      <div className="rounded-2xl border border-neutral-900 bg-neutral-900/50 p-4">
        <h3 className="text-sm font-semibold">Wallet</h3>
        <div className="mt-3 space-y-2 text-xs text-neutral-400">
          <div>Paid: {paidPts}</div>
          <div>Bonus: {bonusPts}</div>
          <div>Plan: {plan}</div>
        </div>
      </div>
      <div className="rounded-2xl border border-neutral-900 bg-neutral-900/50 p-4">
        <h3 className="text-sm font-semibold">TTF Countdown</h3>
        <p className="mt-3 text-xs text-neutral-400">Next free unlock in</p>
        <p className="mt-2 text-lg font-semibold">{formatted || "--:--:--"}</p>
        <button className="mt-4 w-full rounded-full border border-neutral-700 px-4 py-2 text-xs">
          Subscribe
        </button>
      </div>
    </aside>
  );
}

export default function HomePage() {
  const { isAdultMode } = useAdultGateStore();
  const { homeTab } = useHomeStore();
  const { followedSeriesIds, loadFollowed } = useFollowStore();
  const [activeChip, setActiveChip] = useState("popular");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    track("view_home", { tab: homeTab });
  }, [homeTab]);

  useEffect(() => {
    loadFollowed();
  }, [loadFollowed]);

  const chips = useMemo(() => {
    const base = [
      { id: "popular", label: "Popular" },
      { id: "daily", label: "Daily" },
      { id: "new", label: "New" },
      { id: "completed", label: "Completed" },
      { id: "ttf", label: "TTF" },
    ];
    if (isAdultMode) {
      base.push({ id: "adult", label: "Adult" });
    }
    return base;
  }, [isAdultMode]);

  const followingUpdates = useMemo(() => {
    if (!followedSeriesIds || followedSeriesIds.length === 0) {
      return [];
    }
    const candidates = SERIES_CATALOG.filter((series) =>
      followedSeriesIds.includes(series.id)
    ).filter((series) => (isAdultMode ? true : !series.adult));
    return candidates
      .map((series) => ({
        id: series.id,
        title: series.title,
        subtitle: series.latest || "New episode",
        coverTone: series.coverTone,
        badge: series.badge,
      }))
      .sort((a, b) => parseLatestNumber(b.subtitle) - parseLatestNumber(a.subtitle));
  }, [followedSeriesIds, isAdultMode]);

  const activeRails = useMemo(() => {
    const rails = [];
    rails.push({ id: "popular", title: "Popular", items: railData.popular });
    rails.push({ id: "daily", title: "Daily", items: railData.daily });
    rails.push({ id: "new", title: "New", items: railData.popular });
    rails.push({ id: "completed", title: "Completed", items: railData.completed });
    rails.push({ id: "ttf", title: "Time Till Free", items: railData.ttf });
    if (isAdultMode) {
      rails.push({ id: "adult", title: "Adult Picks", items: railData.adult, tone: "noir" });
    }
    return rails;
  }, [isAdultMode]);

  return (
    <div className="min-h-screen bg-neutral-950">
      <SiteHeader onSearch={setQuery} />
      <main className="mx-auto max-w-6xl px-4 pb-12 pt-8">
        {loading ? (
          <div className="space-y-6">
            <Skeleton className="h-56 w-full rounded-3xl" />
            <div className="flex gap-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={`chip-${index}`} className="h-8 w-20 rounded-full" />
              ))}
            </div>
            <Skeleton className="h-40 w-full rounded-2xl" />
          </div>
        ) : (
          <div className="space-y-10">
            <HeroCarousel items={heroItems} />
            <div className="flex flex-wrap items-center gap-2">
              {chips.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setActiveChip(chip.id)}
                  className={`rounded-full px-4 py-2 text-xs font-semibold ${
                    activeChip === chip.id
                      ? "bg-white text-neutral-900"
                      : "border border-neutral-800 text-neutral-300"
                  }`}
                >
                  {chip.label}
                </button>
              ))}
              <Chip>{homeTab === "novels" ? "Novels" : "Comics"}</Chip>
              {query ? <Chip>Search: {query}</Chip> : null}
            </div>
            <div className="lg:grid lg:grid-cols-12 gap-6">
              <div className="space-y-10 lg:col-span-8">
                <section className="space-y-3">
                  {followingUpdates.length === 0 ? (
                    <div className="rounded-2xl border border-neutral-900 bg-neutral-900/40 p-6 text-sm text-neutral-400">
                      <p className="text-lg font-semibold text-white">Following Updates</p>
                      <p className="mt-2 text-sm text-neutral-400">
                        Follow a series to see updates here.
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveChip("popular")}
                        className="mt-4 w-full rounded-full border border-neutral-700 px-4 py-2 text-xs text-neutral-200"
                      >
                        Browse popular
                      </button>
                    </div>
                  ) : (
                    <Rail title="Following Updates" items={followingUpdates} />
                  )}
                </section>
                {activeRails.map((rail) => (
                  <Rail key={rail.id} title={rail.title} items={rail.items} tone={rail.tone} />
                ))}
              </div>
              <div className="lg:col-span-4">
                <WalletAside />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
