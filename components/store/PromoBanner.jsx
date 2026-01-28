"use client";

import { useMemo } from "react";
import useCountdown from "../../hooks/useCountdown";
import Pill from "../common/Pill";

export default function PromoBanner() {
  const readyAt = useMemo(() => Date.now() + 2 * 60 * 60 * 1000, []);
  const { formatted } = useCountdown(readyAt);

  return (
    <section className="rounded-3xl border border-neutral-900 bg-gradient-to-br from-neutral-900/70 via-neutral-950 to-neutral-900/70 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Pill>First Topup</Pill>
            <Pill>2x Bonus</Pill>
          </div>
          <h2 className="mt-3 text-2xl font-semibold">Starter Double Bonus</h2>
          <p className="mt-2 text-sm text-neutral-400">
            Double bonus points for your first purchase.
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-neutral-400">Ends in</p>
          <p className="text-lg font-semibold">{formatted || "--:--:--"}</p>
        </div>
      </div>
    </section>
  );
}
