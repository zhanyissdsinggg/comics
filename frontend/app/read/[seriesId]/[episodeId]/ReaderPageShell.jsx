"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";

const ReaderPage = dynamic(() => import("../../../../components/reader/ReaderPage"), {
  ssr: false,
});

function ReaderShellFallback({ fallbackData }) {
  const seriesTitle = String(fallbackData?.seriesTitle || "Reader").trim();
  const episodeTitle = String(
    fallbackData?.episodeTitle || "Loading entry",
  ).trim();

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="sticky top-0 z-20 border-b-2 border-white/10 bg-black/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link
            href={fallbackData?.backToSeriesHref || "/"}
            className="inline-flex min-h-[40px] items-center rounded-full border-2 border-white/15 bg-[#111111] px-4 text-sm font-semibold text-white transition-colors hover:border-white/25"
          >
            Back to series
          </Link>
          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-xs font-black uppercase tracking-[0.2em] text-white/55">
              {seriesTitle}
            </p>
            <h1 className="truncate text-base font-semibold text-white sm:text-lg">
              {episodeTitle}
            </h1>
          </div>
          <div className="hidden min-w-[122px] sm:block" />
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="rounded-[28px] border-2 border-white/15 bg-[#080808] p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-white/55">
            <span className="rounded-full border-2 border-white/12 bg-[#111111] px-3 py-1">
              Reader loading
            </span>
            <span className="rounded-full border-2 border-white/12 bg-[#111111] px-3 py-1">
              {seriesTitle}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-white/72">
            {fallbackData?.previousEpisode?.href ? (
              <Link
                href={fallbackData.previousEpisode.href}
                className="inline-flex items-center rounded-full border-2 border-white/15 bg-[#111111] px-4 py-2 font-semibold text-white hover:border-white/25"
              >
                Previous: {fallbackData.previousEpisode.label}
              </Link>
            ) : null}
            {fallbackData?.nextEpisode?.href ? (
              <Link
                href={fallbackData.nextEpisode.href}
                className="inline-flex items-center rounded-full border-2 border-white/15 bg-[#111111] px-4 py-2 font-semibold text-white hover:border-white/25"
              >
                Next: {fallbackData.nextEpisode.label}
              </Link>
            ) : null}
          </div>

          <div className="mt-5 space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={`reader-shell-${index}`}
                className="h-32 animate-pulse rounded-[24px] border-2 border-white/12 bg-[#111111] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:h-40"
              />
            ))}
          </div>

          <p className="mt-5 text-sm leading-6 text-white/65">
            Loading the full reader now. If it takes a second, you can still jump
            back to the series or move to the next entry from here.
          </p>

          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <Link
              href={fallbackData?.backToSeriesHref || "/"}
              className="inline-flex items-center rounded-full border-2 border-white/15 bg-[#111111] px-4 py-2 font-semibold text-white hover:border-white/25"
            >
              Back to series
            </Link>
            <Link
              href="/support"
              className="inline-flex items-center rounded-full border-2 border-white/15 bg-[#111111] px-4 py-2 font-semibold text-white hover:border-white/25"
            >
              Reader help
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function ReaderPageShell(props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <ReaderShellFallback fallbackData={props.fallbackData} />;
  }

  return <ReaderPage {...props} />;
}
