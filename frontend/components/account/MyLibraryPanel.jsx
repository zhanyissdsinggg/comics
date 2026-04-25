"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  BookMarked,
  BookOpen,
  Bookmark,
  LockKeyhole,
} from "lucide-react";
import SurfacePanel from "../common/SurfacePanel";
import {
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
} from "../common/StorefrontPagePrimitives";
import { apiGet } from "../../lib/apiClient";
import { buildPathWithAttribution } from "../../lib/paymentAttribution";
import { normalizeReadingPercent } from "../../lib/readingPercent";
import { useAdultGateStore } from "../../store/useAdultGateStore";
import { useBookmarkStore } from "../../store/useBookmarkStore";
import { useFollowStore } from "../../store/useFollowStore";
import { useHistoryStore } from "../../store/useHistoryStore";
import { useProgressStore } from "../../store/useProgressStore";

const TABS = [
  { id: "continue", label: "Continue Reading", icon: BookOpen },
  { id: "bookmarks", label: "Bookmarks", icon: Bookmark },
  { id: "unlocked", label: "Unlocked", icon: LockKeyhole },
];

function parseEpisodeNumber(value) {
  if (!value) {
    return 0;
  }

  const raw = String(value).trim();
  const match =
    raw.match(/e(\d+)(?!.*\d)/i) ||
    raw.match(/episode[-_\s]?(\d+)(?!.*\d)/i) ||
    [...raw.matchAll(/(\d+)/g)].at(-1);
  const parsed = Number(match?.[1] || match?.[0] || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function inferEpisodeCount(series) {
  const direct = Number(series?.episodeCount || 0);
  if (Number.isFinite(direct) && direct > 0) {
    return direct;
  }
  return parseEpisodeNumber(series?.latestEpisodeId || "");
}

function toTimestamp(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const parsed = Date.parse(value || "");
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatRelativeTime(value) {
  const timestamp = toTimestamp(value);
  if (!timestamp) {
    return "";
  }

  const deltaMs = Date.now() - timestamp;
  const dayMs = 24 * 60 * 60 * 1000;
  const dayDelta = Math.floor(deltaMs / dayMs);

  if (dayDelta <= 0) {
    return "Today";
  }
  if (dayDelta === 1) {
    return "Yesterday";
  }
  if (dayDelta < 7) {
    return `${dayDelta} days ago`;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(timestamp));
}

function formatProgressLabel(currentChapter, totalChapters) {
  if (currentChapter > 0 && totalChapters > 0) {
    return `Read Ep ${currentChapter} of ${totalChapters}`;
  }
  if (currentChapter > 0) {
    return `Read Ep ${currentChapter}`;
  }
  return "Start reading";
}

function formatBookmarkSummary(count) {
  const total = Number(count || 0);
  return `${total} saved ${total === 1 ? "spot" : "spots"}`;
}

function formatUnlockedSummary(count, latestChapter) {
  const total = Number(count || 0);
  if (latestChapter > 0) {
    return `${total} chapters unlocked - up to Chapter ${latestChapter}`;
  }
  return `${total} chapters unlocked`;
}

function sortByUpdatedAt(items) {
  return [...items].sort((left, right) => {
    if (right.updatedAt !== left.updatedAt) {
      return right.updatedAt - left.updatedAt;
    }
    return left.title.localeCompare(right.title);
  });
}

function CoverThumb({ title, coverUrl, coverTone }) {
  if (coverUrl) {
    return (
      <div className="relative h-[92px] w-[72px] overflow-hidden rounded-[18px] border border-black/10 bg-white shadow-[0_12px_24px_rgba(15,23,42,0.08)]">
        <Image
          src={coverUrl}
          alt={`Cover image for ${title}`}
          fill
          sizes="72px"
          className="object-cover"
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div
      className="flex h-[92px] w-[72px] items-end rounded-[18px] border border-black/10 px-3 py-3 shadow-[0_12px_24px_rgba(15,23,42,0.08)]"
      style={{
        background:
          coverTone ||
          "linear-gradient(160deg, rgba(255,255,255,1) 0%, rgba(248,250,252,0.96) 100%)",
      }}
    >
      <span className="line-clamp-2 text-[11px] font-black uppercase tracking-[0.16em] text-black/75">
        {title}
      </span>
    </div>
  );
}

function LibraryRow({ item, mode, onOpenSeries, onResume }) {
  const actionLabel =
    mode === "continue"
      ? "Resume"
      : item.resumeEpisodeId
        ? "Resume"
        : "Series";
  const metaLine = [item.summary, item.updatedLabel]
    .filter(Boolean)
    .join(" / ");

  return (
    <article className="rounded-[28px] border border-black/10 bg-white p-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)] transition-[background-color,border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_44px_rgba(15,23,42,0.1)]">
      <div className="flex items-start gap-4">
        <CoverThumb
          title={item.title}
          coverUrl={item.coverUrl}
          coverTone={item.coverTone}
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-base font-black uppercase tracking-[-0.03em] text-black">
                  {item.title}
                </h3>
                {item.badge ? (
                  <span className="rounded-full border border-black/10 bg-[#f6f7f9] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-black">
                    {item.badge}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm font-semibold text-black/72">
                {item.primaryLine}
              </p>
              {metaLine ? (
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-black/55">
                  {metaLine}
                </p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={
                item.resumeEpisodeId
                  ? () => onResume(item)
                  : () => onOpenSeries(item)
              }
              className={`${storefrontPrimaryButtonClass} min-h-[42px] gap-2 px-4 py-2`}
            >
              {actionLabel}
              <ArrowUpRight className="size-4" />
            </button>
          </div>

          {mode === "continue" ? (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.08em] text-black/55">
                <span>{item.progressLabel}</span>
                <span>{item.progressPercentLabel}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full border border-black/10 bg-[#f3f4f6]">
                <div
                  className="h-full rounded-full bg-black"
                  style={{
                    width: `${Math.max(8, Math.round(item.progressPercent * 100))}%`,
                  }}
                />
              </div>
            </div>
          ) : null}

          {mode !== "continue" && item.genreLine ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {item.genreLine.map((genre) => (
                <span
                  key={`${item.seriesId}-${genre}`}
                  className="rounded-full border border-black/10 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-black/70"
                >
                  {genre}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function PanelSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((index) => (
        <div
          key={`account-library-skeleton-${index}`}
          className="h-[124px] animate-pulse rounded-[28px] border border-black/10 bg-[#f6f7f9]"
        />
      ))}
    </div>
  );
}

export default function MyLibraryPanel({ viewerSignedIn = false, onOpenAuth }) {
  const router = useRouter();
  const { isAdultMode } = useAdultGateStore();
  const { bySeriesId: progressMap, loadProgress } = useProgressStore();
  const { items: historyItems, loadHistory } = useHistoryStore();
  const { bookmarksBySeries } = useBookmarkStore();
  const { followedSeriesIds, loadFollowed } = useFollowStore();
  const [activeTab, setActiveTab] = useState("continue");
  const [seriesList, setSeriesList] = useState([]);
  const [entitlements, setEntitlements] = useState([]);
  const [loading, setLoading] = useState(viewerSignedIn);

  useEffect(() => {
    if (!viewerSignedIn) {
      setSeriesList([]);
      setEntitlements([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    Promise.all([
      loadProgress(),
      loadHistory(),
      loadFollowed(),
      apiGet(`/api/series?adult=${isAdultMode ? "1" : "0"}`, {
        cacheMs: 30000,
        suppressAuthModal: true,
      }),
      apiGet("/api/entitlements", { suppressAuthModal: true }),
    ])
      .then(([, , , seriesResponse, entitlementsResponse]) => {
        if (cancelled) {
          return;
        }

        setSeriesList(
          seriesResponse.ok ? seriesResponse.data?.series || [] : [],
        );
        setEntitlements(
          entitlementsResponse.ok &&
            Array.isArray(entitlementsResponse.data?.entitlements)
            ? entitlementsResponse.data.entitlements
            : [],
        );
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isAdultMode, loadFollowed, loadHistory, loadProgress, viewerSignedIn]);

  const seriesById = useMemo(
    () => new Map(seriesList.map((series) => [series.id, series])),
    [seriesList],
  );

  const historyBySeriesId = useMemo(() => {
    const next = new Map();

    historyItems.forEach((entry) => {
      if (!entry?.seriesId) {
        return;
      }
      const current = next.get(entry.seriesId);
      if (
        !current ||
        toTimestamp(entry.createdAt) >= toTimestamp(current.createdAt)
      ) {
        next.set(entry.seriesId, entry);
      }
    });

    return next;
  }, [historyItems]);

  const continueItems = useMemo(() => {
    const progressEntries = Object.entries(progressMap || {})
      .map(([seriesId, progress]) => ({ seriesId, progress }))
      .filter(({ progress }) => progress?.lastEpisodeId)
      .sort(
        (left, right) =>
          toTimestamp(right.progress?.updatedAt) -
          toTimestamp(left.progress?.updatedAt),
      );

    return sortByUpdatedAt(
      progressEntries
        .map(({ seriesId, progress }) => {
          const series = seriesById.get(seriesId);
          if (!series) {
            return null;
          }

          const currentChapter = parseEpisodeNumber(progress.lastEpisodeId);
          const totalChapters = inferEpisodeCount(series);
          const progressPercent = normalizeReadingPercent(progress.percent);
          const historyEntry = historyBySeriesId.get(seriesId);

          return {
            id: `continue-${seriesId}`,
            seriesId,
            title: series.title,
            coverUrl: series.coverUrl,
            coverTone: series.coverTone,
            badge: progressPercent >= 0.98 ? "Read" : "In Progress",
            primaryLine: formatProgressLabel(currentChapter, totalChapters),
            summary: series.type ? `${series.type} series` : "",
            updatedLabel: formatRelativeTime(
              progress.updatedAt || historyEntry?.createdAt,
            ),
            progressPercent,
            progressLabel: `Read Chapter ${currentChapter || "?"} of ${totalChapters || "?"}`,
            progressPercentLabel: `${Math.round(progressPercent * 100)}%`,
            resumeEpisodeId: progress.lastEpisodeId,
            updatedAt: Math.max(
              toTimestamp(progress.updatedAt),
              toTimestamp(historyEntry?.createdAt),
            ),
          };
        })
        .filter(Boolean),
    );
  }, [historyBySeriesId, progressMap, seriesById]);

  const bookmarkItems = useMemo(() => {
    const savedSeriesIds = new Set(followedSeriesIds);

    Object.entries(bookmarksBySeries || {}).forEach(([seriesId, entries]) => {
      if (Array.isArray(entries) && entries.length > 0) {
        savedSeriesIds.add(seriesId);
      }
    });

    return sortByUpdatedAt(
      Array.from(savedSeriesIds)
        .map((seriesId) => {
          const series = seriesById.get(seriesId);
          if (!series) {
            return null;
          }

          const bookmarks = Array.isArray(bookmarksBySeries?.[seriesId])
            ? bookmarksBySeries[seriesId]
            : [];
          const latestBookmark = bookmarks[0];
          const progress = progressMap?.[seriesId];
          const historyEntry = historyBySeriesId.get(seriesId);

          return {
            id: `bookmark-${seriesId}`,
            seriesId,
            title: series.title,
            coverUrl: series.coverUrl,
            coverTone: series.coverTone,
            badge: followedSeriesIds.includes(seriesId)
              ? "Saved"
              : "Bookmarked",
            primaryLine:
              followedSeriesIds.includes(seriesId) && bookmarks.length > 0
                ? `Saved to your shelf with ${formatBookmarkSummary(bookmarks.length)}`
                : followedSeriesIds.includes(seriesId)
                  ? "Saved to your shelf"
                  : formatBookmarkSummary(bookmarks.length),
            summary: latestBookmark?.label || series.status || "",
            updatedLabel: formatRelativeTime(
              latestBookmark?.createdAt ||
                progress?.updatedAt ||
                historyEntry?.createdAt,
            ),
            resumeEpisodeId:
              progress?.lastEpisodeId || historyEntry?.episodeId || null,
            genreLine: Array.isArray(series.genres)
              ? series.genres.slice(0, 3)
              : [],
            updatedAt: Math.max(
              toTimestamp(latestBookmark?.createdAt),
              toTimestamp(progress?.updatedAt),
              toTimestamp(historyEntry?.createdAt),
            ),
          };
        })
        .filter(Boolean),
    );
  }, [
    bookmarksBySeries,
    followedSeriesIds,
    historyBySeriesId,
    progressMap,
    seriesById,
  ]);

  const unlockedItems = useMemo(() => {
    return sortByUpdatedAt(
      (Array.isArray(entitlements) ? entitlements : [])
        .map((entry) => {
          const series = seriesById.get(entry?.seriesId);
          if (
            !series ||
            !Array.isArray(entry?.unlockedEpisodeIds) ||
            entry.unlockedEpisodeIds.length === 0
          ) {
            return null;
          }

          const progress = progressMap?.[entry.seriesId];
          const historyEntry = historyBySeriesId.get(entry.seriesId);
          const latestUnlockedChapter = entry.unlockedEpisodeIds.reduce(
            (highest, episodeId) =>
              Math.max(highest, parseEpisodeNumber(episodeId)),
            0,
          );

          return {
            id: `unlocked-${entry.seriesId}`,
            seriesId: entry.seriesId,
            title: series.title,
            coverUrl: series.coverUrl,
            coverTone: series.coverTone,
            badge: entry.unlockedEpisodeIds.length > 1 ? "Unlocked" : "Open",
            primaryLine: formatUnlockedSummary(
              entry.unlockedEpisodeIds.length,
              latestUnlockedChapter,
            ),
            summary: progress?.lastEpisodeId
              ? `Resume Ep ${parseEpisodeNumber(progress.lastEpisodeId) || "?"}`
              : series.type
                ? `${series.type} series`
                : "",
            updatedLabel: formatRelativeTime(
              progress?.updatedAt || historyEntry?.createdAt,
            ),
            resumeEpisodeId:
              progress?.lastEpisodeId || historyEntry?.episodeId || null,
            genreLine: Array.isArray(series.genres)
              ? series.genres.slice(0, 3)
              : [],
            updatedAt: Math.max(
              toTimestamp(progress?.updatedAt),
              toTimestamp(historyEntry?.createdAt),
              entry.unlockedEpisodeIds.length,
            ),
          };
        })
        .filter(Boolean),
    );
  }, [entitlements, historyBySeriesId, progressMap, seriesById]);

  const tabData = useMemo(
    () => ({
      continue: {
        items: continueItems,
        emptyTitle: "Nothing in progress",
        emptyDescription: "Start a series.",
      },
      bookmarks: {
        items: bookmarkItems,
        emptyTitle: "No saved series",
        emptyDescription: "Save a few titles.",
      },
      unlocked: {
        items: unlockedItems,
        emptyTitle: "No unlocked series",
        emptyDescription: "Unlocked titles appear here.",
      },
    }),
    [bookmarkItems, continueItems, unlockedItems],
  );

  const activeItems = tabData[activeTab]?.items || [];
  const signedInCount = useMemo(
    () => ({
      continue: continueItems.length,
      bookmarks: bookmarkItems.length,
      unlocked: unlockedItems.length,
    }),
    [bookmarkItems.length, continueItems.length, unlockedItems.length],
  );

  const openSeries = useCallback(
    (item) => {
      router.push(
        buildPathWithAttribution(`/series/${item.seriesId}`, {
          entryPoint: "ACCOUNT_LIBRARY_SERIES",
          sourcePath: "/account",
          sourceSeriesId: item.seriesId,
          returnTo: `/series/${item.seriesId}`,
        }),
      );
    },
    [router],
  );

  const resumeSeries = useCallback(
    (item) => {
      if (!item?.resumeEpisodeId) {
        openSeries(item);
        return;
      }

      router.push(
        buildPathWithAttribution(
          `/read/${item.seriesId}/${item.resumeEpisodeId}`,
          {
            entryPoint: "ACCOUNT_LIBRARY_RESUME",
            sourcePath: "/account",
            sourceSeriesId: item.seriesId,
            sourceEpisodeId: item.resumeEpisodeId,
            returnTo: `/read/${item.seriesId}/${item.resumeEpisodeId}`,
          },
        ),
      );
    },
    [openSeries, router],
  );

  const buttonBaseClass = storefrontSecondaryButtonClass;

  return (
    <SurfacePanel className="space-y-5" appearance="light" accent="blue">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/55">
            My Library
          </p>
          <h2 className="mt-2 font-display text-2xl font-black uppercase tracking-[-0.05em] text-black">
            Your shelf
          </h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-black/72">
            Continue, saves, and unlocks.
          </p>
        </div>

        {viewerSignedIn ? (
          <button
            type="button"
            onClick={() => router.push("/library")}
            className={buttonBaseClass}
          >
            Full library
          </button>
        ) : null}
      </div>

      {!viewerSignedIn ? (
        <div className="rounded-[28px] border border-black/10 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.06em] text-black">
                Sign in for your shelf
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-black/72">
                Keep progress, saves, and unlocks together.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenAuth}
              className={storefrontPrimaryButtonClass}
            >
              Sign in
            </button>
          </div>
        </div>
      ) : (
        <>
          <div
            role="tablist"
            aria-label="My Library sections"
            className="flex flex-wrap gap-2"
          >
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`account-library-tab-${tab.id}`}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`account-library-panel-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex min-h-[42px] items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold uppercase tracking-[0.08em] transition-[background-color,border-color,box-shadow,transform] duration-200 ${
                    isActive
                      ? "border border-black bg-black text-white shadow-[0_12px_24px_rgba(15,23,42,0.16)]"
                      : "border border-black/10 bg-white text-black/72 shadow-[0_10px_20px_rgba(15,23,42,0.08)] hover:border-black/16 hover:bg-black/[0.03] hover:shadow-[0_12px_24px_rgba(15,23,42,0.1)] active:translate-y-px"
                  }`}
                >
                  <Icon className="size-4" />
                  <span>{tab.label}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-[0.08em] ${isActive ? "border-white/20 bg-white text-black" : "border-black/10 bg-[#f6f7f9] text-black/72"}`}>
                    {signedInCount[tab.id]}
                  </span>
                </button>
              );
            })}
          </div>

          <div
            id={`account-library-panel-${activeTab}`}
            role="tabpanel"
            aria-labelledby={`account-library-tab-${activeTab}`}
          >
            {loading ? (
              <PanelSkeleton />
            ) : activeItems.length > 0 ? (
              <div className="space-y-3">
                {activeItems.map((item) => (
                  <LibraryRow
                    key={item.id}
                    item={item}
                    mode={activeTab}
                    onOpenSeries={openSeries}
                    onResume={resumeSeries}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-[28px] border border-dashed border-black/14 bg-[#f6f7f9] px-5 py-8 text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-black/10 bg-white text-black shadow-[0_12px_24px_rgba(15,23,42,0.08)]">
                  <BookMarked className="size-5" />
                </div>
                <p className="mt-4 text-base font-black uppercase tracking-[0.04em] text-black">
                  {tabData[activeTab]?.emptyTitle}
                </p>
                <p className="mx-auto mt-2 max-w-lg text-sm font-semibold leading-6 text-black/72">
                  {tabData[activeTab]?.emptyDescription}
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </SurfacePanel>
  );
}
