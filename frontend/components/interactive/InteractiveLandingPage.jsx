"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiGet } from "../../lib/apiClient";
import SurfacePanel from "../common/SurfacePanel";

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export default function InteractiveLandingPage() {
  const [loading, setLoading] = useState(true);
  const [stories, setStories] = useState([]);

  useEffect(() => {
    let active = true;
    apiGet("/api/interactive-stories", { cacheMs: 0, bust: true }).then((response) => {
      if (!active) {
        return;
      }
      setStories(Array.isArray(response.data?.stories) ? response.data.stories : []);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,rgba(31,88,119,0.22)_0%,rgba(13,16,27,0.98)_42%,#07080d_100%)] text-white">
      <div className="mx-auto flex max-w-[1320px] flex-col gap-8 px-4 py-8 md:px-8 md:py-10">
        <section className="rounded-[32px] border border-white/10 bg-[rgba(10,12,20,0.72)] p-6 shadow-[0_28px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:p-8">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-cyan-200/70">
            Interactive Stories
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-black uppercase tracking-[-0.06em] text-white sm:text-5xl">
            Pick a route. Wear the consequences.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/72 sm:text-base">
            Branching comic and novel experiences built for replay. Every node moves,
            every choice leaves a mark, and endings are earned.
          </p>
        </section>

        {loading ? (
          <SurfacePanel tone="muted" accent="cyan" appearance="dark">
            Loading
          </SurfacePanel>
        ) : (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {stories.map((story) => (
              <Link
                key={story.id}
                href={`/interactive/${encodeURIComponent(story.slug)}`}
                className="group rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(24,28,38,0.98)_0%,rgba(12,14,22,0.98)_100%)] p-5 shadow-[0_22px_48px_rgba(0,0,0,0.22)] transition-all duration-200 hover:-translate-y-1 hover:border-white/18"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full border border-white/12 bg-white/6 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/64">
                    {story.contentMode}
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200/70">
                    Open
                  </span>
                </div>
                <h2 className="mt-4 text-2xl font-black tracking-[-0.05em] text-white">
                  {normalizeText(story.title)}
                </h2>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-white/68">
                  {normalizeText(story.description || "A branching interactive story.")}
                </p>
                <div className="mt-6 inline-flex items-center rounded-full border border-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/70 transition group-hover:border-cyan-200/30 group-hover:text-cyan-100">
                  Enter story
                </div>
              </Link>
            ))}
            {stories.length === 0 ? (
              <div className="rounded-[28px] border border-white/10 bg-[rgba(12,14,22,0.98)] p-6 text-sm leading-7 text-white/70">
                No interactive stories are published for this content mode yet.
              </div>
            ) : null}
          </section>
        )}
      </div>
    </main>
  );
}
