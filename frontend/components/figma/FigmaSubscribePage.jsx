"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Crown,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import FigmaChrome from "./FigmaChrome";
import { FigmaSiteProvider, useFigmaSite } from "./FigmaSiteContext";
import { cn } from "./figma-utils";

const PLAN_PREVIEWS = [
  {
    id: "basic",
    name: "Basic",
    badge: "Entry",
    summary: "For casual readers who want lighter recurring value without overcommitting.",
    perks: ["Daily reads", "Faster unlock pacing", "Clean monthly billing"],
  },
  {
    id: "pro",
    name: "Pro",
    badge: "Popular",
    summary: "A denser tier for readers who bounce between multiple active series every week.",
    perks: ["Higher daily allowance", "Better chapter savings", "Monthly points bonus"],
  },
  {
    id: "vip",
    name: "VIP",
    badge: "Top Tier",
    summary: "The heavy-reader lane with the strongest value and the least friction.",
    perks: ["Largest recurring bundle", "Best unlock savings", "Priority support"],
  },
];

function SubscribeContent() {
  const { palette, isAdultMode } = useFigmaSite();

  return (
    <div className={cn("min-h-screen pb-20", palette.rootBg)}>
      <FigmaChrome>
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <section className="mb-6 grid gap-3 lg:grid-cols-[minmax(0,1.45fr)_360px] lg:mb-8 lg:gap-6">
            <div
              className={cn(
                "relative overflow-hidden rounded-[32px] border p-4 shadow-2xl md:p-8",
                palette.surface,
                palette.border,
              )}
            >
              <div
                className={cn(
                  "pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full blur-[90px] opacity-25",
                  isAdultMode ? "bg-red-500" : "bg-cyan-400",
                )}
              />
              <div className="relative z-10 max-w-3xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300 md:px-4 md:py-2 md:text-xs">
                  <Sparkles className="h-4 w-4" />
                  Membership Preview
                </div>
                <h1 className="max-w-xl text-[1.9rem] font-black tracking-tight text-white md:max-w-3xl md:text-5xl">
                  Membership is coming soon.
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-300 md:mt-4 md:text-base md:leading-7">
                  The subscription layer is still being staged, but the structure is ready:
                  recurring plans, chapter savings, and a cleaner lane for heavy readers.
                </p>

                <div className="mt-4 flex flex-col gap-2.5 sm:flex-row md:mt-8 md:gap-3">
                  <Link
                    href="/store"
                    className={cn(
                      "inline-flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-black uppercase tracking-[0.18em] text-white transition-transform active:scale-[0.98] sm:w-auto md:py-3.5",
                      palette.primaryBg,
                    )}
                  >
                    Buy points instead
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10 sm:w-auto md:py-3.5"
                  >
                    Browse free stories
                  </Link>
                </div>

                <div className="mt-4 grid gap-2.5 sm:grid-cols-3 md:mt-5 md:gap-3">
                  <div className="rounded-[22px] border border-white/10 bg-black/20 p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                      Status
                    </p>
                    <p className="mt-2 text-sm font-bold text-white">Preview only</p>
                  </div>
                  <div className="rounded-[22px] border border-white/10 bg-black/20 p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                      Billing
                    </p>
                    <p className="mt-2 text-sm font-bold text-white">Not live yet</p>
                  </div>
                  <div className="rounded-[22px] border border-white/10 bg-black/20 p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                      Access
                    </p>
                    <p className="mt-2 text-sm font-bold text-white">Free chapters still open</p>
                  </div>
                </div>
              </div>
            </div>

            <div
              className={cn(
                "overflow-hidden rounded-[32px] border p-4 shadow-2xl md:p-6",
                palette.surface,
                palette.border,
              )}
            >
              <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">
                Launch Status
              </p>
              <div className="mt-3 flex items-center gap-3 md:mt-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300 md:h-12 md:w-12">
                  <Clock3 className="h-5 w-5 md:h-6 md:w-6" />
                </div>
                <div>
                  <div className="text-2xl font-black tracking-tight text-white md:text-3xl">
                    Pending
                  </div>
                  <div className="text-sm text-gray-400">
                    Plans are visible, checkout is not.
                  </div>
                </div>
              </div>

              <div className="mt-5 space-y-2.5 rounded-[26px] border border-white/10 bg-black/20 p-3 md:mt-6 md:space-y-3 md:p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Storefront stays active</p>
                    <p className="mt-1 text-sm leading-5 text-gray-400">
                      Point packs and free reading remain the live purchase path for now.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Plan architecture is ready</p>
                    <p className="mt-1 text-sm leading-5 text-gray-400">
                      Tiers, positioning, and savings messaging are staged for launch.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-3 rounded-[26px] border border-white/10 bg-white/5 p-3 md:mt-4 md:p-3.5">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                  Fallback path
                </p>
                <p className="mt-2 text-sm leading-5 text-gray-400">
                  Until recurring billing goes live, the storefront keeps the same reader journey moving through points and free chapters.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-8 md:mb-12">
            <div className="mb-4 md:mb-6">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">
                Planned Tiers
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-white md:text-3xl">
                Three membership lanes, one cleaner reading loop.
              </h2>
            </div>

            <div className="grid gap-3 lg:grid-cols-3 lg:gap-5">
              {PLAN_PREVIEWS.map((plan, index) => (
                <div
                  key={plan.id}
                  className={cn(
                    "flex h-full flex-col overflow-hidden rounded-[28px] border p-4 shadow-xl md:p-6",
                    palette.surface,
                    palette.border,
                    index === 1 ? "border-cyan-400/30 bg-cyan-400/[0.05]" : "",
                  )}
                >
                  <div className="mb-3 flex items-start justify-between gap-3 md:mb-4">
                    <div>
                      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 text-white md:h-11 md:w-11">
                        {index === 0 ? (
                          <Zap className="h-5 w-5 text-yellow-400" />
                        ) : index === 1 ? (
                          <Sparkles className="h-5 w-5 text-cyan-300" />
                        ) : (
                          <Crown className="h-5 w-5 text-fuchsia-300" />
                        )}
                      </div>
                      <h3 className="text-xl font-black text-white md:text-2xl">
                        {plan.name}
                      </h3>
                      <p className="mt-1 text-sm text-gray-400">{plan.summary}</p>
                    </div>
                    <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-gray-200">
                      {plan.badge}
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {plan.perks.map((perk) => (
                      <div key={`${plan.id}-${perk}`} className="flex items-center gap-3 text-sm text-gray-300">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        {perk}
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 rounded-[22px] border border-white/10 bg-black/20 p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                      Launch Note
                    </p>
                    <p className="mt-2 text-sm leading-5 text-gray-400">
                      This tier is staged as a preview card until recurring billing opens.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section
            className={cn(
              "grid gap-3 rounded-[28px] border p-4 shadow-xl md:grid-cols-3 md:gap-4 md:p-6",
              palette.surface,
              palette.border,
            )}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 md:h-12 md:w-12">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Safe rollout</h3>
                <p className="mt-2 text-sm leading-6 text-gray-400">
                  Membership stays hidden behind preview mode until checkout and entitlement flows are ready.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-400 md:h-12 md:w-12">
                <Zap className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Points still lead</h3>
                <p className="mt-2 text-sm leading-6 text-gray-400">
                  The current monetization path remains the wallet, so readers do not hit a dead-end.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-fuchsia-500/10 text-fuchsia-400 md:h-12 md:w-12">
                <Crown className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Figma-aligned shell</h3>
                <p className="mt-2 text-sm leading-6 text-gray-400">
                  This preview page now matches the same visual system used across the updated storefront screens.
                </p>
              </div>
            </div>
          </section>
        </div>
      </FigmaChrome>
    </div>
  );
}

export default function FigmaSubscribePage() {
  return (
    <FigmaSiteProvider>
      <SubscribeContent />
    </FigmaSiteProvider>
  );
}
