"use client";

import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  storefrontBadgeClass,
  storefrontSecondaryButtonClass,
} from "./StorefrontPagePrimitives";

export default function StorefrontPathwaysGrid({
  cards = [],
  columnsClassName = "md:grid-cols-2 xl:grid-cols-4",
  className = "",
}) {
  if (!Array.isArray(cards) || cards.length === 0) {
    return null;
  }

  return (
    <div className={cn("grid gap-4", columnsClassName, className)}>
      {cards.map((card) => (
        <div
          key={card.id}
          className={cn(
            "h-full rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(30,25,38,0.98)_0%,rgba(17,13,24,0.98)_100%)] text-white shadow-[0_20px_50px_rgba(8,6,20,0.28)] transition-all duration-200 hover:-translate-y-1 hover:border-white/16 hover:shadow-[0_26px_58px_rgba(8,6,20,0.34)]",
            card.accentClass,
          )}
        >
          <div className="flex h-full flex-col p-5 sm:p-6">
            <span className={`w-fit ${storefrontBadgeClass} text-white/68`}>
              {card.eyebrow}
            </span>
            <h3 className="mt-5 font-display text-[1.22rem] font-semibold leading-tight tracking-[-0.04em] text-white">
              {card.title}
            </h3>
            {card.description ? (
              <p className="mt-3 max-w-[22rem] text-sm leading-6 text-white/68">
                {card.description}
              </p>
            ) : null}
            <button
              type="button"
              onClick={card.onClick}
              className={`mt-auto h-10 justify-start gap-2 px-0 pt-5 text-sm font-semibold tracking-[0.02em] text-white/78 hover:bg-transparent hover:text-[var(--gush-accent)] ${storefrontSecondaryButtonClass}`}
            >
              {card.cta || card.ctaLabel}
              <ArrowUpRight className="size-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
