"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Zap, Gift, Clock, Star, Sparkles } from "lucide-react";
import SiteHeader from "../layout/SiteHeader";
import { SUBSCRIPTION_OFFERS } from "../../lib/offers/catalog";
import { getPlanCatalog, setPlanCatalog } from "../../lib/subscriptions";
import { apiGet } from "../../lib/apiClient";
import { useWalletStore } from "../../store/useWalletStore";
import { loadPersistedPaymentAttribution, mergePaymentAttribution, persistPaymentAttribution, readPaymentAttributionFromSearchParams } from "../../lib/paymentAttribution";
import { trackEvent } from "../../lib/trackEvent";

export default function SubscribePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { subscription, subscribe, cancelSubscription } = useWalletStore();
  const [workingId, setWorkingId] = useState("");
  const [planCatalog, setPlanCatalogState] = useState(getPlanCatalog());
  const isActive = Boolean(subscription?.active);
  const baseUnlockPrice = 5;
  const returnTo = searchParams.get("returnTo") || "/account";
  const attribution = useMemo(
    () =>
      mergePaymentAttribution(loadPersistedPaymentAttribution(), readPaymentAttributionFromSearchParams(searchParams), {
        entryPoint: readPaymentAttributionFromSearchParams(searchParams)?.entryPoint || "SUBSCRIBE_PAGE",
        returnTo,
      }),
    [searchParams, returnTo]
  );

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

  useEffect(() => {
    if (attribution) {
      persistPaymentAttribution(attribution);
    }
  }, [attribution]);

  const handleSubscribe = async (planId) => {
    setWorkingId(planId);
    trackEvent("subscribe_cta_click", {
      planId,
      entryPoint: attribution?.entryPoint,
      promotionId: attribution?.promotionId,
      offerId: attribution?.offerId || `subscribe_${planId}`,
    });
    const response = await subscribe(planId, {
      attribution: {
        ...attribution,
        offerId: attribution?.offerId || `subscribe_${planId}`,
      },
    });
    setWorkingId("");
    if (response.ok) {
      router.replace(returnTo);
    }
  };

  const handleCancel = async () => {
    setWorkingId("cancel");
    await cancelSubscription();
    setWorkingId("");
  };

  // 老王注释：获取方案的图标
  const getPlanIcon = (planId) => {
    if (planId.includes("basic")) return <Zap className="h-6 w-6" />;
    if (planId.includes("premium")) return <Star className="h-6 w-6" />;
    if (planId.includes("ultimate")) return <Sparkles className="h-6 w-6" />;
    return <Gift className="h-6 w-6" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 text-neutral-100">
      <SiteHeader />

      {/* 老王设计：Hero区域 - 渐变背景 + 玻璃态效果 */}
      <div className="relative overflow-hidden">
        {/* 老王注释：背景装饰渐变球 */}
        <div className="absolute left-1/4 top-0 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute right-1/4 top-20 h-96 w-96 rounded-full bg-purple-500/10 blur-3xl" />

        <main className="relative mx-auto max-w-7xl px-4 py-8 sm:py-16 sm:px-6 lg:px-8">
          {/* 老王设计：标题区域 - 移动端优化 */}
          <div className="text-center space-y-3 sm:space-y-4 mb-8 sm:mb-16">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm text-emerald-300 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Unlock Premium Features</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight lg:text-6xl bg-gradient-to-r from-white via-neutral-200 to-neutral-400 bg-clip-text text-transparent">
              Choose Your Plan
            </h1>
            <p className="mx-auto max-w-2xl text-sm sm:text-lg text-neutral-400 px-4">
              Get exclusive perks, daily free episodes, and massive discounts on unlocks.
            </p>
          </div>

          {/* 老王设计：定价卡片网格 - 移动端优化 */}
          <div className="grid gap-4 sm:gap-8 lg:grid-cols-3 mb-8 sm:mb-16">
            {SUBSCRIPTION_OFFERS.map((plan) => {
              const key = plan.id.replace("subscribe_", "");
              const perks = planCatalog[key];
              const isBest = bestPlanId === key;
              const isCurrent = isActive && subscription?.planId === key;

              return (
                <div
                  key={plan.id}
                  className={`relative group transition-all duration-300 ${
                    isBest ? "lg:-mt-4 lg:scale-105" : ""
                  }`}
                >
                  {/* 老王注释：Best Value标签 - 移动端优化 */}
                  {isBest && (
                    <div className="absolute -top-3 sm:-top-4 left-1/2 -translate-x-1/2 z-10">
                      <div className="flex items-center gap-1.5 sm:gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-1 sm:px-4 sm:py-1.5 text-[10px] sm:text-xs font-semibold text-white shadow-lg shadow-emerald-500/30">
                        <Star className="h-3 w-3 sm:h-3.5 sm:w-3.5 fill-white" />
                        <span>BEST VALUE</span>
                      </div>
                    </div>
                  )}

                  {/* 老王设计：玻璃态卡片 - 移动端优化 */}
                  <div
                    className={`relative h-full rounded-2xl sm:rounded-3xl border backdrop-blur-xl transition-all duration-300 ${
                      isBest
                        ? "border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-neutral-900/80 to-neutral-900/80 shadow-2xl shadow-emerald-500/20"
                        : "border-neutral-800/50 bg-neutral-900/60 hover:border-neutral-700/50 hover:bg-neutral-900/80"
                    } ${isCurrent ? "ring-2 ring-emerald-500/50" : ""}`}
                  >
                    <div className="p-5 sm:p-8 space-y-4 sm:space-y-6">
                      {/* 老王注释：方案头部 - 移动端优化 */}
                      <div className="space-y-3 sm:space-y-4">
                        <div className="flex items-center justify-between">
                          <div
                            className={`flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl sm:rounded-2xl ${
                              isBest
                                ? "bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30"
                                : "bg-neutral-800 text-neutral-400"
                            }`}
                          >
                            {getPlanIcon(plan.id)}
                          </div>
                          {isCurrent && (
                            <div className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs font-semibold text-emerald-300">
                              Current Plan
                            </div>
                          )}
                        </div>

                        <div>
                          <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-neutral-500">
                            {plan.tag}
                          </p>
                          <h2 className="mt-1 sm:mt-2 text-xl sm:text-2xl font-bold text-white">
                            {plan.title}
                          </h2>
                        </div>

                        {/* 老王注释：价格显示 - 移动端优化 */}
                        <div className="flex items-baseline gap-1.5 sm:gap-2">
                          <span className="text-3xl sm:text-4xl font-bold text-white">
                            {(() => {
                              if (!perks || perks.price === undefined) {
                                return plan.price;
                              }
                              const currency = perks.currency || "USD";
                              return `${currency} ${Number(perks.price).toFixed(2)}`;
                            })()}
                          </span>
                          <span className="text-sm sm:text-base text-neutral-400">/month</span>
                        </div>

                        {/* 老王注释：折扣标签 - 移动端优化 */}
                        {perks?.discountPct && (
                          <div className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-emerald-500/20 px-2.5 py-1 sm:px-3 sm:py-1 text-xs sm:text-sm font-semibold text-emerald-300">
                            <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            <span>Save {perks.discountPct}%</span>
                          </div>
                        )}
                      </div>

                      {/* 老王设计：特性列表 - 移动端简化 */}
                      <div className="space-y-2 sm:space-y-3 border-t border-neutral-800 pt-4 sm:pt-6">
                        {perks && (
                          <>
                            <div className="flex items-center gap-2.5 sm:gap-3 text-xs sm:text-sm">
                              <div className="flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-emerald-500/20 flex-shrink-0">
                                <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-emerald-400" />
                              </div>
                              <span className="text-neutral-300">
                                <span className="font-semibold text-white">{perks.dailyFreeUnlocks}</span> daily free
                              </span>
                            </div>
                            <div className="flex items-center gap-2.5 sm:gap-3 text-xs sm:text-sm">
                              <div className="flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-emerald-500/20 flex-shrink-0">
                                <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-emerald-400" />
                              </div>
                              <span className="text-neutral-300">
                                <span className="font-semibold text-white">{Math.round(perks.ttfMultiplier * 100)}%</span> faster TTF
                              </span>
                            </div>
                            <div className="flex items-center gap-2.5 sm:gap-3 text-xs sm:text-sm">
                              <div className="flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-emerald-500/20 flex-shrink-0">
                                <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-emerald-400" />
                              </div>
                              <span className="text-neutral-300">
                                <span className="font-semibold text-white">{perks.voucherPts}</span> bonus points
                              </span>
                            </div>
                            {perks.discountPct && (
                              <div className="flex items-center gap-2.5 sm:gap-3 text-xs sm:text-sm">
                                <div className="flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-emerald-500/20 flex-shrink-0">
                                  <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-emerald-400" />
                                </div>
                                <span className="text-neutral-300">
                                  Save ~{Math.round((perks.discountPct / 100) * baseUnlockPrice * 10)} pts/10 unlocks
                                </span>
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {/* 老王设计：订阅按钮 - 移动端优化 */}
                      <button
                        type="button"
                        onClick={() => handleSubscribe(key)}
                        disabled={workingId === key || isCurrent}
                        className={`w-full rounded-xl sm:rounded-2xl px-5 py-3 sm:px-6 sm:py-4 text-xs sm:text-sm font-semibold transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-60 ${
                          isBest
                            ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98]"
                            : "bg-white text-neutral-900 hover:bg-neutral-100 hover:scale-[1.02] active:scale-[0.98]"
                        }`}
                      >
                        {isCurrent ? "Current Plan" : workingId === key ? "Processing..." : "Subscribe Now"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 老王设计：功能对比表格 - 移动端隐藏 */}
          <div className="hidden sm:block rounded-3xl border border-neutral-800/50 bg-neutral-900/60 backdrop-blur-xl p-8 mb-8">
            <h3 className="mb-6 text-xl font-bold text-white">Compare Plans</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-800">
                    <th className="pb-4 text-left font-semibold text-neutral-400">Feature</th>
                    {SUBSCRIPTION_OFFERS.map((plan) => (
                      <th key={plan.id} className="pb-4 text-center font-semibold text-white">
                        {plan.title}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  <tr>
                    <td className="py-4 text-neutral-300">Daily Free Episodes</td>
                    {SUBSCRIPTION_OFFERS.map((plan) => {
                      const key = plan.id.replace("subscribe_", "");
                      const perks = planCatalog[key];
                      return (
                        <td key={plan.id} className="py-4 text-center text-white font-semibold">
                          {perks?.dailyFreeUnlocks ?? "-"}
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td className="py-4 text-neutral-300">TTF Speed Boost</td>
                    {SUBSCRIPTION_OFFERS.map((plan) => {
                      const key = plan.id.replace("subscribe_", "");
                      const perks = planCatalog[key];
                      return (
                        <td key={plan.id} className="py-4 text-center text-white font-semibold">
                          {perks?.ttfMultiplier ? `${Math.round(perks.ttfMultiplier * 100)}%` : "-"}
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td className="py-4 text-neutral-300">Monthly Bonus Points</td>
                    {SUBSCRIPTION_OFFERS.map((plan) => {
                      const key = plan.id.replace("subscribe_", "");
                      const perks = planCatalog[key];
                      return (
                        <td key={plan.id} className="py-4 text-center text-white font-semibold">
                          {perks?.voucherPts ?? "-"}
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td className="py-4 text-neutral-300">Unlock Discount</td>
                    {SUBSCRIPTION_OFFERS.map((plan) => {
                      const key = plan.id.replace("subscribe_", "");
                      const perks = planCatalog[key];
                      return (
                        <td key={plan.id} className="py-4 text-center">
                          {perks?.discountPct ? (
                            <span className="text-emerald-400 font-semibold">{perks.discountPct}%</span>
                          ) : (
                            <span className="text-neutral-500">-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 老王注释：当前订阅状态 - 移动端优化 */}
          {isActive && (
            <div className="mt-6 sm:mt-8 rounded-2xl sm:rounded-3xl border border-emerald-500/30 bg-emerald-500/10 backdrop-blur-xl p-4 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
                <div className="space-y-0.5 sm:space-y-1">
                  <p className="text-xs sm:text-sm font-semibold text-emerald-300">Active Subscription</p>
                  <p className="text-[10px] sm:text-xs text-neutral-400">
                    Plan: {subscription?.planId} • Renews on {subscription?.renewAt}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={workingId === "cancel"}
                  className="rounded-xl sm:rounded-2xl border border-neutral-700 bg-neutral-900/80 px-4 py-2 sm:px-6 sm:py-3 text-xs sm:text-sm font-semibold text-neutral-300 transition-all hover:bg-neutral-800 hover:text-white disabled:opacity-60"
                >
                  {workingId === "cancel" ? "Canceling..." : "Cancel Subscription"}
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
