"use client";

import { ArrowRight, Route } from "lucide-react";
import {
  storefrontHomeGlassCardClass,
  storefrontHomeSectionEyebrowClass,
} from "../../common/StorefrontPagePrimitives";
import { INTERACTIVE_STORIES_HOME_ARTWORK } from "../../../lib/homeArtwork";
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
    <div className="relative h-[198px] overflow-hidden rounded-[24px] border border-[rgba(103,232,249,0.20)] bg-[linear-gradient(180deg,rgba(9,14,28,0.72)_0%,rgba(7,11,22,0.52)_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_18px_48px_rgba(0,0,0,0.22)] backdrop-blur-xl sm:h-[236px]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_18%,rgba(56,189,248,0.18),transparent_24%),radial-gradient(circle_at_86%_18%,rgba(236,72,153,0.18),transparent_24%),radial-gradient(circle_at_66%_74%,rgba(192,132,252,0.12),transparent_26%)]" />
      <div className="absolute left-[12%] top-[16%] h-[42%] w-[2px] bg-gradient-to-b from-[#67e8f9] to-[#22d3ee] shadow-[0_0_20px_rgba(103,232,249,0.5)]" />
      <div className="absolute left-[12%] top-[16%] h-[2px] w-[23%] bg-gradient-to-r from-[#67e8f9] to-[#38bdf8] shadow-[0_0_20px_rgba(56,189,248,0.4)]" />
      <div className="absolute left-[12%] top-[38%] h-[2px] w-[48%] bg-gradient-to-r from-[#67e8f9] via-[#38bdf8] to-[#f472b6] shadow-[0_0_22px_rgba(56,189,248,0.34)]" />
      <div className="absolute left-[12%] top-[58%] h-[2px] w-[72%] bg-gradient-to-r from-[#38bdf8] via-[#c084fc] to-[#f472b6] shadow-[0_0_24px_rgba(244,114,182,0.32)]" />
      <div className="absolute left-[34%] top-[38%] h-[34%] w-[2px] bg-gradient-to-b from-[#38bdf8] to-[#f472b6] shadow-[0_0_20px_rgba(244,114,182,0.32)]" />
      <div className="absolute left-[62%] top-[20%] h-[44%] w-[2px] bg-gradient-to-b from-[#38bdf8] to-[#f472b6] shadow-[0_0_20px_rgba(244,114,182,0.32)]" />
      <span className="absolute left-[10%] top-[12%] h-2.5 w-2.5 rounded-full bg-[#67e8f9] shadow-[0_0_0_7px_rgba(103,232,249,0.16),0_0_26px_rgba(103,232,249,0.56)]" />
      <span className="absolute left-[33%] top-[36%] h-2.5 w-2.5 rounded-full bg-[#38bdf8] shadow-[0_0_0_7px_rgba(56,189,248,0.14),0_0_26px_rgba(56,189,248,0.48)]" />
      <span className="absolute left-[61%] top-[18%] h-2.5 w-2.5 rounded-full bg-[#c084fc] shadow-[0_0_0_7px_rgba(192,132,252,0.14),0_0_24px_rgba(192,132,252,0.42)]" />
      {choiceNodes.map((node) => (
        <span
          key={node.label}
          className={`absolute inline-flex min-h-[34px] items-center rounded-full border border-[rgba(103,232,249,0.24)] bg-[rgba(56,189,248,0.14)] px-3 py-1 text-[11px] font-semibold tracking-[0.04em] text-[#c8f8ff] shadow-[0_0_0_1px_rgba(56,189,248,0.08),0_0_32px_rgba(56,189,248,0.18)] backdrop-blur-xl ${node.className}`}
        >
          {node.label}
        </span>
      ))}
      {endNodes.map((node) => (
        <span
          key={node.label}
          className={`absolute inline-flex min-h-[32px] items-center rounded-full border border-[rgba(244,114,182,0.30)] bg-[rgba(236,72,153,0.16)] px-3 py-1 text-[11px] font-black tracking-[0.12em] text-[#ffd2e8] shadow-[0_0_0_1px_rgba(236,72,153,0.08),0_0_28px_rgba(236,72,153,0.18)] backdrop-blur-xl ${node.className}`}
        >
          {node.label}
        </span>
      ))}
    </div>
  );
}

export default function InteractiveStoriesBanner({ items = [] }) {
  if (!items.length) {
    return null;
  }

  const featured = items[0];

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
        <img
          src={INTERACTIVE_STORIES_HOME_ARTWORK.src}
          alt=""
          aria-hidden="true"
          role="presentation"
          className="h-full w-full object-cover opacity-[0.86]"
          style={{ objectPosition: INTERACTIVE_STORIES_HOME_ARTWORK.position }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,10,19,0.94)_0%,rgba(7,10,19,0.86)_34%,rgba(7,10,19,0.48)_64%,rgba(7,10,19,0.42)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_18%,rgba(124,58,237,0.24),transparent_28%),radial-gradient(circle_at_86%_14%,rgba(236,72,153,0.16),transparent_22%),radial-gradient(circle_at_72%_82%,rgba(56,189,248,0.14),transparent_22%)] opacity-90" />
      </div>

      <div className="relative grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.98fr)] xl:items-center">
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
              className="min-h-[48px] px-6"
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
        </div>
      </div>
    </section>
  );
}
