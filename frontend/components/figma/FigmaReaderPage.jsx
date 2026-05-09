"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Heart,
  List,
  Lock,
  MessageCircle,
  MoreVertical,
  Settings,
  Share2,
} from "lucide-react";
import { apiGet } from "../../lib/apiClient";
import { useEntitlementStore } from "../../store/useEntitlementStore";
import { useAuthStore } from "../../store/useAuthStore";
import { useAdultGateStore } from "../../store/useAdultGateStore";
import { useHistoryStore } from "../../store/useHistoryStore";
import PageStream from "../reader/PageStream";
import { FigmaSiteProvider, useFigmaSite } from "./FigmaSiteContext";
import FigmaCommentsSection from "./FigmaCommentsSection";
import { cn } from "./figma-utils";

function ReaderContent({ seriesId, episodeId }) {
  const router = useRouter();
  const previewEndRef = useRef(null);
  const endRef = useRef(null);
  const historyLoggedRef = useRef(false);
  const { palette, handleAdultToggle, openLogin } = useFigmaSite();
  const { loadEntitlement, bySeriesId } = useEntitlementStore();
  const { isSignedIn } = useAuthStore();
  const { isAdultMode } = useAdultGateStore();
  const { addHistory } = useHistoryStore();
  const [seriesData, setSeriesData] = useState(null);
  const [episodeData, setEpisodeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showNav, setShowNav] = useState(true);
  const [liked, setLiked] = useState(false);

  const entitlement = bySeriesId[seriesId] || { unlockedEpisodeIds: [] };

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      const adultFlag = isAdultMode ? "1" : "0";
      const [seriesResponse, episodeResponse] = await Promise.all([
        apiGet(`/api/series/${encodeURIComponent(seriesId)}?adult=${adultFlag}`, {
          cacheMs: 0,
        }),
        apiGet(
          `/api/episode?seriesId=${encodeURIComponent(seriesId)}&episodeId=${encodeURIComponent(episodeId)}`,
          { cacheMs: 0 },
        ),
      ]);

      if (!active) {
        return;
      }

      if (!seriesResponse.ok || !seriesResponse.data?.series) {
        setError(seriesResponse.error || "SERIES_LOAD_FAILED");
        setLoading(false);
        return;
      }

      if (!episodeResponse.ok || !episodeResponse.data?.episode) {
        setError(episodeResponse.error || "EPISODE_LOAD_FAILED");
        setLoading(false);
        return;
      }

      historyLoggedRef.current = false;
      setSeriesData(seriesResponse.data);
      setEpisodeData(episodeResponse.data.episode);
      setLoading(false);
    }

    void load();

    return () => {
      active = false;
    };
  }, [episodeId, isAdultMode, seriesId]);

  useEffect(() => {
    if (isSignedIn) {
      void loadEntitlement(seriesId);
    }
  }, [isSignedIn, loadEntitlement, seriesId]);

  useEffect(() => {
    if (
      !isSignedIn ||
      historyLoggedRef.current ||
      !seriesData?.series ||
      !episodeData?.id
    ) {
      return;
    }

    historyLoggedRef.current = true;
    void addHistory({
      seriesId,
      episodeId,
      title: seriesData.series.title,
      percent: 0.08,
    });
  }, [addHistory, episodeData?.id, episodeId, isSignedIn, seriesData?.series, seriesId]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    let lastScroll = window.scrollY;
    const onScroll = () => {
      if (window.scrollY > lastScroll && window.scrollY > 100) {
        setShowNav(false);
      } else if (window.scrollY < lastScroll) {
        setShowNav(true);
      }
      lastScroll = window.scrollY;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const episodes = useMemo(
    () => (Array.isArray(seriesData?.episodes) ? seriesData.episodes : []),
    [seriesData],
  );
  const currentEpisode = useMemo(
    () =>
      episodes.find((item) => String(item?.id || "").trim() === String(episodeId || "").trim()) ||
      null,
    [episodeId, episodes],
  );
  const currentIndex = useMemo(
    () =>
      episodes.findIndex((item) => String(item?.id || "").trim() === String(episodeId || "").trim()),
    [episodeId, episodes],
  );
  const prevEpisode = currentIndex > 0 ? episodes[currentIndex - 1] : null;
  const nextEpisode =
    currentIndex >= 0 && currentIndex < episodes.length - 1
      ? episodes[currentIndex + 1]
      : null;

  const isAdultSeries = Boolean(seriesData?.series?.adult);
  const unlocked =
    Number(currentEpisode?.pricePts || 0) <= 0 ||
    entitlement.unlockedEpisodeIds.includes(String(episodeId));
  const isComic = episodeData?.type === "comic";
  const previewCount = !unlocked && isComic ? episodeData?.previewFreePages ?? 3 : null;
  const previewParagraphs =
    !unlocked && !isComic ? episodeData?.previewParagraphs ?? 3 : null;
  const pages = Array.isArray(episodeData?.pages) ? episodeData.pages : [];
  const paragraphs = Array.isArray(episodeData?.paragraphs) ? episodeData.paragraphs : [];
  const progressWidth =
    episodes.length > 1 && currentIndex >= 0
      ? `${Math.round(((currentIndex + 1) / episodes.length) * 100)}%`
      : "45%";

  if (loading) {
    return (
      <main className="min-h-screen bg-[#050505] px-4 py-20 text-white">
        <div className="mx-auto max-w-3xl space-y-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="h-40 animate-pulse rounded-2xl bg-white/5"
            />
          ))}
        </div>
      </main>
    );
  }

  if (error || !seriesData?.series || !episodeData) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050505] px-4 py-20 text-white">
        <div
          className={cn(
            "w-full max-w-xl rounded-3xl border p-8 text-center",
            palette.surface,
            palette.border,
          )}
        >
          <h1 className="mb-3 text-3xl font-black">Reader unavailable</h1>
          <p className="mb-6 text-gray-400">
            This episode failed to load. Try again or bounce back to the series.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => router.refresh()}
              className={cn(
                "rounded-xl px-6 py-3 font-bold text-white",
                palette.primaryBg,
              )}
            >
              Retry
            </button>
            <Link
              href={`/series/${encodeURIComponent(seriesId)}`}
              className="rounded-xl border border-white/10 px-6 py-3 font-bold text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
            >
              Back to series
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (isAdultSeries && !isAdultMode) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#06080a] px-4 py-20 text-center text-white">
        <Lock className="mb-6 h-16 w-16 text-red-500 opacity-80" />
        <h1 className="mb-4 text-3xl font-black">Age Restricted Content</h1>
        <p className="mb-8 max-w-md text-gray-400">
          This episode belongs to a mature title. Enable adult mode before
          opening it.
        </p>
        <button
          type="button"
          onClick={handleAdultToggle}
          className={cn(
            "rounded-xl px-8 py-3.5 font-black text-white shadow-[0_0_20px_rgba(220,38,38,0.4)]",
            palette.primaryBg,
          )}
        >
          Verify Age Now
        </button>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen bg-[#050505] pb-24 text-white">
      <div
        className={cn(
          "fixed top-0 z-50 flex h-16 w-full items-center justify-between border-b border-white/5 bg-[#121212]/90 px-4 backdrop-blur-md transition-transform duration-300",
          showNav ? "translate-y-0" : "-translate-y-full",
        )}
      >
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-full p-2 transition-colors hover:bg-white/10"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div>
            <h1 className="max-w-[220px] truncate text-sm font-bold md:max-w-md md:text-base">
              {seriesData.series.title}
            </h1>
            <p className="text-xs text-gray-400">
              {currentEpisode?.title || `Episode ${currentEpisode?.number || 1}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-full p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <MessageCircle className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="rounded-full p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Settings className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="rounded-full p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="pt-16" onClick={() => setShowNav((value) => !value)}>
        <PageStream
          pages={pages}
          paragraphs={paragraphs}
          previewCount={previewCount}
          previewParagraphs={previewParagraphs}
          layoutMode="vertical"
          isNightMode
          imageQuality={75}
          imageSizes="(max-width: 768px) 100vw, 768px"
          seriesType={seriesData.series?.type || episodeData.type}
          onPreviewEndRef={(node) => {
            previewEndRef.current = node;
          }}
          onEndRef={(node) => {
            endRef.current = node;
          }}
        />

        {!unlocked ? (
          <div className="mx-auto mt-6 max-w-3xl px-4" onClick={(event) => event.stopPropagation()}>
            <div
              className={cn(
                "rounded-3xl border p-6 shadow-2xl",
                palette.surface,
                palette.border,
              )}
            >
              <p className="mb-2 text-sm font-bold uppercase tracking-[0.18em] text-gray-400">
                Preview ends here
              </p>
              <h2 className="mb-3 text-2xl font-black text-white">
                Unlock the rest of this episode
              </h2>
              <p className="mb-6 text-sm leading-6 text-gray-400">
                The chapter is locked right now. Jump to the store for points or
                sign in if you already own access.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                {isSignedIn ? (
                  <Link
                    href="/store"
                    className={cn(
                      "rounded-xl px-6 py-3 text-center font-bold text-white",
                      palette.primaryBg,
                    )}
                  >
                    Get Points
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      openLogin(
                        "login",
                        `/read/${encodeURIComponent(seriesId)}/${encodeURIComponent(episodeId)}`,
                      )
                    }
                    className={cn(
                      "rounded-xl px-6 py-3 text-center font-bold text-white",
                      palette.primaryBg,
                    )}
                  >
                    Sign In
                  </button>
                )}
                <Link
                  href={`/series/${encodeURIComponent(seriesId)}`}
                  className="rounded-xl border border-white/10 px-6 py-3 text-center font-bold text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
                >
                  Back to series
                </Link>
              </div>
            </div>
          </div>
        ) : null}

        <div
          className="mx-auto mt-8 max-w-3xl border-t border-white/10 p-8 text-center"
          onClick={(event) => event.stopPropagation()}
        >
          <h3 className="mb-6 text-xl font-bold text-white">To be continued...</h3>
          <div className="mb-10 flex justify-center gap-6">
            <button
              type="button"
              onClick={() => setLiked((value) => !value)}
              className={cn(
                "group flex flex-col items-center gap-2 transition-colors active:scale-95",
                liked ? palette.primaryText : "text-gray-400 hover:text-red-500",
              )}
            >
              <div
                className={cn(
                  "flex h-14 w-14 items-center justify-center rounded-full border transition-all",
                  liked
                    ? "border-red-500/50 bg-red-500/20"
                    : "border-transparent bg-white/5 group-hover:border-red-500/30 group-hover:bg-red-500/10",
                )}
              >
                <Heart className={cn("h-7 w-7", liked ? "fill-current" : "")} />
              </div>
              <span className="text-xs font-bold uppercase tracking-[0.18em]">
                Like
              </span>
            </button>

            <button
              type="button"
              className="group flex flex-col items-center gap-2 text-gray-400 transition-colors hover:text-blue-500 active:scale-95"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-transparent bg-white/5 transition-all group-hover:border-blue-500/30 group-hover:bg-blue-500/10">
                <Share2 className="h-7 w-7" />
              </div>
              <span className="text-xs font-bold uppercase tracking-[0.18em]">
                Share
              </span>
            </button>
          </div>

          <div className="flex justify-between gap-3">
            <button
              type="button"
              disabled={!prevEpisode}
              onClick={() => prevEpisode && router.push(`/read/${encodeURIComponent(seriesId)}/${encodeURIComponent(prevEpisode.id)}`)}
              className="rounded-xl bg-white/5 px-6 py-3 font-bold transition-all hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95"
            >
              Prev
            </button>
            <button
              type="button"
              disabled={!nextEpisode}
              onClick={() => nextEpisode && router.push(`/read/${encodeURIComponent(seriesId)}/${encodeURIComponent(nextEpisode.id)}`)}
              className={cn(
                "rounded-xl px-8 py-3 font-bold text-white shadow-lg transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50",
                palette.primaryBg,
              )}
            >
              Next Episode
            </button>
          </div>
        </div>

        <div
          className="mx-auto mt-12 w-full max-w-4xl px-4 md:px-8"
          onClick={(event) => event.stopPropagation()}
        >
          <FigmaCommentsSection seriesTitle={seriesData.series.title} />
        </div>
      </div>

      <div
        className={cn(
          "fixed bottom-0 left-0 z-50 flex h-[72px] w-full flex-col justify-center border-t border-white/5 bg-[#121212]/90 px-4 backdrop-blur-md transition-transform duration-300",
          showNav ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div className="absolute left-0 top-0 h-1 w-full bg-white/10">
          <div className={cn("h-full", palette.primaryBg)} style={{ width: progressWidth }} />
        </div>
        <div className="mx-auto mt-1 flex w-full max-w-2xl items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 text-gray-400 transition-colors hover:text-white"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-gray-500">
              {currentIndex >= 0 && episodes.length > 0
                ? `${currentIndex + 1}/${episodes.length}`
                : "1/1"}
            </span>
            <Link
              href={`/series/${encodeURIComponent(seriesId)}`}
              className="flex items-center gap-2 rounded-full bg-white/10 px-6 py-2 text-sm font-bold transition-colors hover:bg-white/20 active:scale-95"
            >
              <List className="h-4 w-4" />
              Episodes
            </Link>
          </div>

          <button
            type="button"
            className="p-2 text-gray-400 transition-colors hover:text-white"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </div>
    </main>
  );
}

export default function FigmaReaderPage({ seriesId, episodeId }) {
  return (
    <FigmaSiteProvider>
      <ReaderContent seriesId={seriesId} episodeId={episodeId} />
    </FigmaSiteProvider>
  );
}
