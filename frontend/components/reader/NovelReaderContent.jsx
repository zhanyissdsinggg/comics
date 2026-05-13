"use client";

import PageStream from "./PageStream";
import { cn } from "../../lib/utils";

export default function NovelReaderContent({
  pages,
  paragraphs,
  previewCount,
  previewParagraphs,
  layoutMode,
  isNightMode,
  imageQuality,
  imageSizes,
  seriesType,
  textTheme,
  fontSize,
  lineHeight,
  brightness,
  shellClassName = "",
  onActiveIndexChange,
  onPreviewEndRef,
  onEndRef,
  onToggleChrome,
}) {
  return (
    <section className="relative">
      <div className="mx-auto w-full max-w-[760px]">
        <div
          data-testid="novel-reader-content"
          data-reader-kind="novel"
          data-reader-theme={textTheme}
          role="region"
          aria-label="Novel reader content"
          className={cn(
            "relative overflow-hidden rounded-[28px]",
            shellClassName,
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
            textTheme={textTheme}
            fontSize={fontSize}
            lineHeight={lineHeight}
            onActiveIndexChange={onActiveIndexChange}
            onPreviewEndRef={onPreviewEndRef}
            onEndRef={onEndRef}
          />
        </div>
      </div>
    </section>
  );
}
