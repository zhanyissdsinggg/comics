"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  BookmarkPlus,
  Eye,
  Heart,
  List,
  Lock,
  PlayCircle,
  Share2,
  Star,
} from "lucide-react";
import { FigmaSiteProvider, useFigmaSite } from "./FigmaSiteContext";
import FigmaChrome from "./FigmaChrome";
import FigmaCommentsSection from "./FigmaCommentsSection";
import {
  FIGMA_CONTENT_TYPES,
  buildChapterItems,
  buildFigmaCatalog,
  buildFigmaSeriesItem,
  cn,
} from "./figma-utils";

function SeriesDetailContent({ series, episodes }) {
  const router = useRouter();
  const { palette, isAdultMode, handleAdultToggle } = useFigmaSite();

  const detailItem = useMemo(() => {
    const mapped = buildFigmaSeriesItem(series, {
      interactive: false,
      defaultEpisodeId:
        String(episodes?.[0]?.id || series?.latestEpisodeId || "").trim(),
    });
    return mapped;
  }, [episodes, series]);

  const chapterItems = useMemo(
    () => buildChapterItems(series, episodes),
    [episodes, series],
  );

  const isInteractive = detailItem?.kind === FIGMA_CONTENT_TYPES.INTERACTIVE;
  const isNovel = detailItem?.kind === FIGMA_CONTENT_TYPES.NOVELS;
  const chapterPrefix = isInteractive
    ? "Routes"
    : isNovel
      ? "Episodes"
      : "Chapters";
  const readLabel = isInteractive
    ? "Start Playing"
    : isNovel
      ? "Start Reading"
      : "Read Chapter 1";

  if (!detailItem) {
    return (
      <div className={cn("min-h-screen", palette.rootBg)}>
        <FigmaChrome>
          <main className="mx-auto flex min-h-[72vh] max-w-[960px] items-center justify-center px-4 py-24">
            <div
              className={cn(
                "w-full rounded-3xl border p-10 text-center shadow-2xl",
                palette.surface,
                palette.border,
              )}
            >
              <h1 className="mb-3 text-3xl font-black text-white">
                Story not found
              </h1>
              <p className="mx-auto max-w-lg text-gray-400">
                This title is missing or not ready for public view yet.
              </p>
            </div>
          </main>
        </FigmaChrome>
      </div>
    );
  }

  if (detailItem.isAdult && !isAdultMode) {
    return (
      <div className={cn("min-h-screen", palette.rootBg)}>
        <FigmaChrome>
          <main className="flex min-h-[78vh] flex-col items-center justify-center px-4 py-20 text-center">
            <Lock className="mb-6 h-16 w-16 text-red-500 opacity-80" />
            <h1 className="mb-4 text-3xl font-black text-white">
              Age Restricted Content
            </h1>
            <p className="mb-8 max-w-md text-gray-400">
              This title is marked 18+ and needs mature mode enabled before we
              show it.
            </p>
            <button
              type="button"
              onClick={handleAdultToggle}
              className={cn(
                "rounded-xl px-8 py-3.5 font-black text-white shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all active:scale-95",
                palette.primaryBg,
              )}
            >
              Verify Age Now
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="mt-6 font-bold text-gray-500 transition-colors hover:text-white"
            >
              Go Back
            </button>
          </main>
        </FigmaChrome>
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen", palette.rootBg)}>
      <FigmaChrome>
        <div className="relative h-[400px] w-full bg-black md:h-[500px]">
          <div className="absolute inset-0">
            <img
              src={detailItem.coverUrl}
              alt={detailItem.title}
              className="h-full w-full scale-110 object-cover opacity-20 blur-xl"
            />
            <div
              className={cn(
                "absolute inset-0 bg-gradient-to-t from-5% to-transparent",
                palette.heroOverlay,
              )}
            />
          </div>

          <div className="relative mx-auto flex h-full max-w-[1200px] flex-col justify-end px-4 pb-8 md:px-8">
            <div className="flex flex-col items-end gap-8 md:flex-row md:items-start">
              <img
                src={detailItem.coverUrl}
                alt={detailItem.title}
                className="w-48 shrink-0 translate-y-12 rounded-xl object-cover shadow-2xl ring-2 ring-white/10 md:w-64 md:translate-y-24"
              />

              <div className="flex-1 pb-4 md:pb-0">
                <div className="mb-3 flex gap-2">
                  {detailItem.tags.map((tag) => (
                    <span
                      key={tag}
                      className={cn(
                        "rounded-md border px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] backdrop-blur-sm",
                        palette.primarySoft,
                      )}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <h1 className="mb-2 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-4xl font-black tracking-tight text-transparent drop-shadow-sm md:text-5xl">
                  {detailItem.title}
                </h1>
                <p className="mb-4 text-lg font-medium text-gray-300">
                  {detailItem.author}
                </p>

                <div className="mb-6 flex flex-wrap items-center gap-6 text-sm font-bold text-gray-400">
                  <span className="flex items-center gap-1 text-yellow-500">
                    <Star className="h-4 w-4 fill-current" />
                    {detailItem.rating} Rating
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    {detailItem.viewsText} Views
                  </span>
                  <span className="flex items-center gap-1">
                    <Heart className="h-4 w-4" />
                    {detailItem.likesText} Likes
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <Link
                    href={detailItem.readHref}
                    className={cn(
                      "flex items-center gap-2 rounded-xl px-8 py-3.5 font-bold text-white shadow-[0_0_20px_rgba(0,0,0,0.5)] transition-all hover:scale-105 active:scale-95",
                      palette.primaryBg,
                    )}
                  >
                    <PlayCircle className="h-5 w-5" />
                    {readLabel}
                  </Link>
                  <button
                    type="button"
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-xl border shadow-lg transition-all hover:bg-white/10 active:scale-95",
                      palette.surface,
                      palette.border,
                    )}
                  >
                    <BookmarkPlus className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-xl border shadow-lg transition-all hover:bg-white/10 active:scale-95",
                      palette.surface,
                      palette.border,
                    )}
                  >
                    <Share2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto flex max-w-[1200px] flex-col gap-12 px-4 py-12 md:flex-row md:px-8 md:py-20">
          <div className="w-full shrink-0 pt-8 md:w-64 md:pt-0">
            <h3 className="mb-4 font-bold text-white">Synopsis</h3>
            <p className="text-sm leading-relaxed text-gray-400">
              {detailItem.description}
            </p>
          </div>

          <div className="flex-1">
            <div className="mb-6 flex items-center justify-between border-b border-gray-800 pb-4">
              <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-white">
                <List className={cn("h-5 w-5", palette.primaryText)} />
                {chapterPrefix} ({chapterItems.length})
              </h2>
              <button
                type="button"
                className="text-sm font-semibold text-gray-400 transition-colors hover:text-white"
              >
                Sort: Newest
              </button>
            </div>

            <div className="space-y-3">
              {chapterItems.map((chapter, index) => (
                <Link
                  key={chapter.id || `${detailItem.id}-${index}`}
                  href={`/read/${encodeURIComponent(detailItem.id)}/${encodeURIComponent(chapter.id)}`}
                  className={cn(
                    "group flex items-center justify-between rounded-xl border border-transparent p-4 transition-all hover:border-gray-700 active:scale-[0.98]",
                    palette.surface,
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-black ring-1 ring-white/10 transition-all group-hover:ring-white/30">
                      <img
                        src={detailItem.coverUrl}
                        alt={detailItem.title}
                        className="h-full w-full object-cover opacity-50 transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <PlayCircle
                          className={cn(
                            "h-5 w-5 opacity-0 transition-opacity group-hover:opacity-100",
                            palette.primaryText,
                          )}
                        />
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-white transition-colors group-hover:text-gray-200">
                        {chapter.title}
                      </h4>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-gray-500">
                        {chapter.date}
                      </p>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-gray-400 transition-colors group-hover:text-white">
                    {chapter.views}
                    <span className="hidden sm:inline"> Views</span>
                  </div>
                </Link>
              ))}
            </div>

            <FigmaCommentsSection seriesTitle={detailItem.title} />
          </div>
        </div>
      </FigmaChrome>
    </div>
  );
}

export default function FigmaSeriesDetailPage({
  series,
  episodes = [],
  initialContentType = FIGMA_CONTENT_TYPES.COMICS,
}) {
  const catalog = buildFigmaCatalog(series ? [series] : []);
  const detailKind =
    catalog.items[0]?.kind === FIGMA_CONTENT_TYPES.NOVELS
      ? FIGMA_CONTENT_TYPES.NOVELS
      : initialContentType;

  return (
    <FigmaSiteProvider initialContentType={detailKind}>
      <SeriesDetailContent series={series} episodes={episodes} />
    </FigmaSiteProvider>
  );
}
