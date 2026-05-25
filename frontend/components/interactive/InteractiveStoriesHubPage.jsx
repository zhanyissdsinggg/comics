"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { apiGet } from "../../lib/apiClient";
import { useAdultGateStore } from "../../store/useAdultGateStore";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../ui/card";
import SurfacePanel from "../common/SurfacePanel";
import { getInteractiveCover, normalizeText } from "./interactiveShared";

function formatModeLabel(contentMode) {
  return contentMode === "adult" ? "18+ Mode" : "Normal Mode";
}

function formatStatusLabel(status) {
  return String(status || "").trim().toLowerCase() === "published"
    ? "Live"
    : "Draft";
}

export default function InteractiveStoriesHubPage({ initialStories = [] }) {
  const [stories, setStories] = useState(Array.isArray(initialStories) ? initialStories : []);
  const [loading, setLoading] = useState(!initialStories?.length);
  const [error, setError] = useState("");
  const { contentMode } = useAdultGateStore();

  useEffect(() => {
    let cancelled = false;

    async function loadStories() {
      setLoading(true);
      setError("");
      const adultFlag = contentMode === "adult" ? "1" : "0";
      const response = await apiGet(`/api/interactive-stories?adult=${adultFlag}`, {
        cacheMs: 30_000,
        bust: true,
      });
      if (cancelled) {
        return;
      }

      if (!response.ok) {
        setStories([]);
        setError("Couldn't load interactive stories right now.");
        setLoading(false);
        return;
      }

      setStories(Array.isArray(response.data?.stories) ? response.data.stories : []);
      setLoading(false);
    }

    void loadStories();
    return () => {
      cancelled = true;
    };
  }, [contentMode]);

  const heroCopy = useMemo(
    () =>
      contentMode === "adult"
        ? "Late-night routes, sharper turns, and mature-only branching stories."
        : "Choice-heavy stories built for cliffhangers, reruns, and split-second bad decisions.",
    [contentMode],
  );

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#0d0b13_0%,#120f18_46%,#16121d_100%)] text-white">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8">
        <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(255,229,0,0.16),transparent_30%),linear-gradient(180deg,rgba(15,13,24,0.95)_0%,rgba(11,10,20,0.98)_100%)] p-6 shadow-[0_28px_90px_rgba(8,6,20,0.34)] sm:p-8">
          <div className="absolute right-4 top-4 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/65">
            {formatModeLabel(contentMode)}
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ffe500]">
            Interactive Stories
          </p>
          <h1 className="mt-3 max-w-3xl text-[2.3rem] font-black uppercase tracking-[-0.06em] text-white sm:text-[3rem]">
            Pick the branch. Own the fallout.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/72 sm:text-[15px]">
            {heroCopy}
          </p>
        </section>

        {error ? (
          <SurfacePanel tone="danger" accent="rose" appearance="dark">
            {error}
          </SurfacePanel>
        ) : null}

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={`interactive-hub-skeleton-${index}`}
                className="h-[360px] animate-pulse rounded-[28px] border border-white/10 bg-white/5"
              />
            ))}
          </div>
        ) : stories.length === 0 ? (
          <SurfacePanel tone="muted" accent="amber" appearance="dark">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">
                  Empty Shelf
                </p>
                <h2 className="mt-2 text-xl font-black uppercase tracking-[-0.04em] text-white">
                  No interactive stories in this mode yet.
                </h2>
              </div>
              <Badge variant="outline">Mode locked clean</Badge>
            </div>
          </SurfacePanel>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {stories.map((story) => {
              const cover = getInteractiveCover(story);
              return (
                <Card
                  key={story.id}
                  className="overflow-hidden border-white/10 bg-[rgba(255,255,255,0.98)] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
                >
                  <div className="relative aspect-[4/5] overflow-hidden border-b-2 border-black bg-[#111]">
                    <img
                      src={cover}
                      alt={normalizeText(story.title || "Interactive story cover")}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,transparent_0%,rgba(0,0,0,0.85)_100%)] p-4">
                      <div className="flex flex-wrap gap-2">
                        <Badge>{formatStatusLabel(story.status)}</Badge>
                        {story.genre ? <Badge variant="secondary">{story.genre}</Badge> : null}
                      </div>
                    </div>
                  </div>
                  <CardHeader>
                    <CardTitle>{normalizeText(story.title)}</CardTitle>
                    <CardDescription>
                      {normalizeText(story.description || "Branching story route.")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      <Sparkles className="size-3.5" />
                      {formatModeLabel(story.contentMode)}
                    </div>
                  </CardContent>
                  <CardFooter className="justify-between gap-3">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/interactive/${encodeURIComponent(story.slug)}`}>
                        Details
                      </Link>
                    </Button>
                    <Button asChild size="sm">
                      <Link href={`/interactive/${encodeURIComponent(story.slug)}/play`}>
                        Start
                        <ArrowRight className="size-4" />
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
