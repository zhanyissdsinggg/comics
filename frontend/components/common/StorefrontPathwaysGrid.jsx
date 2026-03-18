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
  const isLight = appearance === "light";

  return (
    <div className={cn("grid gap-4", columnsClassName, className)}>
      {cards.map((card) => (
        <Card
          key={card.id}
          className={cn(
            "h-full rounded-[26px] border py-0 shadow-none transition-transform duration-300 hover:-translate-y-0.5",
            card.accentClass ||
              (isLight
                ? "border-black/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(247,249,252,0.98))] hover:border-black/10 hover:bg-white"
                : "border-white/10 bg-white/[0.03]"),
          )}
        >
          <CardContent className="flex h-full flex-col p-5">
            <Badge
              variant="outline"
              className={cn(
                "w-fit rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-current",
                isLight ? "border-black/8 bg-white/82" : "border-white/10 bg-black/20",
              )}
            >
              {card.eyebrow}
            </Badge>
            <h3 className={cn("mt-4 font-display text-xl font-semibold leading-tight", isLight ? "text-slate-950" : "text-white")}>
              {card.title}
            </h3>
            <p className={cn("mt-3 text-sm leading-7", isLight ? "text-slate-600" : "text-neutral-200/90")}>{card.description}</p>
            <Button
              type="button"
              variant="ghost"
              onClick={card.onClick}
              className={cn(
                "mt-auto h-10 justify-start gap-2 px-0 text-sm font-semibold hover:bg-transparent",
                isLight ? "text-slate-900 hover:text-[var(--gush-accent,#2f6bff)]" : "text-white hover:text-emerald-200",
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
