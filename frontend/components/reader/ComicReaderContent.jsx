"use client";

import PageStream from "./PageStream";
import { cn } from "../../lib/utils";

export default function ComicReaderContent({
  pages,
  paragraphs,
  openingParagraphs,
  seriesId,
  seriesTitle,
  episodeTitle,
  previewCount,
  previewParagraphs,
  layoutMode,
  isNightMode,
  imageQuality,
  imageSizes,
  seriesType,
  brightness,
  showOpeningParagraphs = false,
  onActiveIndexChange,
  onPreviewEndRef,
  onEndRef,
  onToggleChrome,
}) {
  return (
    <section className="relative">
      <div className="mx-auto w-full max-w-[1120px]">
        {showOpeningParagraphs && Array.isArray(openingParagraphs) && openingParagraphs.length > 0 ? (
          <article className="reader-prose mx-auto mb-5 w-full max-w-[44rem] px-1 pt-1 text-white/92 sm:px-0">
            {openingParagraphs.map((paragraph, index) => (
              <p
                key={`comic-opening-${index}`}
                className="whitespace-pre-wrap break-words text-[1em] leading-[inherit]"
                style={{
                  marginBottom:
                    index === openingParagraphs.length - 1 ? "0" : "1.35em",
                }}
              >
                {paragraph}
              </p>
            ))}
          </article>
        ) : null}
        <div
          data-testid="comic-reader-content"
          data-reader-kind="comic"
          role="region"
          aria-label="Comic reader content"
          className={cn(
            "relative overflow-hidden rounded-none bg-[#050505] md:rounded-[20px]",
          )}
          style={{ filter: `brightness(${brightness}%)` }}
          onClick={onToggleChrome}
        >
          <div
            aria-hidden="true"
            data-testid="comic-reader-shell-marker"
            className="block h-px w-full opacity-0"
          />
          <PageStream
            pages={pages}
            paragraphs={paragraphs}
            seriesId={seriesId}
            seriesTitle={seriesTitle}
            episodeTitle={episodeTitle}
            previewCount={previewCount}
            previewParagraphs={previewParagraphs}
            layoutMode={layoutMode}
            isNightMode={isNightMode}
            imageQuality={imageQuality}
            imageSizes={imageSizes}
            seriesType={seriesType}
            onActiveIndexChange={onActiveIndexChange}
            onPreviewEndRef={onPreviewEndRef}
            onEndRef={onEndRef}
          />
        </div>
      </div>
    </section>
  );
}
