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
        promotion.description || "Double bonus POINTS for your first purchase.",
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
    description: "Limited-time bonus POINTS available.",
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
  const badge = promotion?.coupon?.label || offer?.tag || promotion?.type || "Promo";

  return (
    <section className="rounded-3xl border border-neutral-900 bg-gradient-to-br from-neutral-900/70 via-neutral-950 to-neutral-900/70 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Pill>{copy.tag}</Pill>
            <Pill>{badge}</Pill>
          </div>
          <h2 className="mt-3 text-2xl font-semibold">{copy.title}</h2>
          <p className="mt-2 text-sm text-neutral-400">{copy.description}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-neutral-400">Ends in</p>
          <p className="text-lg font-semibold">{formatted || "--:--:--"}</p>
        </div>
      </div>
    </section>
  );
}
