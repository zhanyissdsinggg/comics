"use client";

import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function EventCard({ event, priority = "secondary", appearance = "default" }) {
  return (
    <Card
      className={cn(
        "h-full rounded-[28px] py-0 transition-transform duration-150 ease-out hover:translate-x-0.5 hover:translate-y-0.5",
        event.accentClass ||
          "border-2 border-black bg-[#080808] text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:bg-[#101010]",
      )}
    >
      <CardContent className="flex h-full flex-col p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <Badge
              variant="outline"
              className={cn(
                "rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-current",
                "border-2 border-black bg-[#FFE500] text-black",
              )}
            >
              {event.eyebrow}
            </Badge>
            <CardTitle
              className={cn(
                "mt-4 font-display font-black uppercase tracking-[-0.05em]",
                "text-white",
                priority === "lead"
                  ? "text-2xl leading-tight sm:text-[2rem]"
                  : "text-xl leading-tight",
              )}
            >
              {event.title}
            </CardTitle>
            {priority === "lead" ? (
              <CardDescription
                className={cn(
                  "mt-3 max-w-3xl text-sm leading-6",
                  "text-neutral-200/90",
                )}
              >
                {event.description}
              </CardDescription>
            ) : null}
          </div>

          {event.signalValue ? (
            <div
              className={cn(
                "min-w-[120px] rounded-[18px] border px-3 py-2.5 text-left shadow-[0_12px_28px_rgba(15,23,42,0.08)]",
                "border-2 border-black bg-[#FFE500] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
              )}
            >
              <p
                className={cn(
                  "text-[10px] font-semibold uppercase tracking-[0.22em]",
                  "text-black/70",
                )}
              >
                {event.signalLabel || "Signal"}
              </p>
              <p
                className={cn(
                  "mt-1.5 font-display text-xl font-semibold tracking-tight",
                  "text-black",
                )}
              >
                {event.signalValue}
              </p>
            </div>
          ) : null}
        </div>

        <Button
          type="button"
          variant="ghost"
          onClick={event.onClick}
          className={cn(
            "mt-auto h-10 justify-start gap-2 px-0 text-sm font-semibold uppercase tracking-[0.12em] hover:bg-transparent",
            "text-white/80 hover:text-[#FFE500]",
          )}
        >
          {event.ctaLabel}
          <ArrowUpRight className="size-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

export default function StorefrontEventHub({
  eyebrow,
  title,
  description,
  events = [],
  className = "",
  appearance = "default",
}) {
  if (!Array.isArray(events) || events.length === 0) {
    return null;
  }

  const [leadEvent, ...secondaryEvents] = events;
  return (
    <section className={className}>
      <Card
        className={cn(
          "relative overflow-hidden rounded-[32px] py-0",
          "border-2 border-black bg-[#050505] text-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]",
        )}
      >
        <div
          className={cn(
            "absolute inset-0",
            "bg-[radial-gradient(circle_at_top_left,rgba(255,229,0,0.18),transparent_34%),radial-gradient(circle_at_88%_18%,rgba(0,229,255,0.12),transparent_22%)]",
          )}
        />
        <CardHeader className="relative p-5 pb-0 sm:p-6 sm:pb-0">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--gush-accent)]/85">
              {eyebrow}
            </p>
            <h2 className="mt-3 font-display text-2xl font-black uppercase tracking-[-0.05em] text-white sm:text-3xl">
              {title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-neutral-300">
              {description}
            </p>
          </div>
        </CardHeader>

        <CardContent className="relative p-5 pt-5 sm:p-6 sm:pt-5">
          <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
            <EventCard
              event={leadEvent}
              priority="lead"
              appearance={appearance}
            />
            {secondaryEvents.length > 0 ? (
              <div
                className={cn(
                  "grid gap-4",
                  secondaryEvents.length > 1
                    ? "md:grid-cols-2 xl:grid-cols-1"
                    : "",
                )}
              >
                {secondaryEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    appearance={appearance}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
