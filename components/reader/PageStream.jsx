"use client";

import { useEffect, useMemo, useState } from "react";

function preloadImages(pages, startIndex) {
  const next = pages.slice(startIndex, startIndex + 3);
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
  onPreviewEndRef,
  onEndRef,
  onRetryPage,
}) {
  const [errorPages, setErrorPages] = useState({});
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
      preloadImages(visiblePages, 0);
    }
  }, [visiblePages]);

  const handleError = (index) => {
    setErrorPages((prev) => ({ ...prev, [index]: true }));
  };

  const handleRetry = (index) => {
    setErrorPages((prev) => ({ ...prev, [index]: false }));
    onRetryPage?.(index);
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 pb-24 pt-6">
      {visiblePages.length > 0
        ? visiblePages.map((page, index) => (
            <div
              key={page.url}
              className="rounded-2xl border border-neutral-900 bg-neutral-900/50 p-2"
            >
              {errorPages[index] ? (
                <div className="flex flex-col items-center gap-3 py-10 text-sm text-neutral-400">
                  <p>Failed to load page.</p>
                  <button
                    type="button"
                    onClick={() => handleRetry(index)}
                    className="rounded-full border border-neutral-700 px-4 py-2 text-xs"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <img
                  src={page.url}
                  alt=""
                  className="w-full rounded-xl"
                  onError={() => handleError(index)}
                  loading="lazy"
                />
              )}
            </div>
          ))
        : visibleParagraphs.map((paragraph, index) => (
            <div
              key={`paragraph-${index}`}
              className="rounded-2xl border border-neutral-900 bg-neutral-900/50 p-4 text-sm text-neutral-200"
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
