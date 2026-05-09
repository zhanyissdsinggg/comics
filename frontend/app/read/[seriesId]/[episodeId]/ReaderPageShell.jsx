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
    <main className="min-h-screen bg-[linear-gradient(180deg,#0f0d13_0%,#130f18_44%,#17131d_100%)] text-white">
      <div className="sticky top-0 z-20 border-b border-white/10 bg-[rgba(15,13,19,0.86)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link
            href={fallbackData?.backToSeriesHref || "/"}
            className="inline-flex min-h-[40px] items-center rounded-full border border-white/12 bg-[rgba(255,255,255,0.05)] px-4 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:border-white/18 hover:bg-[rgba(255,255,255,0.08)]"
          >
            Back to series
          </Link>
          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-xs font-semibold uppercase tracking-[0.18em] text-white/55">
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
        <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(20,18,33,0.96)_0%,rgba(15,13,24,0.98)_100%)] p-5 shadow-[0_28px_72px_rgba(8,6,20,0.34)]">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-white/55">
            <span className="rounded-full border border-white/12 bg-[rgba(255,255,255,0.05)] px-3 py-1">
              Reader loading
            </span>
            <span className="rounded-full border border-white/12 bg-[rgba(255,255,255,0.05)] px-3 py-1">
              {seriesTitle}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-white/72">
            {fallbackData?.previousEpisode?.href ? (
              <Link
                href={fallbackData.previousEpisode.href}
                className="inline-flex items-center rounded-full border border-white/12 bg-[rgba(255,255,255,0.05)] px-4 py-2 font-semibold text-white transition-all hover:-translate-y-0.5 hover:border-white/18 hover:bg-[rgba(255,255,255,0.08)]"
              >
                Previous: {fallbackData.previousEpisode.label}
              </Link>
            ) : null}
            {fallbackData?.nextEpisode?.href ? (
              <Link
                href={fallbackData.nextEpisode.href}
                className="inline-flex items-center rounded-full border border-white/12 bg-[rgba(255,255,255,0.05)] px-4 py-2 font-semibold text-white transition-all hover:-translate-y-0.5 hover:border-white/18 hover:bg-[rgba(255,255,255,0.08)]"
              >
                Next: {fallbackData.nextEpisode.label}
              </Link>
            ) : null}
          </div>

          <div className="mt-5 space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={`reader-shell-${index}`}
                className="h-32 animate-pulse rounded-[24px] border border-white/10 bg-[rgba(255,255,255,0.04)] shadow-[0_20px_48px_rgba(8,6,20,0.24)] sm:h-40"
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
              className="inline-flex items-center rounded-full border border-white/12 bg-[rgba(255,255,255,0.05)] px-4 py-2 font-semibold text-white transition-all hover:-translate-y-0.5 hover:border-white/18 hover:bg-[rgba(255,255,255,0.08)]"
            >
              Back to series
            </Link>
            <Link
              href="/support"
              className="inline-flex items-center rounded-full border border-white/12 bg-[rgba(255,255,255,0.05)] px-4 py-2 font-semibold text-white transition-all hover:-translate-y-0.5 hover:border-white/18 hover:bg-[rgba(255,255,255,0.08)]"
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
