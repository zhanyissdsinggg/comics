"use client";

import { Suspense, lazy } from "react";
import ReaderSkeleton from "../../../../components/reader/ReaderSkeleton";

const ReaderPageRuntime = lazy(() => import("./ReaderPageRuntime"));

function ReaderLoadingShell({ fallbackData }) {
  const fallbackSeriesType = String(fallbackData?.seriesType || "")
    .trim()
    .toLowerCase();
  const isNovel =
    fallbackSeriesType.includes("novel") ||
    fallbackSeriesType.includes("fiction") ||
    fallbackSeriesType.includes("text");
  const backToSeriesHref = fallbackData?.backToSeriesHref || "/";
  const darkRootClass =
    "overflow-x-hidden bg-[radial-gradient(circle_at_top,rgba(255,79,154,0.12),transparent_26%),radial-gradient(circle_at_82%_16%,rgba(103,232,249,0.1),transparent_24%),linear-gradient(180deg,#05060a_0%,#0a0d16_46%,#05060a_100%)] text-white";
  const darkBorderClass =
    "border-white/10 bg-[rgba(255,255,255,0.035)]";
  const darkHeroClass =
    "rounded-[30px] border border-white/10 bg-[linear-gradient(145deg,rgba(17,20,30,0.96)_0%,rgba(8,10,16,0.98)_50%,rgba(20,12,26,0.94)_100%)] px-5 py-6 shadow-[0_28px_80px_rgba(0,0,0,0.34)] md:px-7 md:py-7";

  return (
    <ReaderSkeleton
      isComic={!isNovel}
      rootClassName={darkRootClass}
      mutedClassName="text-white/58"
      borderClassName={darkBorderClass}
      heroClassName={darkHeroClass}
      fallbackSeriesTitle={fallbackData?.seriesTitle || "Reader"}
      fallbackEpisodeTitle={fallbackData?.episodeTitle || "Preparing chapter"}
      backToSeriesHref={backToSeriesHref}
      onBack={() => {
        if (typeof window !== "undefined") {
          window.location.href = backToSeriesHref;
        }
      }}
    />
  );
}

export default function ReaderPageShell({
  seriesId,
  episodeId,
  fallbackData,
  initialReaderPayload,
}) {
  return (
    <Suspense fallback={<ReaderLoadingShell fallbackData={fallbackData} />}>
      <ReaderPageRuntime
        seriesId={seriesId}
        episodeId={episodeId}
        fallbackData={fallbackData}
        initialReaderPayload={initialReaderPayload}
      />
    </Suspense>
  );
}
