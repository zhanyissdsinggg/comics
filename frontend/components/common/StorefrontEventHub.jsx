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
  const isLight = appearance === "light" || appearance === "default";

  return (
    <Card
      className={cn(
        "h-full rounded-[28px] py-0 shadow-[0_18px_40px_rgba(15,23,42,0.08)] transition-transform duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_48px_rgba(15,23,42,0.12)]",
        event.accentClass ||
          (isLight
            ? "border-black/10 bg-white hover:bg-[#fcfcfd]"
            : "border-white/10 bg-white/[0.03]"),
      )}
    >
      <CardContent className="flex h-full flex-col p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <Badge
              variant="outline"
              className={cn(
                "rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-current",
                isLight
                  ? "border-black/10 bg-[#f8fafc]"
                  : "border-white/10 bg-black/20",
              )}
            >
              {event.eyebrow}
            </Badge>
            <CardTitle
              className={cn(
                "mt-4 font-display font-black uppercase tracking-[-0.05em]",
                isLight ? "text-black" : "text-white",
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
                  isLight ? "text-black/68" : "text-neutral-200/90",
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
                isLight
                  ? "border-black/10 bg-[linear-gradient(180deg,#ffffff_0%,#fff8eb_100%)] shadow-[0_12px_28px_rgba(15,23,42,0.08)]"
                  : "border-white/10 bg-black/25",
              )}
            >
              <p
                className={cn(
                  "text-[10px] font-semibold uppercase tracking-[0.22em]",
                  isLight ? "text-black/55" : "text-neutral-400",
                )}
              >
                {event.signalLabel || "Signal"}
              </p>
              <p
                className={cn(
                  "mt-1.5 font-display text-xl font-semibold tracking-tight",
                  isLight ? "text-black" : "text-white",
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
            isLight
              ? "text-black/70 hover:text-black"
              : "text-white hover:text-[var(--gush-accent)]",
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
  const isLight = appearance === "light" || appearance === "default";

  return (
    <section className={className}>
      <Card
        className={cn(
          "relative overflow-hidden rounded-[32px] py-0",
          isLight
            ? "border border-black/10 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.1)]"
            : "border border-white/10 bg-[linear-gradient(180deg,rgba(17,24,39,0.92),rgba(10,14,22,0.98))] shadow-[0_26px_90px_rgba(0,0,0,0.28)]",
        )}
      >
        <div
          className={cn(
            "absolute inset-0",
            isLight
              ? "bg-[linear-gradient(180deg,rgba(247,247,249,0.72),transparent_44%)]"
              : "bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_34%),radial-gradient(circle_at_88%_18%,rgba(56,189,248,0.12),transparent_22%)]",
          )}
        />
        <CardHeader className="relative p-5 pb-0 sm:p-6 sm:pb-0">
          <div className="max-w-3xl">
            <p
              className={`text-[11px] font-semibold uppercase tracking-[0.28em] ${isLight ? "text-black/55" : "text-[var(--gush-accent)]/85"}`}
            >
              {eyebrow}
            </p>
            <h2
              className={`mt-3 font-display text-2xl font-black uppercase tracking-[-0.05em] sm:text-3xl ${isLight ? "text-black" : "text-white"}`}
            >
              {title}
            </h2>
            <p
              className={`mt-2 text-sm leading-6 ${isLight ? "text-black/68" : "text-neutral-300"}`}
            >
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
