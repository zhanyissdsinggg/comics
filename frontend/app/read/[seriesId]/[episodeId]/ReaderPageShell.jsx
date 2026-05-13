"use client";

import { Suspense, lazy } from "react";

const ReaderPageRuntime = lazy(() => import("./ReaderPageRuntime"));

function ReaderLoadingShell({ fallbackData }) {
  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_22%),linear-gradient(180deg,#050608_0%,#0a0d12_34%,#060709_100%)] text-white">
      <div className="mx-auto flex max-w-[1040px] flex-col gap-8 px-4 pb-16 pt-8 sm:px-6 sm:pt-10">
        <section className="border-b border-white/8 pb-6">
          <div className="h-3 w-24 rounded-full bg-white/10" />
          <div className="mt-5 h-10 w-3/4 max-w-xl rounded-full bg-white/10 sm:h-12" />
          <div className="mt-3 h-4 w-52 max-w-[65%] rounded-full bg-white/10" />
          <div className="mt-5 flex flex-wrap gap-2">
            <div className="h-8 w-24 rounded-full bg-white/8" />
            <div className="h-8 w-32 rounded-full bg-white/8" />
          </div>
        </section>

        <section className="mx-auto w-full max-w-[760px] space-y-5">
          <div className="h-[28vh] animate-pulse rounded-[28px] border border-white/8 bg-white/[0.04]" />
          <div className="h-[42vh] animate-pulse rounded-[28px] border border-white/8 bg-white/[0.04]" />
          <div className="h-[42vh] animate-pulse rounded-[28px] border border-white/8 bg-white/[0.04]" />
        </section>

        <section className="mx-auto flex w-full max-w-[760px] items-center justify-between rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4">
          <div className="space-y-2">
            <div className="h-3 w-20 rounded-full bg-white/10" />
            <div className="h-4 w-32 rounded-full bg-white/10" />
          </div>
          <div className="h-11 w-11 rounded-2xl bg-white/10" />
        </section>
      </div>
    </main>
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
