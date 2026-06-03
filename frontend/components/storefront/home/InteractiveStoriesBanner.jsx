"use client";

import { ArrowRight, Route, Sparkles } from "lucide-react";
import {
  storefrontHomeGlassCardClass,
  storefrontHomeSectionEyebrowClass,
} from "../../common/StorefrontPagePrimitives";
import { trackEvent } from "../../../lib/trackEvent";
import GradientButton from "./GradientButton";
import IconButton from "./IconButton";

function ChoiceMap() {
  const choiceNodes = [
    { label: "Trust them", className: "left-0 top-2" },
    { label: "Walk away", className: "left-[28%] top-16" },
    { label: "Report them", className: "left-[55%] top-5" },
  ];
  const endNodes = [
    { label: "END 01", className: "left-[14%] bottom-3" },
    { label: "END 02", className: "left-[44%] bottom-9" },
    { label: "END 03", className: "right-0 bottom-4" },
  ];

  return (
    <div className="relative h-[190px] overflow-hidden rounded-[24px] border border-[rgba(103,232,249,0.18)] bg-[rgba(9,14,28,0.48)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl sm:h-[224px]">
      <div className="absolute left-[12%] top-[16%] h-[42%] w-px bg-gradient-to-b from-[#67e8f9] to-[#22d3ee] shadow-[0_0_18px_rgba(103,232,249,0.42)]" />
      <div className="absolute left-[12%] top-[16%] h-px w-[23%] bg-gradient-to-r from-[#67e8f9] to-[#38bdf8] shadow-[0_0_18px_rgba(56,189,248,0.36)]" />
      <div className="absolute left-[12%] top-[38%] h-px w-[48%] bg-gradient-to-r from-[#67e8f9] via-[#38bdf8] to-[#f472b6] shadow-[0_0_20px_rgba(56,189,248,0.3)]" />
      <div className="absolute left-[12%] top-[58%] h-px w-[72%] bg-gradient-to-r from-[#38bdf8] via-[#c084fc] to-[#f472b6] shadow-[0_0_22px_rgba(244,114,182,0.28)]" />
      <div className="absolute left-[34%] top-[38%] h-[34%] w-px bg-gradient-to-b from-[#38bdf8] to-[#f472b6] shadow-[0_0_18px_rgba(244,114,182,0.28)]" />
      <div className="absolute left-[62%] top-[20%] h-[44%] w-px bg-gradient-to-b from-[#38bdf8] to-[#f472b6] shadow-[0_0_18px_rgba(244,114,182,0.28)]" />
      <span className="absolute left-[10%] top-[12%] h-2.5 w-2.5 rounded-full bg-[#67e8f9] shadow-[0_0_0_6px_rgba(103,232,249,0.14),0_0_22px_rgba(103,232,249,0.5)]" />
      {choiceNodes.map((node) => (
        <span
          key={node.label}
          className={`absolute inline-flex min-h-[34px] items-center rounded-full border border-[rgba(103,232,249,0.22)] bg-[rgba(56,189,248,0.12)] px-3 py-1 text-[11px] font-semibold tracking-[0.04em] text-[#c8f8ff] shadow-[0_0_0_1px_rgba(56,189,248,0.08),0_0_28px_rgba(56,189,248,0.16)] backdrop-blur-xl ${node.className}`}
        >
          {node.label}
        </span>
      ))}
      {endNodes.map((node) => (
        <span
          key={node.label}
          className={`absolute inline-flex min-h-[32px] items-center rounded-full border border-[rgba(244,114,182,0.28)] bg-[rgba(236,72,153,0.14)] px-3 py-1 text-[11px] font-black tracking-[0.12em] text-[#ffd2e8] shadow-[0_0_0_1px_rgba(236,72,153,0.08),0_0_26px_rgba(236,72,153,0.14)] backdrop-blur-xl ${node.className}`}
        >
          {node.label}
        </span>
      ))}
      <div className="absolute inset-x-4 top-0 flex items-center justify-between pt-1">
        <p className={storefrontHomeSectionEyebrowClass}>Neon route</p>
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[rgba(255,255,255,0.46)]">
          Choice map
        </span>
      </div>
    </div>
  );
}

