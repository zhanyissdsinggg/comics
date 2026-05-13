"use client";

import { useMemo } from "react";
import useCountdown from "../../hooks/useCountdown";
import Pill from "../common/Pill";
import SurfacePanel from "../common/SurfacePanel";

function getPromoCopy(promotion, offer) {
  if (promotion?.type === "FIRST_PURCHASE") {
    return {
      tag: "First top up",
      title: promotion.title || "Starter Double Bonus",
      description:
        promotion.description || "Extra points on your first top up.",
    };
  }
  if (promotion?.type === "RETURNING") {
    return {
      tag: "Welcome Back",
      title: promotion.title || "Returning Reward",
      description: promotion.description || "Extra points when you come back.",
    };
  }
  if (promotion?.type === "HOLIDAY") {
    return {
      tag: "Limited",
      title: promotion.title || "Holiday Deal",
      description:
        promotion.description || "Limited-time discount on your next chapter.",
    };
  }
  return {
    tag: "Promo",
    title: offer?.title || "Starter Double Bonus",
    description: "Extra points for a limited time.",
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
    <SurfacePanel tone="muted" accent="pink" appearance="dark" className="p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2">
            <Pill appearance="light" tone="accent">
              {copy.tag}
            </Pill>
            <Pill appearance="light">{badge}</Pill>
          </div>
          <h2 className="mt-4 font-display text-3xl font-black uppercase tracking-[-0.05em] text-white">
            {copy.title}
          </h2>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-white/80">
            {copy.description}
          </p>
        </div>
        <div className="rounded-[22px] border-2 border-black bg-[#0b0b0b] px-5 py-4 text-left text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] lg:min-w-[220px]">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/65">
            Ends in
          </p>
          <p className="mt-3 font-display text-3xl font-black uppercase tracking-[-0.04em] text-white">
            {formatted || "--:--:--"}
          </p>
          <p className="mt-2 text-sm font-semibold text-white/75">
            Good if you already know you're topping up today.
          </p>
        </div>
      </div>
    </SurfacePanel>
  );
}
