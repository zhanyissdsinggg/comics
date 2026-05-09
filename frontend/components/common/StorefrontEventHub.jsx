"use client";

import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function EventCard({ event, priority = "secondary" }) {
  return (
    <div
      className={cn(
        "h-full rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(31,25,40,0.96)_0%,rgba(18,14,26,0.98)_100%)] text-white shadow-[0_20px_50px_rgba(8,6,20,0.28)] transition-all duration-200 hover:-translate-y-1 hover:border-white/16 hover:shadow-[0_26px_58px_rgba(8,6,20,0.34)]",
        event.accentClass,
      )}
    >
      <div className="flex h-full flex-col p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <Badge
              variant="outline"
              className="rounded-full border border-white/12 bg-[rgba(255,255,255,0.05)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70"
            >
              {event.eyebrow}
            </Badge>
            <h3
              className={cn(
                "mt-4 font-display font-semibold tracking-[-0.05em] text-white",
                priority === "lead"
                  ? "text-2xl leading-tight sm:text-[2rem]"
                  : "text-xl leading-tight",
              )}
            >
              {event.title}
            </h3>
            {event.description ? (
              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/68">
                {event.description}
              </p>
            ) : null}
          </div>

          {event.signalValue ? (
            <div className="min-w-[120px] rounded-[20px] border border-white/10 bg-[rgba(255,255,255,0.04)] px-3 py-2.5 text-left shadow-[0_14px_34px_rgba(8,6,20,0.18)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/48">
                {event.signalLabel || "Signal"}
              </p>
              <p className="mt-1.5 font-display text-xl font-semibold tracking-tight text-white">
                {event.signalValue}
              </p>
              {event.signalHint ? (
                <p className="mt-1 text-[11px] leading-5 text-white/48">
                  {event.signalHint}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <Button
          type="button"
          variant="ghost"
          onClick={event.onClick}
          className="mt-auto h-10 justify-start gap-2 px-0 text-sm font-semibold tracking-[0.02em] text-white/78 hover:bg-transparent hover:text-[var(--gush-accent)]"
        >
          {event.ctaLabel}
          <ArrowUpRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export default function StorefrontEventHub({
  eyebrow,
  title,
  description,
  events = [],
  className = "",
}) {
  if (!Array.isArray(events) || events.length === 0) {
    return null;
  }

  const [leadEvent, ...secondaryEvents] = events;
  return (
    <section className={className}>
      <div className="relative overflow-hidden rounded-[32px] border border-white/12 bg-[linear-gradient(180deg,rgba(25,21,33,0.98)_0%,rgba(15,13,19,0.99)_100%)] text-white shadow-[0_28px_72px_rgba(8,6,20,0.34)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,79,154,0.14),transparent_28%),radial-gradient(circle_at_88%_18%,rgba(103,232,249,0.1),transparent_22%)]" />
        <div className="relative p-5 pb-0 sm:p-6 sm:pb-0">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/56">
              {eyebrow}
            </p>
            <h2 className="mt-3 font-display text-2xl font-semibold tracking-[-0.05em] text-white sm:text-3xl">
              {title}
            </h2>
            {description ? (
              <p className="mt-2 text-sm leading-6 text-white/66">
                {description}
              </p>
            ) : null}
          </div>
        </div>

        <div className="relative p-5 pt-5 sm:p-6 sm:pt-5">
          <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
            <EventCard event={leadEvent} priority="lead" />
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
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
