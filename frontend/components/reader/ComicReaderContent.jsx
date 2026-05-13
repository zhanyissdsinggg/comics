"use client";

import PageStream from "./PageStream";
import { cn } from "../../lib/utils";

export default function ComicReaderContent({
  pages,
  paragraphs,
  previewCount,
  previewParagraphs,
  layoutMode,
  isNightMode,
  imageQuality,
  imageSizes,
  seriesType,
  brightness,
  onActiveIndexChange,
  onPreviewEndRef,
  onEndRef,
  onToggleChrome,
}) {
  return (
    <section className="relative">
      <div className="mx-auto w-full max-w-[1120px]">
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
          <PageStream
            pages={pages}
            paragraphs={paragraphs}
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
