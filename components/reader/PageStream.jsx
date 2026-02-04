"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { track } from "../../lib/analytics";

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

function preloadImages(pages, startIndex, count = 3) {
  const next = pages.slice(startIndex, startIndex + count);
  next.forEach((page) => {
    const img = new Image();
    img.src = page.url;
  });
}

export default function PageStream({
  pages,
  paragraphs,
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
}) {
  const [errorPages, setErrorPages] = useState({});
  const [loadingPages, setLoadingPages] = useState({});
  const [reloadKeys, setReloadKeys] = useState({});
  const [qualityOverrides, setQualityOverrides] = useState({});
  const retryAttemptsRef = useRef({});
  const retryTimersRef = useRef({});
  const prefetchIndexRef = useRef(0);
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

  useEffect(() => {
    if (visiblePages.length > 0) {
      preloadImages(visiblePages, 0, Math.max(1, prefetchCount));
    }
  }, [visiblePages, prefetchCount]);

  useEffect(() => {
    const next = {};
    const loadingNext = {};
    visiblePages.forEach((_page, index) => {
      if (loadStartRef.current[index]) {
        next[index] = loadStartRef.current[index];
        loadingNext[index] = true;
        return;
      }
      next[index] = Date.now();
      loadingNext[index] = true;
    });
    loadStartRef.current = next;
    setLoadingPages(loadingNext);
  }, [visiblePages, reloadKeys]);

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
      { rootMargin: "300px 0px", threshold: 0.2 }
    );
    const items = node.querySelectorAll("[data-index]");
    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, [visiblePages.length, onActiveIndexChange]);

  useEffect(() => {
    if (visiblePages.length === 0) {
      return;
    }
    prefetchIndexRef.current = activeIndex;
    const timers = retryTimersRef.current;
    let cancelled = false;
    const prefetchChunk = () => {
      if (cancelled) {
        return;
      }
      const start = prefetchIndexRef.current;
      if (start >= visiblePages.length) {
        return;
      }
      const count = Math.max(1, prefetchCount);
      preloadImages(visiblePages, start, count);
      prefetchIndexRef.current = start + count;
      if (prefetchIndexRef.current < visiblePages.length) {
        timers.prefetch = setTimeout(prefetchChunk, 600);
      }
    };
    timers.prefetch = setTimeout(prefetchChunk, 0);
    return () => {
      cancelled = true;
      if (timers.prefetch) {
        clearTimeout(timers.prefetch);
      }
    };
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
      setErrorPages((prev) => ({ ...prev, [index]: false }));
      setReloadKeys((prev) => ({ ...prev, [index]: Date.now() }));
      onRetryPage?.(index);
    }, delayMs);
  };

  const handleError = (index) => {
    setErrorPages((prev) => ({ ...prev, [index]: true }));
    track("reader_image_error", { index });
    pushPerfMetric("reader_img_error", 1);
    const attempts = (retryAttemptsRef.current[index] || 0) + 1;
    retryAttemptsRef.current[index] = attempts;
    if (attempts === 2) {
      setQualityOverrides((prev) => ({ ...prev, [index]: Math.max(40, (imageQuality || 75) - 25) }));
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
    track("reader_image_load", { index, durationMs });
    pushPerfMetric("reader_img_ms", durationMs);
    setLoadingPages((prev) => ({ ...prev, [index]: false }));
  };

  const handleRetry = (index) => {
    retryAttemptsRef.current[index] = (retryAttemptsRef.current[index] || 0) + 1;
    scheduleRetry(index, 0);
  };

  return (
    <div
      ref={containerRef}
      className={`mx-auto w-full max-w-3xl px-3 pb-24 pt-5 sm:px-4 sm:pt-6 ${
        layoutMode === "horizontal"
          ? "flex gap-4 overflow-x-auto scroll-snap-x no-scrollbar"
          : "flex flex-col gap-4"
      }`}
    >
      {visiblePages.length === 0 && visibleParagraphs.length === 0 ? (
        <div className="rounded-2xl border border-neutral-900 bg-neutral-900/50 p-6 text-sm text-neutral-300">
          <p className="text-base font-semibold text-neutral-100">No content</p>
          <p className="mt-2 text-xs text-neutral-400">
            This episode has no pages yet. Please check back later.
          </p>
        </div>
      ) : visiblePages.length > 0
        ? visiblePages.map((page, index) => (
            <div
              key={page.url}
              className={`rounded-2xl border border-neutral-900 bg-neutral-900/50 p-2 ${
                layoutMode === "horizontal" ? "flex-none w-full scroll-snap-center" : ""
              }`}
              style={{ contentVisibility: "auto", containIntrinsicSize: "1200px 800px" }}
              data-index={index}
            >
              {errorPages[index] ? (
                <div className="flex flex-col items-center gap-3 py-10 text-sm text-neutral-300">
                  <p className="text-base font-semibold text-neutral-100">
                    Page {index + 1} failed to load
                  </p>
                  <p className="text-xs text-neutral-400">
                    Check your connection and try again.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleRetry(index)}
                    className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-neutral-900"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <>
                  {loadingPages[index] !== false ? (
                    <div
                      className="animate-pulse rounded-xl bg-neutral-800/60"
                      style={{
                        height: 0,
                        paddingTop: `${((page.h || 1200) / (page.w || 800)) * 100}%`,
                      }}
                    />
                  ) : null}
                  <Image
                    src={
                      reloadKeys[index]
                        ? `${page.url}${page.url.includes("?") ? "&" : "?"}retry=${reloadKeys[index]}`
                        : page.url
                    }
                    alt=""
                    width={page.w || 800}
                    height={page.h || 1200}
                    className={`w-full rounded-xl ${isNightMode ? "brightness-90 contrast-105" : ""}`}
                    onError={() => handleError(index)}
                    onLoad={() => handleLoad(index)}
                    priority={index < 2}
                    loading={index < 2 ? "eager" : "lazy"}
                    quality={qualityOverrides[index] || imageQuality}
                    sizes={imageSizes || "(max-width: 768px) 100vw, 768px"}
                  />
                </>
              )}
            </div>
          ))
        : visibleParagraphs.map((paragraph, index) => (
            <div
              key={`paragraph-${index}`}
              className="rounded-2xl border border-neutral-900 bg-neutral-900/50 p-4 text-sm text-neutral-200"
              style={{ contentVisibility: "auto", containIntrinsicSize: "200px 600px" }}
              data-index={index}
            >
              {paragraph}
            </div>
          ))}
      {typeof previewCount === "number" || typeof previewParagraphs === "number" ? (
        <div ref={onPreviewEndRef} />
      ) : null}
      <div ref={onEndRef} />
    </div>
  );
}
