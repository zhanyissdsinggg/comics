"use client";

import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function StorefrontPathwaysGrid({
  cards = [],
  columnsClassName = "md:grid-cols-2 xl:grid-cols-4",
  className = "",
  appearance = "default",
}) {
  if (!Array.isArray(cards) || cards.length === 0) {
    return null;
  }
  const isLight = appearance === "light" || appearance === "default";

  return (
    <div className={cn("grid gap-4", columnsClassName, className)}>
      {cards.map((card) => (
        <Card
          key={card.id}
          className={cn(
            "h-full rounded-[30px] py-0 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_48px_rgba(15,23,42,0.12)]",
            card.accentClass ||
              (isLight
                ? "border-black/10 bg-white hover:bg-[#fcfcfd]"
                : "border-white/10 bg-white/[0.03]"),
          )}
        >
          <CardContent className="flex h-full flex-col p-5 sm:p-6">
            <Badge
              variant="outline"
              className={cn(
                "w-fit rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-current shadow-none",
                isLight
                  ? "border-black/10 bg-[#f8fafc]"
                  : "border-white/10 bg-black/20",
              )}
            >
              {card.eyebrow}
            </Badge>
            <h3
              className={cn(
                "mt-5 font-display text-[1.22rem] font-black uppercase leading-tight tracking-[-0.04em]",
                isLight ? "text-black" : "text-white",
              )}
            >
              {card.title}
            </h3>
            {card.description ? (
              <p
                className={cn(
                  "mt-3 max-w-[22rem] text-sm leading-6",
                  isLight ? "text-black/68" : "text-neutral-200/90",
                )}
              >
                {card.description}
              </p>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              onClick={card.onClick}
              className={cn(
                "mt-auto h-10 justify-start gap-2 px-0 pt-5 text-sm font-semibold uppercase tracking-[0.12em] hover:bg-transparent",
                isLight
                  ? "text-black/70 hover:text-black"
                  : "text-white hover:text-[var(--gush-accent)]",
              )}
            >
              {card.cta || card.ctaLabel}
              <ArrowUpRight className="size-4" />
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
