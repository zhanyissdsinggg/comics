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
}) {
  if (!Array.isArray(cards) || cards.length === 0) {
    return null;
  }

  return (
    <div className={cn("grid gap-4", columnsClassName, className)}>
      {cards.map((card) => (
        <Card
          key={card.id}
          className={cn(
            "h-full rounded-[26px] border py-0 shadow-none transition-transform duration-300 hover:-translate-y-1",
            card.accentClass || "border-white/10 bg-white/[0.03]",
          )}
        >
          <CardContent className="flex h-full flex-col p-5">
            <Badge
              variant="outline"
              className="w-fit rounded-full border-white/10 bg-black/20 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-current"
            >
              {card.eyebrow}
            </Badge>
            <h3 className="mt-4 font-display text-xl font-semibold leading-tight text-white">
              {card.title}
            </h3>
            <p className="mt-3 text-sm leading-7 text-neutral-200/90">{card.description}</p>
            <Button
              type="button"
              variant="ghost"
              onClick={card.onClick}
              className="mt-auto h-10 justify-start gap-2 px-0 text-sm font-semibold text-white hover:bg-transparent hover:text-emerald-200"
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
