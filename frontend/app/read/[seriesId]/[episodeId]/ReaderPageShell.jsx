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

  return (
    <ReaderSkeleton
      isComic={!isNovel}
      rootClassName={
        isNovel ? "bg-[#fafafa] text-[#1f2933]" : "bg-[#050505] text-white"
      }
      mutedClassName={isNovel ? "text-[#667085]" : "text-white/55"}
      borderClassName={
        isNovel ? "border-[#e5e7eb]" : "border-white/10 bg-white/[0.04]"
      }
      heroClassName={
        isNovel
          ? "rounded-[30px] border border-[#e5e7eb] bg-white px-5 py-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] md:px-7 md:py-7"
          : ""
      }
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
