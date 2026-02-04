"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SiteHeader from "../layout/SiteHeader";
import { SUBSCRIPTION_OFFERS } from "../../lib/offers/catalog";
import { getPlanCatalog, setPlanCatalog } from "../../lib/subscriptions";
import { apiGet } from "../../lib/apiClient";
import { useWalletStore } from "../../store/useWalletStore";

export default function SubscribePage() {
  const router = useRouter();
  const { subscription, subscribe, cancelSubscription } = useWalletStore();
  const [workingId, setWorkingId] = useState("");
  const [planCatalog, setPlanCatalogState] = useState(getPlanCatalog());
  const isActive = Boolean(subscription?.active);
  const baseUnlockPrice = 5;

  const bestPlanId = (() => {
    const entries = Object.entries(planCatalog || {});
    if (entries.length === 0) {
      return "";
    }
    entries.sort((a, b) => (b[1]?.discountPct || 0) - (a[1]?.discountPct || 0));
    return entries[0]?.[0] || "";
  })();

  useEffect(() => {
    let mounted = true;
    apiGet("/api/billing/plans").then((response) => {
      if (!mounted) {
        return;
      }
      if (response.ok && Array.isArray(response.data?.plans)) {
        const catalog = {};
        response.data.plans.forEach((plan) => {
          if (plan?.id) {
            catalog[plan.id] = plan;
          }
        });
        setPlanCatalog(catalog);
        setPlanCatalogState(catalog);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleSubscribe = async (planId) => {
    setWorkingId(planId);
    await subscribe(planId);
    setWorkingId("");
  };

  const handleCancel = async () => {
    setWorkingId("cancel");
    await cancelSubscription();
    setWorkingId("");
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-10 space-y-8">
        <div>
          <h1 className="text-2xl font-semibold">Subscribe for perks</h1>
          <p className="mt-2 text-sm text-neutral-400">
            Unlock discounts, daily free episodes, and subscriber vouchers.
          </p>
        </div>

        <section className="rounded-2xl border border-neutral-900 bg-neutral-900/40 p-4 text-xs text-neutral-300">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="text-neutral-500">Plan</div>
            <div>Daily free</div>
            <div>TTF speed</div>
            <div>Voucher</div>
            {SUBSCRIPTION_OFFERS.map((plan) => {
              const key = plan.id.replace("subscribe_", "");
              const perks = planCatalog[key];
              return (
                <div key={plan.id} className="contents">
                  <div className="font-semibold text-neutral-100">{plan.title}</div>
                  <div>{perks?.dailyFreeUnlocks ?? "-"}</div>
                  <div>{perks?.ttfMultiplier ? `${Math.round(perks.ttfMultiplier * 100)}%` : "-"}</div>
                  <div>{perks?.voucherPts ? `${perks.voucherPts} POINTS` : "-"}</div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-3">
          {SUBSCRIPTION_OFFERS.map((plan) => (
            <div
              key={plan.id}
              className="rounded-3xl border border-neutral-900 bg-neutral-900/50 p-6 space-y-4"
            >
              {(() => {
                const key = plan.id.replace("subscribe_", "");
                const perks = planCatalog[key];
                return perks ? (
                  <div className="text-xs text-neutral-400 space-y-1">
                    <div>Daily free: {perks.dailyFreeUnlocks}</div>
                    <div>TTF speed: {Math.round(perks.ttfMultiplier * 100)}%</div>
                    <div>Voucher: {perks.voucherPts} POINTS</div>
                  </div>
                ) : null;
              })()}
              <div>
                <p className="text-xs text-neutral-500 uppercase">{plan.tag}</p>
                <h2 className="text-xl font-semibold">{plan.title}</h2>
                <p className="text-sm text-neutral-400">
                  {(() => {
                    const key = plan.id.replace("subscribe_", "");
                    const perks = planCatalog[key];
                    if (!perks || perks.price === undefined) {
                      return plan.price;
                    }
                    const currency = perks.currency || "USD";
                    return `${currency} ${Number(perks.price).toFixed(2)}/mo`;
                  })()}
                </p>
                {(() => {
                  const key = plan.id.replace("subscribe_", "");
                  const perks = planCatalog[key];
                  if (!perks?.discountPct) {
                    return null;
                  }
                  return (
                    <p className="mt-2 text-xs text-emerald-300">
                      Save {perks.discountPct}% on unlocks
                    </p>
                  );
                })()}
                {(() => {
                  const key = plan.id.replace("subscribe_", "");
                  const perks = planCatalog[key];
                  if (!perks?.discountPct) {
                    return null;
                  }
                  const saved = Math.round((perks.discountPct / 100) * baseUnlockPrice * 10);
                  return (
                    <p className="mt-2 text-[11px] text-neutral-400">
                      Example: save ~{saved} POINTS for 10 unlocks
                    </p>
                  );
                })()}
              </div>
              {(() => {
                const key = plan.id.replace("subscribe_", "");
                if (bestPlanId && bestPlanId === key) {
                  return (
                    <div className="rounded-full border border-emerald-400/60 px-3 py-1 text-[10px] text-emerald-200">
                      Best value
                    </div>
                  );
                }
                return null;
              })()}
              <button
                type="button"
                onClick={() => handleSubscribe(plan.id.replace("subscribe_", ""))}
                disabled={workingId === plan.id.replace("subscribe_", "")}
                className="w-full rounded-full bg-white px-4 py-2 text-sm font-semibold text-neutral-900 disabled:opacity-60"
              >
                {isActive && subscription?.planId === plan.id.replace("subscribe_", "")
                  ? "Current Plan"
                  : "Subscribe for perks"}
              </button>
            </div>
          ))}
        </div>

        {isActive ? (
          <div className="rounded-2xl border border-neutral-900 bg-neutral-900/40 p-4 text-sm text-neutral-300">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>
                Active plan: {subscription?.planId} (renews {subscription?.renewAt})
              </span>
              <button
                type="button"
                onClick={handleCancel}
                disabled={workingId === "cancel"}
                className="rounded-full border border-neutral-700 px-4 py-2 text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
