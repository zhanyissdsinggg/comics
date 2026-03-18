"use client";

import { useMemo } from "react";
import useCountdown from "../../hooks/useCountdown";
import Pill from "../common/Pill";

function getPromoCopy(promotion, offer) {
  if (promotion?.type === "FIRST_PURCHASE") {
    return {
      tag: "First top up",
      title: promotion.title || "Starter Double Bonus",
      description:
        promotion.description || "Double bonus points for your first purchase.",
    };
  }
  if (promotion?.type === "RETURNING") {
    return {
      tag: "Welcome Back",
      title: promotion.title || "Returning Reward",
      description:
        promotion.description || "Claim your welcome back bonus and keep reading.",
    };
  }
  if (promotion?.type === "HOLIDAY") {
    return {
      tag: "Limited",
      title: promotion.title || "Holiday Deal",
      description:
        promotion.description || "Limited-time discount for your next unlock.",
    };
  }
  return {
    tag: "Promo",
    title: offer?.title || "Starter Double Bonus",
    description: "Limited-time bonus points available.",
  };
}

export default function PromoBanner({ offer, promotion }) {
  const endAt = useMemo(() => {
    if (promotion?.endAt) {
      const parsed = Date.parse(promotion.endAt);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
    return Date.now() + 2 * 60 * 60 * 1000;
  }, [promotion?.endAt]);
  const { formatted } = useCountdown(endAt);
  const copy = getPromoCopy(promotion, offer);
  const badge = promotion?.coupon?.label || offer?.tag || copy.tag;

  return (
    <section className="rounded-[30px] border border-black/6 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(242,246,255,0.98))] p-6 shadow-[0_20px_48px_rgba(15,23,42,0.07)]">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2">
            <Pill appearance="light" tone="accent">{copy.tag}</Pill>
            <Pill appearance="light">{badge}</Pill>
          </div>
          <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-slate-950">
            {copy.title}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">{copy.description}</p>
        </div>
        <div className="rounded-[24px] border border-black/6 bg-white/84 px-5 py-4 text-left shadow-[0_12px_28px_rgba(15,23,42,0.04)] lg:min-w-[220px]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
            Ends in
          </p>
          <p className="mt-3 font-display text-3xl font-semibold tracking-tight text-slate-950">
            {formatted || "--:--:--"}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Best if you already know you are topping up today.
          </p>
        </div>
      </div>
    </section>
  );
}
