"use client";

import NextImage from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getFallbackImageUrl } from "../../lib/fallbackImage";
import { normalizeLegacyImageUrl } from "../../lib/normalizeLegacyImageUrl";
import { getApprovedMockComicPageAsset } from "../../lib/readerMockAssets";
import {
  isLegacyInlineReaderPlaceholder,
  isLegacyPlaceholderUrl,
} from "../../lib/fallbackImage";
import { cn } from "../../lib/utils";
import { trackEvent } from "../../lib/trackEvent";

function pushPerfMetric(name, value) {
  if (typeof window === "undefined") {
    return;
  }
  if (!window.__perfMetrics) {
    window.__perfMetrics = {};
  }
  const metrics = window.__perfMetrics;
  if (name === "reader_img_ms") {
    const count = metrics.readerImgCount || 0;
    const total = metrics.readerImgTotalMs || 0;
    const nextCount = count + 1;
    const nextTotal = total + value;
    metrics.readerImgCount = nextCount;
    metrics.readerImgTotalMs = nextTotal;
    metrics.readerImgAvgMs = Math.round(nextTotal / nextCount);
  }
  if (name === "reader_img_error") {
    metrics.readerImgErrors = (metrics.readerImgErrors || 0) + 1;
  }
}

function readPlaceholdPageMeta(url) {
  if (!url) {
    return null;
  }

  if (isLegacyInlineReaderPlaceholder(url)) {
    return { placeholder: true };
  }

  try {
    const parsed = new URL(url);
    return isLegacyPlaceholderUrl(parsed.toString())
      ? { placeholder: true }
      : null;
  } catch {
    return null;
  }
}

function buildComicPageAlt(seriesTitle, episodeTitle, index) {
  const safeSeriesTitle = String(seriesTitle || "Series").trim() || "Series";
  const safeEpisodeTitle =
    String(episodeTitle || "Episode").trim() || "Episode";
  return `${safeSeriesTitle} ${safeEpisodeTitle} page ${index + 1}`;
}

function ReaderEditorialFallback({
  page,
  meta,
  index,
  isHorizontal = false,
  seriesId = "",
  seriesTitle = "",
  episodeTitle = "",
}) {
  const aspectRatio = `${page?.w || 800} / ${page?.h || 1200}`;
  const fallbackSrc =
    getApprovedMockComicPageAsset({
      seriesId,
      seriesTitle,
      pageNumber: index + 1,
    }) ||
    normalizeLegacyImageUrl(page?.url) ||
    getFallbackImageUrl({ kind: "reader" });
  const pageAlt = buildComicPageAlt(seriesTitle, episodeTitle, index);

  return (
    <div
      className={`relative overflow-hidden bg-[#050505] ${
        isHorizontal ? "rounded-xl" : "rounded-none"
      }`}
      style={{ aspectRatio }}
      data-placeholder-kind={
        meta?.placeholder ? "legacy-reader-page" : "reader-page"
      }
    >
      <NextImage
        src={fallbackSrc}
        alt={pageAlt}
        width={page?.w || 800}
        height={page?.h || 1200}
        className={`m-0 w-full p-0 align-top ${
          isHorizontal ? "block rounded-xl" : "block rounded-none"
        }`}
        style={{
          display: "block",
          margin: 0,
          width: "100%",
          height: "auto",
          padding: 0,
          lineHeight: 0,
          maxWidth: isHorizontal ? undefined : "min(100vw, 960px)",
        }}
        priority={index < 2}
        loading={index < 2 ? "eager" : "lazy"}
        sizes={
          isHorizontal
            ? "(max-width: 768px) 100vw, 90vw"
            : "(max-width: 768px) 100vw, (max-width: 1200px) 82vw, 960px"
        }
      />
    </div>
  );
}

function preloadImages(pages, startIndex, count = 3) {
  const next = pages.slice(startIndex, startIndex + count);
  next.forEach((page) => {
    if (
      readPlaceholdPageMeta(page.url) ||
      isLegacyInlineReaderPlaceholder(page.url)
    ) {
      return;
    }
    // Use the browser's Image constructor for preloading, not next/image component.
    const img = new window.Image();
    img.src = normalizeLegacyImageUrl(page.url);
  });
}