export default function InteractiveStoriesBanner({ items = [] }) {
  if (!items.length) {
    return null;
  }

  const featured = items[0];
  const relatedTitles = items.slice(1, 4).map((series) => series?.title).filter(Boolean);

  return (
    <section
      className="relative overflow-hidden rounded-[30px] border border-[rgba(244,114,182,0.20)] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.35)] sm:p-7 xl:min-h-[296px] xl:p-8"
      style={{
        borderRadius: "30px",
        borderColor: "rgba(244,114,182,0.20)",
        boxShadow: "0 24px 90px rgba(0,0,0,0.35)",
      }}
    >
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(236,72,153,0.30),transparent_32%),radial-gradient(circle_at_60%_80%,rgba(56,189,248,0.15),transparent_30%),linear-gradient(135deg,#181028,#101522)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_18%,rgba(124,58,237,0.26),transparent_28%),radial-gradient(circle_at_86%_14%,rgba(236,72,153,0.22),transparent_22%),radial-gradient(circle_at_72%_82%,rgba(56,189,248,0.12),transparent_22%)] opacity-90" />
      </div>

      <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.98fr)] xl:items-center">
        <div className="space-y-5">
          <div className="space-y-3">
            <p className={storefrontHomeSectionEyebrowClass}>Interactive Stories</p>
            <h2 className="max-w-[12ch] font-display text-[2.25rem] font-black leading-[0.94] tracking-[-0.06em] text-[color:var(--gush-home-text-primary)] sm:text-[3rem]">
              Your Choice Changes the Story
            </h2>
            <p className="max-w-[34rem] text-[15px] leading-[1.72] text-[color:var(--gush-home-text-secondary)]">
              Make decisions, unlock new scenes, paths, and endings. You&apos;re in control.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <GradientButton
              href="/interactive"
              icon={ArrowRight}
              className="px-6"
            >
              Explore Stories
            </GradientButton>
            <IconButton
              href="/search?format=interactive"
              icon={Route}
              className="min-h-[48px] px-5 text-white"
            >
              More Stories
            </IconButton>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <span className={`${storefrontHomeGlassCardClass} inline-flex min-h-[34px] items-center rounded-full px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--gush-home-text-secondary)]`}>
              {featured?.title || "Interactive pick"}
            </span>
            {relatedTitles.map((title) => (
              <span
                key={title}
                className="inline-flex min-h-[34px] items-center rounded-full border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgba(255,255,255,0.68)] backdrop-blur-xl"
              >
                {title}
              </span>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              "Trust the wrong person, and a hidden route opens.",
              "Every branch pushes you toward a different ending.",
            ].map((copy) => (
              <div
                key={copy}
                className={`${storefrontHomeGlassCardClass} rounded-[20px] p-4`}
              >
                <Sparkles className="size-4 text-[var(--gush-warning)]" />
                <p className="mt-3 text-sm leading-6 text-[color:var(--gush-home-text-secondary)]">
                  {copy}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div
            className={`${storefrontHomeGlassCardClass} rounded-[24px] p-4 sm:p-5`}
            onClick={() =>
              trackEvent("story_click", {
                seriesId: featured?.id,
                sourceSection: "home_interactive_featured",
                position: 1,
              })
            }
          >
            <ChoiceMap />
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            {[
              { label: "Scene", value: "New branch unlocked" },
              { label: "Risk", value: "One choice shifts the ending" },
              { label: "Mode", value: "Play it your way" },
            ].map((item) => (
              <div
                key={item.label}
                className={`${storefrontHomeGlassCardClass} rounded-[18px] p-4`}
              >
                <p className={storefrontHomeSectionEyebrowClass}>{item.label}</p>
                <p className="mt-2 text-sm font-semibold text-[color:var(--gush-home-text-primary)]">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
