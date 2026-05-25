"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Route } from "lucide-react";
import { apiGet } from "../../lib/apiClient";
import { useAdultGateStore } from "../../store/useAdultGateStore";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import SurfacePanel from "../common/SurfacePanel";
import { getInteractiveCover, normalizeText } from "./interactiveShared";

export default function InteractiveStoryDetailPage({
  slug,
  initialStory = null,
}) {
  const [story, setStory] = useState(initialStory);
  const [loading, setLoading] = useState(!initialStory);
  const [error, setError] = useState("");
  const { contentMode } = useAdultGateStore();

  useEffect(() => {
    let cancelled = false;

    async function loadStory() {
      const normalizedSlug = normalizeText(slug);
      if (!normalizedSlug) {
        setError("Invalid interactive story.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      const adultFlag = contentMode === "adult" ? "1" : "0";
      const response = await apiGet(
        `/api/interactive-stories/slug/${encodeURIComponent(normalizedSlug)}?adult=${adultFlag}`,
        {
          cacheMs: 30_000,
          bust: true,
        },
      );

      if (cancelled) {
        return;
      }

      if (!response.ok || !response.data?.story) {
        setStory(null);
        setError("This story isn't available in the current mode.");
        setLoading(false);
        return;
      }

      setStory(response.data.story);
      setLoading(false);
    }

    void loadStory();
    return () => {
      cancelled = true;
    };
  }, [contentMode, slug]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#0d0b13_0%,#120f18_46%,#16121d_100%)] text-white">
        <div className="mx-auto max-w-[1120px] px-4 py-8 sm:px-6">
          <div className="h-[520px] animate-pulse rounded-[30px] border border-white/10 bg-white/5" />
        </div>
      </main>
    );
  }

  if (!story) {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#0d0b13_0%,#120f18_46%,#16121d_100%)] text-white">
        <div className="mx-auto max-w-[1120px] px-4 py-8 sm:px-6">
          <SurfacePanel tone="danger" accent="rose" appearance="dark">
            {error || "Interactive story not found."}
          </SurfacePanel>
        </div>
      </main>
    );
  }

  const cover = getInteractiveCover(story);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#0d0b13_0%,#120f18_46%,#16121d_100%)] text-white">
      <div className="mx-auto flex max-w-[1120px] flex-col gap-8 px-4 py-8 sm:px-6">
        <section className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <div className="overflow-hidden rounded-[30px] border border-white/10 bg-black shadow-[0_24px_70px_rgba(8,6,20,0.36)]">
            <img
              src={cover}
              alt={normalizeText(story.title || "Interactive story cover")}
              className="aspect-[4/5] w-full object-cover"
            />
          </div>

          <SurfacePanel tone="highlight" accent="cyan" appearance="dark">
            <div className="flex flex-wrap gap-2">
              <Badge>{story.contentMode === "adult" ? "18+ Story" : "Normal Story"}</Badge>
              {story.genre ? <Badge variant="outline">{story.genre}</Badge> : null}
              <Badge variant="outline">{story.nodeCount || 0} Nodes</Badge>
              <Badge variant="outline">{story.endingCount || 0} Endings</Badge>
            </div>

            <h1 className="mt-4 text-[2.1rem] font-black uppercase tracking-[-0.06em] text-white sm:text-[2.8rem]">
              {normalizeText(story.title)}
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/75 sm:text-[15px]">
              {normalizeText(
                story.description ||
                  "A branching story route built for replaying every bad idea twice.",
              )}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
                  Start Node
                </p>
                <p className="mt-2 text-base font-semibold text-white">
                  {normalizeText(story.startNodeKey || "Start")}
                </p>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
                  Structure
                </p>
                <p className="mt-2 flex items-center gap-2 text-base font-semibold text-white">
                  <Route className="size-4" />
                  Multiple branching outcomes
                </p>
              </div>
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href={`/interactive/${encodeURIComponent(story.slug)}/play`}>
                  Start Playing
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/interactive">Back to Interactive</Link>
              </Button>
            </div>
          </SurfacePanel>
        </section>
      </div>
    </main>
  );
}