export default function PageStream({
  pages,
  paragraphs,
  seriesId = "",
  seriesTitle = "",
  episodeTitle = "",
  previewCount,
  previewParagraphs,
  prefetchCount = 3,
  layoutMode = "vertical",
  isNightMode = false,
  onActiveIndexChange,
  onPreviewEndRef,
  onEndRef,
  onRetryPage,
  imageQuality,
  imageSizes,
  seriesType,
  textTheme = "light",
  fontSize = 18,
  lineHeight = 1.75,
}) {
  const [errorPages, setErrorPages] = useState({});
  const [loadingPages, setLoadingPages] = useState({});
  const [reloadKeys, setReloadKeys] = useState({});
  const [qualityOverrides, setQualityOverrides] = useState({});
  const [readyPages, setReadyPages] = useState({});
  const retryAttemptsRef = useRef({});
  const retryTimersRef = useRef({});
  const containerRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const loadStartRef = useRef({});
  const visiblePages = useMemo(() => {
    if (!Array.isArray(pages)) {
      return [];
    }
    if (typeof previewCount === "number") {
      return pages.slice(0, previewCount);
    }
    return pages;
  }, [pages, previewCount]);

  const visibleParagraphs = useMemo(() => {
    if (!Array.isArray(paragraphs)) {
      return [];
    }
    if (typeof previewParagraphs === "number") {
      return paragraphs.slice(0, previewParagraphs);
    }
    return paragraphs;
  }, [paragraphs, previewParagraphs]);

  const isHorizontal = layoutMode === "horizontal";
  const isVerticalComicFlow = !isHorizontal && visiblePages.length > 0;
  const proseThemeClass =
    textTheme === "sepia"
      ? "bg-[#fbf7ef] text-[#2f261f]"
      : textTheme === "dark"
        ? "bg-[#0f1115] text-[#e5e7eb]"
        : "bg-[#fafafa] text-[#1f2933]";
  const proseMutedClass =
    textTheme === "sepia"
      ? "text-[#6d5b48]"
      : textTheme === "dark"
        ? "text-[#9ca3af]"
        : "text-[#667085]";
  const initialReadyCount = useMemo(
    () => Math.max(1, Math.min(visiblePages.length, prefetchCount || 1)),
    [prefetchCount, visiblePages.length],
  );

  const markPageReady = useCallback(
    (index) => {
      if (
        !Number.isFinite(index) ||
        index < 0 ||
        index >= visiblePages.length
      ) {
        return;
      }

      if (!loadStartRef.current[index]) {
        loadStartRef.current[index] = Date.now();
        setLoadingPages((prev) =>
          prev[index] ? prev : { ...prev, [index]: true },
        );
      }

      setReadyPages((prev) =>
        prev[index] ? prev : { ...prev, [index]: true },
      );
    },
    [visiblePages.length],
  );

  useEffect(() => {
    Object.values(retryTimersRef.current).forEach((timer) => {
      if (timer) {
        clearTimeout(timer);
      }
    });
    retryTimersRef.current = {};
    retryAttemptsRef.current = {};
    loadStartRef.current = {};
    setErrorPages({});
    setReloadKeys({});
    setQualityOverrides({});
    setActiveIndex(0);

    if (visiblePages.length === 0) {
      setReadyPages({});
      setLoadingPages({});
      return;
    }

    const nextReady = {};
    const next = {};
    for (let index = 0; index < initialReadyCount; index += 1) {
      nextReady[index] = true;
      next[index] = true;
      loadStartRef.current[index] = Date.now();
    }
    setReadyPages(nextReady);
    setLoadingPages(next);
    if (initialReadyCount > 0) {
      preloadImages(visiblePages, 0, initialReadyCount);
    }
  }, [initialReadyCount, visiblePages]);

  useEffect(() => {
    if (visiblePages.length === 0) {
      return;
    }

    const node = containerRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      visiblePages.forEach((_page, index) => markPageReady(index));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }
          const index = Number(entry.target.getAttribute("data-index") || 0);
          markPageReady(index);
        });
      },
      {
        rootMargin: isHorizontal ? "0px 40%" : "1400px 0px",
        threshold: 0.01,
      },
    );

    const items = node.querySelectorAll("[data-index]");
    items.forEach((item) => observer.observe(item));

    return () => observer.disconnect();
  }, [isHorizontal, markPageReady, visiblePages]);

  useEffect(() => {
    if (visiblePages.length === 0) {
      return;
    }
    const node = containerRef.current;
    if (!node) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }
          const index = Number(entry.target.getAttribute("data-index") || 0);
          setActiveIndex(index);
          onActiveIndexChange?.(index);
        });
      },
      { rootMargin: "300px 0px", threshold: 0.2 },
    );
    const items = node.querySelectorAll("[data-index]");
    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, [visiblePages.length, onActiveIndexChange]);

  useEffect(() => {
    if (visiblePages.length === 0) {
      return;
    }
    preloadImages(
      visiblePages,
      Math.max(0, activeIndex + 1),
      Math.max(1, prefetchCount),
    );
  }, [visiblePages, activeIndex, prefetchCount]);

  useEffect(() => {
    const timers = retryTimersRef.current;
    return () => {
      Object.values(timers).forEach((timer) => {
        if (timer) {
          clearTimeout(timer);
        }
      });
    };
  }, []);

  const scheduleRetry = (index, delayMs) => {
    if (retryTimersRef.current[index]) {
      clearTimeout(retryTimersRef.current[index]);
    }
    retryTimersRef.current[index] = setTimeout(() => {
      loadStartRef.current[index] = Date.now();
      setLoadingPages((prev) => ({ ...prev, [index]: true }));
      setErrorPages((prev) => ({ ...prev, [index]: false }));
      setReloadKeys((prev) => ({ ...prev, [index]: Date.now() }));
      onRetryPage?.(index);
    }, delayMs);
  };

  const handleError = (index) => {
    setErrorPages((prev) => ({ ...prev, [index]: true }));
    trackEvent("reader_image_error", { index });
    pushPerfMetric("reader_img_error", 1);
    const attempts = (retryAttemptsRef.current[index] || 0) + 1;
    retryAttemptsRef.current[index] = attempts;
    if (attempts === 2) {
      setQualityOverrides((prev) => ({
        ...prev,
        [index]: Math.max(40, (imageQuality || 75) - 25),
      }));
    }
    if (attempts <= 3) {
      const delay = 500 * Math.pow(2, attempts - 1);
      scheduleRetry(index, delay);
    }
  };

  const handleLoad = (index) => {
    const start = loadStartRef.current[index];
    if (!start) {
      return;
    }
    const durationMs = Date.now() - start;
    trackEvent("reader_image_load", { index, durationMs });
    pushPerfMetric("reader_img_ms", durationMs);
    setLoadingPages((prev) => ({ ...prev, [index]: false }));
  };

  const handleRetry = (index) => {
    retryAttemptsRef.current[index] =
      (retryAttemptsRef.current[index] || 0) + 1;
    scheduleRetry(index, 0);
  };

  return (
    <div
      ref={containerRef}
      className={`mx-auto w-full ${
        isHorizontal
          ? "max-w-[1400px] flex gap-4 overflow-x-auto scroll-snap-x no-scrollbar px-3 pb-28 pt-5 sm:px-4 sm:pt-6"
          : isVerticalComicFlow
            ? "max-w-[960px] flex flex-col gap-1 bg-[#050505] px-0 pb-36 pt-0 leading-none sm:gap-1.5"
            : cn(
                "max-w-[760px] flex flex-col px-5 pb-28 pt-6 sm:px-6 sm:pt-8",
                proseThemeClass,
              )
      }`}
      style={isVerticalComicFlow ? { lineHeight: 0 } : undefined}
    >
      {visiblePages.length === 0 && visibleParagraphs.length === 0 ? (
        <div className="rounded-2xl border border-neutral-900 bg-neutral-900/50 p-6 text-sm text-neutral-300">
          <p className="text-base font-semibold text-neutral-100">No content</p>
          <p className="mt-2 text-xs text-neutral-400">
            Pages are not live yet.
          </p>
        </div>
      ) : visiblePages.length > 0 ? (
        <>
          <div
            aria-hidden="true"
            data-testid="comic-reader-ssr-marker"
            className="block h-px w-full opacity-0"
          />
          {visiblePages.map((page, index) => {
            const placeholderMeta = readPlaceholdPageMeta(page.url);
            const shouldRenderImage =
              Boolean(readyPages[index]) || Boolean(placeholderMeta);

            return (
              <div
                key={page.url}
                className={`${
                  isHorizontal
                    ? "flex-none w-full scroll-snap-item rounded-2xl border border-neutral-900 bg-neutral-900/50 p-2"
                    : "block m-0 rounded-none border-0 bg-transparent p-0 leading-none"
                }`}
                style={
                  isHorizontal
                    ? {
                        contentVisibility: "auto",
                        containIntrinsicSize: "1200px 800px",
                      }
                    : { lineHeight: 0, margin: 0, padding: 0 }
                }
                data-index={index}
              >
                {placeholderMeta ? (
                  <ReaderEditorialFallback
                    page={page}
                    meta={placeholderMeta}
                    index={index}
                    isHorizontal={isHorizontal}
                    seriesId={seriesId}
                    seriesTitle={seriesTitle}
                    episodeTitle={episodeTitle}
                  />
                ) : errorPages[index] ? (
                  <div className="flex flex-col items-center gap-3 py-10 text-sm text-neutral-300">
                    <p className="text-base font-semibold text-neutral-100">
                      Page unavailable
                    </p>
                    <button
                      type="button"
                      onClick={() => handleRetry(index)}
                      className="rounded-full border-2 border-black bg-[#FFE500] px-4 py-2 text-xs font-black uppercase tracking-[0.08em] text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                    >
                      Tap to retry
                    </button>
                  </div>
                ) : !shouldRenderImage ? (
                  <div
                    className={`animate-pulse ${
                      isHorizontal
                        ? "rounded-xl bg-neutral-800/60"
                        : "m-0 block rounded-none bg-neutral-800/60 p-0 leading-none"
                    }`}
                    style={{
                      height: 0,
                      margin: 0,
                      padding: 0,
                      paddingTop: `${((page.h || 1200) / (page.w || 800)) * 100}%`,
                    }}
                    role="img"
                    aria-label={buildComicPageAlt(
                      seriesTitle,
                      episodeTitle,
                      index,
                    )}
                  />
                ) : (
                  <div
                    className={
                      isHorizontal
                        ? "relative overflow-hidden rounded-xl"
                        : "relative m-0 block overflow-hidden bg-[#050505] p-0 leading-none"
                    }
                    style={
                      isHorizontal
                        ? undefined
                        : { lineHeight: 0, margin: 0, padding: 0 }
                    }
                  >
                    {loadingPages[index] !== false ? (
                      <div
                        className={`pointer-events-none absolute inset-0 z-[1] animate-pulse ${
                          isHorizontal
                            ? "rounded-xl bg-neutral-800/60"
                            : "m-0 rounded-none bg-neutral-800/60"
                        }`}
                        style={{
                          margin: 0,
                          padding: 0,
                          lineHeight: 0,
                        }}
                      />
                    ) : null}
                    <NextImage
                      src={
                        reloadKeys[index]
                          ? `${normalizeLegacyImageUrl(page.url)}${page.url.includes("?") ? "&" : "?"}retry=${reloadKeys[index]}`
                          : normalizeLegacyImageUrl(page.url)
                      }
                      alt={buildComicPageAlt(seriesTitle, episodeTitle, index)}
                      width={page.w || 800}
                      height={page.h || 1200}
                      className={`m-0 w-full p-0 align-top transition-opacity duration-200 ${
                        isHorizontal ? "block rounded-xl" : "block rounded-none"
                      } ${loadingPages[index] !== false ? "opacity-0" : "opacity-100"} ${
                        isNightMode ? "brightness-90 contrast-105" : ""
                      }`}
                      style={{
                        display: "block",
                        margin: 0,
                        maxWidth: isHorizontal
                          ? undefined
                          : "min(100vw, 960px)",
                        width: "100%",
                        height: "auto",
                        padding: 0,
                        lineHeight: 0,
                      }}
                      onError={() => handleError(index)}
                      onLoad={() => handleLoad(index)}
                      priority={index < Math.min(initialReadyCount, 2)}
                      loading={
                        index < Math.min(initialReadyCount, 2)
                          ? "eager"
                          : "lazy"
                      }
                      quality={qualityOverrides[index] || imageQuality}
                      sizes={
                        imageSizes ||
                        (isHorizontal
                          ? "(max-width: 768px) 100vw, 90vw"
                          : "(max-width: 768px) 100vw, (max-width: 1200px) 82vw, 960px")
                      }
                    />
                  </div>
                )}
              </div>
            );
          })}
        </>
      ) : (
        <article
          className="mx-auto w-full max-w-[42.5rem] pb-8"
          style={{
            fontSize: `${fontSize}px`,
            lineHeight,
          }}
        >
          {visibleParagraphs.map((paragraph, index) => (
            <div
              key={`paragraph-${index}`}
              className="w-full"
              style={{
                contentVisibility: "auto",
                containIntrinsicSize: "180px 560px",
              }}
              data-index={index}
            >
              {index === 0 ? (
                <div
                  className={`mb-6 text-[11px] font-semibold uppercase tracking-[0.24em] ${proseMutedClass}`}
                >
                  Continue reading
                </div>
              ) : null}
              <p
                className="whitespace-pre-wrap break-words text-[1em] leading-[inherit]"
                style={{
                  marginBottom:
                    index === visibleParagraphs.length - 1 ? "0" : "1.18em",
                }}
              >
                {paragraph}
              </p>
            </div>
          ))}
        </article>
      )}
      {typeof previewCount === "number" ||
      typeof previewParagraphs === "number" ? (
        <div ref={onPreviewEndRef} />
      ) : null}
      <div ref={onEndRef} />
    </div>
  );
}
