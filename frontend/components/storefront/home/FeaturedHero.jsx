"use client";

import Link from "next/link";
import { ArrowRight, BookOpenText, Library, Sparkles } from "lucide-react";
import { resolveDisplayImageUrl } from "../../../lib/fallbackImage";
import { trackEvent } from "../../../lib/trackEvent";
import GenreChip from "./GenreChip";

function buildCoverAlt(series) {
  const title = String(series?.title || "").trim() || "Untitled";
  return `Featured artwork for ${title}`;
}

export default function FeaturedHero({
  series,
  primaryHref,
  secondaryHref,
  chips = [],
  stats = [],
}) {
  if (!series) {
    return null;
  }

  const title = String(series?.title || "").trim();
  const description = "Open a story you'll keep thinking about.";
  const backgroundUrl = resolveDisplayImageUrl(
    series?.bannerUrl || series?.coverUrl,
    {
      kind: series?.bannerUrl ? "banner" : "cover",
      adult: series?.adult || series?.isAdult,
    },
  );
  const posterUrl = resolveDisplayImageUrl(series?.coverUrl, {
    kind: "cover",
    adult: series?.adult || series?.isAdult,
  });

  return (
    <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-[#0b0d15] shadow-[0_32px_100px_rgba(0,0,0,0.42)]">
      <div className="absolute inset-0">
        <img
          src={backgroundUrl}
          alt={buildCoverAlt(series)}
          className="h-full w-full object-cover opacity-45"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,8,15,0.96)_0%,rgba(8,10,18,0.82)_40%,rgba(8,9,17,0.42)_72%,rgba(8,10,18,0.88)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(255,92,164,0.22),transparent_24%),radial-gradient(circle_at_78%_18%,rgba(103,232,249,0.18),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_28%)]" />
      </div>

      <div className="relative grid gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(280px,360px)] lg:items-center lg:gap-8 lg:p-8">
        <div className="order-2 space-y-5 lg:order-1 lg:max-w-[40rem]">
          <div className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--gush-warning)]">
              Featured Today
            </p>
            <h1 className="max-w-[11ch] font-display text-[2.5rem] font-semibold leading-[0.88] tracking-[-0.075em] text-white sm:text-[3.8rem] lg:text-[4.6rem]">
              {title}
            </h1>
            <p className="max-w-[34rem] text-base leading-[1.72] text-white/72">
              {description}
            </p>
          </div>

          {chips.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {chips.map((chip) => (
                <GenreChip key={`hero-${chip}`} label={chip} tone="ghost" />
              ))}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href={primaryHref}
              data-testid="home-hero-primary-cta"
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-[rgba(255,143,184,0.28)] bg-[linear-gradient(135deg,#ff5aa3_0%,#ff8cb8_100%)] px-6 text-sm font-semibold text-[#180d15] shadow-[0_18px_42px_rgba(255,79,154,0.24)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_54px_rgba(255,79,154,0.3)]"
              onClick={() =>
                trackEvent("story_click", {
                  seriesId: series?.id,
                  sourceSection: "home_featured_hero_primary",
                  position: 1,
                })
              }
            >
              Start Reading
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href={secondaryHref}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-5 text-sm font-medium text-white shadow-[0_14px_30px_rgba(8,6,20,0.18)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/[0.1]"
              onClick={() =>
                trackEvent("story_click", {
                  seriesId: series?.id,
                  sourceSection: "home_featured_hero_secondary",
                  position: 1,
                })
              }
            >
              View Series
              <Library className="size-4" />
            </Link>
          </div>

          {stats.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-3">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,13,22,0.58)_0%,rgba(10,13,22,0.46)_100%)] px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_18px_38px_rgba(8,6,20,0.18)] backdrop-blur-xl"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/42">
                    {stat.label}
                  </p>
                  <p className="mt-2 text-[0.98rem] font-semibold tracking-[-0.02em] text-white/86">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="order-1 mx-auto w-full max-w-[340px] lg:order-2">
          <div className="relative mx-auto w-full max-w-[340px]">
            <div className="absolute inset-5 rounded-[32px] bg-[rgba(103,232,249,0.12)] blur-3xl" />
            <div className="absolute inset-4 -rotate-[5deg] rounded-[30px] border border-white/8 bg-white/[0.04]" />
            <div className="absolute inset-3 rotate-[4deg] rounded-[30px] border border-white/8 bg-[rgba(255,92,164,0.08)]" />
              <div className="relative aspect-[0.72] overflow-hidden rounded-[30px] border border-white/12 shadow-[0_26px_72px_rgba(0,0,0,0.44)]">
                <img
                  src={posterUrl}
                  alt={buildCoverAlt(series)}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,transparent_22%,rgba(0,0,0,0.54)_100%)]" />
                <div className="absolute inset-x-3 bottom-3 rounded-[22px] border border-white/10 bg-[rgba(8,10,18,0.74)] p-3 backdrop-blur-xl">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/58">
                  <Sparkles className="size-3.5 text-[var(--gush-warning)]" />
                  Featured Today
                </div>
                <p className="mt-2 text-base font-semibold leading-[1.1] text-white">
                  Open a story you&apos;ll keep thinking about.
                </p>
                <p className="mt-2 inline-flex items-center gap-2 text-sm text-white/62">
                  <BookOpenText className="size-4" />
                  One more chapter energy.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
