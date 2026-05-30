"use client";

import Link from "next/link";
import { ArrowRight, Gamepad2, Route, Sparkles } from "lucide-react";
import { resolveDisplayImageUrl } from "../../../lib/fallbackImage";
import { trackEvent } from "../../../lib/trackEvent";
import {
  buildGenreLabel,
  buildStatusLabel,
} from "../landingUtils";
import GenreChip from "./GenreChip";

function InteractiveCover({ series, position }) {
  if (!series) {
    return null;
  }

  const imageUrl = resolveDisplayImageUrl(series?.coverUrl, {
    kind: "cover",
    adult: series?.adult || series?.isAdult,
  });

  return (
    <Link
      href={`/series/${series.id}`}
      className="group block w-[42vw] max-w-[180px] min-w-[140px] shrink-0 scroll-snap-item"
      onClick={() =>
        trackEvent("story_click", {
          seriesId: series?.id,
          sourceSection: "home_interactive_shelf",
          position,
        })
      }
    >
      <div className="overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.04] shadow-[0_18px_40px_rgba(0,0,0,0.3)] transition-all duration-200 group-hover:-translate-y-1 group-hover:border-white/16">
        <div className="aspect-[0.78] overflow-hidden">
          <img
            src={imageUrl}
            alt={`Cover image for ${series.title}`}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        </div>
        <div className="space-y-1 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100/70">
            {buildGenreLabel(series, 2) || "Interactive"}
          </p>
          <h3 className="line-clamp-2 text-sm font-semibold leading-[1.1] tracking-[-0.02em] text-white">
            {series.title}
          </h3>
          <p className="text-xs text-white/52">{buildStatusLabel(series)}</p>
        </div>
      </div>
    </Link>
  );
}

function ChoiceMap() {
  const nodes = [
    { label: "Continue", className: "left-0 top-8" },
    { label: "Trust them", className: "left-[42%] top-0" },
    { label: "Go alone", className: "right-2 top-12" },
    { label: "Lie first", className: "left-[40%] top-24" },
    { label: "Save them", className: "right-0 top-32" },
  ];

  return (
    <div className="relative h-[176px] overflow-hidden rounded-[26px] border border-white/10 bg-[rgba(8,10,18,0.58)] p-4 backdrop-blur-xl">
      <div className="absolute left-[18%] top-[34%] h-px w-[28%] bg-gradient-to-r from-[#7af0c9] to-[#8ec5ff]" />
      <div className="absolute left-[46%] top-[24%] h-[36%] w-px bg-gradient-to-b from-[#8ec5ff] to-[#ff7db1]" />
      <div className="absolute left-[48%] top-[52%] h-px w-[26%] bg-gradient-to-r from-[#ff7db1] to-[#9b8cff]" />
      <div className="absolute left-[60%] top-[16%] h-[44%] w-px bg-gradient-to-b from-[#8ec5ff] to-[#ff7db1]" />
      <div className="absolute left-[62%] top-[72%] h-px w-[20%] bg-gradient-to-r from-[#9b8cff] to-[#ff7db1]" />
      {nodes.map((node) => (
        <span
          key={node.label}
          className={`absolute inline-flex min-h-[32px] items-center rounded-full border border-white/12 bg-[rgba(255,255,255,0.07)] px-3 py-1 text-[11px] font-semibold tracking-[0.02em] text-white/82 ${node.className}`}
        >
          {node.label}
        </span>
      ))}
      <div className="absolute bottom-4 left-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/42">
          Fractured Path
        </p>
        <p className="mt-2 max-w-[18rem] text-sm text-white/64">
          Your choice changes the story.
        </p>
      </div>
    </div>
  );
}

export default function InteractiveStoriesBanner({ items = [] }) {
  if (!items.length) {
    return null;
  }

  const featured = items[0];
  const imageUrl = resolveDisplayImageUrl(
    featured?.bannerUrl || featured?.coverUrl,
    {
      kind: featured?.bannerUrl ? "banner" : "cover",
      adult: featured?.adult || featured?.isAdult,
    },
  );

  return (
    <section className="relative overflow-hidden rounded-[34px] border border-[rgba(103,232,249,0.16)] bg-[linear-gradient(135deg,rgba(7,10,18,0.98)_0%,rgba(13,11,25,0.98)_50%,rgba(16,12,24,0.98)_100%)] p-5 shadow-[0_26px_72px_rgba(0,0,0,0.34)] sm:p-6">
      <div className="absolute inset-0">
        <img
          src={imageUrl}
          alt={`Artwork for ${featured.title}`}
          className="h-full w-full object-cover opacity-18"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,92,164,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(103,232,249,0.16),transparent_30%),linear-gradient(135deg,rgba(8,10,18,0.9),rgba(9,11,21,0.96))]" />
      </div>

      <div className="relative grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.92fr)] xl:items-center">
        <div className="space-y-4">
          <GenreChip label="Interactive Stories" tone="accent" />
          <div className="space-y-3">
            <h2 className="max-w-[12ch] font-display text-[2.2rem] font-semibold leading-[0.94] tracking-[-0.06em] text-white sm:text-[3rem]">
              Your Choice Changes the Story
            </h2>
            <p className="max-w-[35rem] text-sm leading-7 text-white/70">
              Choice-driven stories built like late-night obsession fuel. Route swaps, secret scenes, and endings that shift because you touched the wrong thing first.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href="/interactive"
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#67e8f9_0%,#7af0c9_100%)] px-6 text-sm font-semibold text-[#08111b] transition-transform duration-200 hover:-translate-y-0.5"
            >
              Explore Stories
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/search?format=interactive"
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-5 text-sm font-medium text-white/82 transition-colors hover:bg-white/[0.1]"
            >
              More Routes
              <Route className="size-4" />
            </Link>
          </div>

          <div className="-mx-1 overflow-x-auto px-1 pb-1 no-scrollbar">
            <div className="flex min-w-max gap-3">
              {items.slice(0, 4).map((series, index) => (
                <InteractiveCover
                  key={series.id}
                  series={series}
                  position={index + 1}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[28px] border border-white/10 bg-[rgba(255,255,255,0.05)] p-4 backdrop-blur-xl">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-100/70">
              <Gamepad2 className="size-4" />
              Story flow
            </div>
            <ChoiceMap />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              "Secret routes unlock with better choices.",
              "Bad decisions can still be the fun route.",
            ].map((copy) => (
              <div
                key={copy}
                className="rounded-[24px] border border-white/10 bg-[rgba(255,255,255,0.04)] p-4 backdrop-blur-xl"
              >
                <Sparkles className="size-4 text-[var(--gush-warning)]" />
                <p className="mt-3 text-sm leading-6 text-white/72">{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
