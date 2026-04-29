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
  appearance = "dark",
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
            "h-full rounded-[26px] py-0 transition-transform duration-150 ease-out hover:translate-x-0.5 hover:translate-y-0.5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]",
            card.accentClass || "border-2 border-black bg-[#0b0b0b] text-white",
          )}
        >
          <CardContent className="flex h-full flex-col p-5 sm:p-6">
            <Badge
              variant="outline"
              className={cn(
                "w-fit rounded-full border-2 border-black px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-current shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
                "bg-[#FFE500] text-black",
              )}
            >
              {card.eyebrow}
            </Badge>
            <h3
              className={cn(
                "mt-5 font-display text-[1.22rem] font-black uppercase leading-tight tracking-[-0.04em]",
                "text-white",
              )}
            >
              {card.title}
            </h3>
            {card.description ? (
              <p
                className={cn(
                  "mt-3 max-w-[22rem] text-sm leading-6",
                  "text-white/75",
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
                "text-white/80 hover:text-white",
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
