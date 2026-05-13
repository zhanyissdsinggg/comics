"use client";

import { Suspense, lazy } from "react";

const ReaderPageRuntime = lazy(() => import("./ReaderPageRuntime"));

function ReaderLoadingShell({ fallbackData }) {
  return (
    <main className="min-h-screen overflow-hidden bg-[linear-gradient(180deg,#09070c_0%,#120b13_42%,#0b0910_100%)] text-white">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
        <section className="rounded-[28px] border border-white/10 bg-[rgba(255,255,255,0.03)] p-5 shadow-[0_20px_48px_rgba(8,6,20,0.24)] sm:p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/56">
            Reader
          </p>
          <h1 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-4xl">
            {fallbackData?.seriesTitle || "Loading reader"}
          </h1>
          <p className="mt-2 text-sm font-semibold text-white/68">
            {fallbackData?.episodeTitle || "Preparing chapter"}
          </p>
          <div className="mt-5 h-2.5 w-40 rounded-full bg-white/10" />
        </section>
        <section className="space-y-4">
          <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="h-10 w-28 rounded-full bg-white/10" />
              <div className="h-10 w-36 rounded-full bg-white/10" />
            </div>
            <div className="mt-4 h-3 w-48 rounded-full bg-white/10" />
          </div>
          <div className="h-[45vh] rounded-[28px] border border-white/10 bg-white/[0.03]" />
          <div className="h-[45vh] rounded-[28px] border border-white/10 bg-white/[0.03]" />
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
