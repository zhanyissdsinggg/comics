"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Coins,
  CreditCard,
  Crown,
  Gift,
  LoaderCircle,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useWalletStore } from "../../store/useWalletStore";
import { useAuthStore } from "../../store/useAuthStore";
import FigmaChrome from "./FigmaChrome";
import { FigmaSiteProvider, useFigmaSite } from "./FigmaSiteContext";
import { cn, formatUsd } from "./figma-utils";

function normalizePackages(packages = []) {
  return (Array.isArray(packages) ? packages : [])
    .map((item, index) => {
      const points = Number(item?.points || item?.paidPts || item?.coins || 0);
      const bonus = Number(item?.bonusPts || item?.bonus || 0);
      const price = Number(item?.price || 0);
      const packageId = String(item?.packageId || item?.id || "").trim();
      if (!packageId || !Number.isFinite(price) || price <= 0) {
        return null;
      }

      return {
        id: packageId,
        points: Number.isFinite(points) && points > 0 ? points : 0,
        bonus: Number.isFinite(bonus) && bonus > 0 ? bonus : 0,
        price,
        popular: Boolean(item?.popular || index === 1),
      };
    })
    .filter(Boolean);
}

function normalizePlans(planCatalog = {}) {
  return Object.values(planCatalog || {})
    .map((plan, index) => {
      const id = String(plan?.id || "").trim();
      const price = Number(plan?.priceMonthly || plan?.price || 0);
      if (!id || !Number.isFinite(price) || price <= 0) {
        return null;
      }

      const monthlyPoints = Number(plan?.monthlyPoints || plan?.includedPoints || 0);
      return {
        id,
        name: String(plan?.name || id).trim(),
        price,
        monthlyPoints,
        badge:
          String(plan?.badge || "").trim() ||
          (index === 0 ? "Best Intro" : index === 1 ? "Reader Favorite" : ""),
        perks: [
          monthlyPoints > 0 ? `${monthlyPoints.toLocaleString()} points / month` : null,
          plan?.discountPct ? `${plan.discountPct}% unlock savings` : "Member pricing",
          "Priority support",
        ].filter(Boolean),
      };
    })
    .filter(Boolean);
}

function StoreContent({
  packages = [],
  planCatalog = null,
  billingAvailability = null,
}) {
  const router = useRouter();
  const { palette, isAdultMode, openLogin } = useFigmaSite();
  const { isSignedIn, user } = useAuthStore();
  const {
    paidPts,
    bonusPts,
    subscription,
    subscriptionVoucher,
    loadWallet,
    topup,
    subscribe,
  } = useWalletStore();
  const normalizedPackages = useMemo(() => normalizePackages(packages), [packages]);
  const plans = useMemo(() => normalizePlans(planCatalog || {}), [planCatalog]);
  const [selectedPackId, setSelectedPackId] = useState(
    normalizedPackages.find((item) => item.popular)?.id || normalizedPackages[0]?.id || "",
  );
  const [busyAction, setBusyAction] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const walletBalance = paidPts + bonusPts;
  const selectedPack =
    normalizedPackages.find((item) => item.id === selectedPackId) ||
    normalizedPackages[0] ||
    null;
  const displayName = String(user?.email || user?.name || "Reader").split("@")[0];
  const commerceReady =
    billingAvailability?.checkoutEnabled !== false &&
    normalizedPackages.length > 0;

  useEffect(() => {
    if (normalizedPackages.length > 0 && !selectedPackId) {
      setSelectedPackId(
        normalizedPackages.find((item) => item.popular)?.id || normalizedPackages[0]?.id || "",
      );
    }
  }, [normalizedPackages, selectedPackId]);

  useEffect(() => {
    if (isSignedIn) {
      void loadWallet();
    }
  }, [isSignedIn, loadWallet]);

  const handleTopup = async () => {
    if (!selectedPack) {
      return;
    }
    if (!isSignedIn) {
      openLogin("login", "/store");
      return;
    }

    setBusyAction(`topup:${selectedPack.id}`);
    setStatusMessage("");
    const response = await topup(selectedPack.id, {
      attribution: {
        entryPoint: "FIGMA_STORE",
        sourcePath: "/store",
        returnTo: "/store",
        offerId: `points_pack_${selectedPack.id}`,
      },
    });
    if (response.ok) {
      setStatusMessage("Points added to your wallet.");
      await loadWallet();
    } else {
      setStatusMessage("Top-up failed. Try again.");
    }
    setBusyAction("");
  };

  const handleSubscribe = async (planId) => {
    if (!planId) {
      return;
    }
    if (!isSignedIn) {
      openLogin("login", "/store");
      return;
    }
    setBusyAction(`plan:${planId}`);
    setStatusMessage("");
    const response = await subscribe(planId, {
      attribution: {
        entryPoint: "FIGMA_STORE_PLAN",
        sourcePath: "/store",
        returnTo: "/store",
        offerId: planId,
      },
    });
    if (response.ok) {
      setStatusMessage("Membership updated.");
      await loadWallet();
    } else {
      setStatusMessage("Membership checkout failed.");
    }
    setBusyAction("");
  };

  return (
    <div className={cn("min-h-screen pt-24 pb-20", palette.rootBg)}>
      <FigmaChrome>
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <section className="mb-10 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_360px]">
            <div
              className={cn(
                "relative overflow-hidden rounded-[32px] border p-8 shadow-2xl",
                palette.surface,
                palette.border,
              )}
            >
              <div
                className={cn(
                  "pointer-events-none absolute -right-16 -top-12 h-56 w-56 rounded-full blur-[90px] opacity-30",
                  isAdultMode ? "bg-red-500" : "bg-yellow-400",
                )}
              />
              <div className="relative z-10 max-w-3xl">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-yellow-400">
                  <Sparkles className="h-4 w-4" />
                  Wallet / Membership
                </div>
                <h1 className="max-w-3xl text-4xl font-black tracking-tight text-white md:text-5xl">
                  Power up your next binge session.
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-gray-300">
                  Buy points for locked episodes, or go member if you want the cleaner
                  long-haul deal. Same storefront, sharper presentation.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleTopup}
                    disabled={!selectedPack || busyAction.startsWith("topup:") || !commerceReady}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-black uppercase tracking-[0.18em] text-white transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60",
                      palette.primaryBg,
                    )}
                  >
                    {busyAction.startsWith("topup:") ? (
                      <LoaderCircle className="h-5 w-5 animate-spin" />
                    ) : (
                      <CreditCard className="h-5 w-5" />
                    )}
                    {commerceReady ? "Checkout selected pack" : "Store unavailable"}
                  </button>
                  <Link
                    href="/account"
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-white/10"
                  >
                    View account
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
                {statusMessage ? (
                  <p className="mt-4 text-sm font-semibold text-white/78">{statusMessage}</p>
                ) : null}
              </div>
            </div>

            <div
              className={cn(
                "overflow-hidden rounded-[32px] border p-6 shadow-2xl",
                palette.surface,
                palette.border,
              )}
            >
              <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">
                Current Balance
              </p>
              <div className="mt-5 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-500/10 text-yellow-400">
                  <Coins className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-4xl font-black tracking-tight text-white">
                    {walletBalance.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-400">
                    Paid {paidPts.toLocaleString()} / Bonus {bonusPts.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="mt-8 rounded-3xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">
                  Account
                </p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-lg font-bold text-white">{displayName}</div>
                    <div className="text-sm text-gray-400">
                      {subscription?.active ? "Membership active" : "Free reader"}
                    </div>
                  </div>
                  <div
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.18em]",
                      subscription?.active
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-white/10 text-gray-300",
                    )}
                  >
                    {subscription?.active ? subscription?.planId || "Member" : "Free"}
                  </div>
                </div>
                {subscriptionVoucher ? (
                  <div className="mt-4 flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
                    <Gift className="h-4 w-4" />
                    Voucher ready: {String(subscriptionVoucher?.code || "Applied")}
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <section className="mb-12">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">
                  Point Packs
                </p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-white">
                  Pick a reload pack
                </h2>
              </div>
              {!commerceReady ? (
                <span className="rounded-full border border-red-500/20 bg-red-500/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-red-400">
                  Checkout unavailable
                </span>
              ) : null}
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {normalizedPackages.map((pack) => {
                const active = selectedPack?.id === pack.id;
                return (
                  <button
                    key={pack.id}
                    type="button"
                    onClick={() => setSelectedPackId(pack.id)}
                    className={cn(
                      "relative overflow-hidden rounded-[28px] border p-6 text-left shadow-xl transition-all hover:-translate-y-1 active:scale-[0.99]",
                      active
                        ? "border-yellow-500/55 bg-yellow-500/8 shadow-[0_0_32px_rgba(234,179,8,0.18)]"
                        : cn(palette.surface, palette.border),
                    )}
                  >
                    {pack.popular ? (
                      <div className="absolute right-4 top-4 rounded-full bg-gradient-to-r from-orange-400 to-yellow-400 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-black">
                        Most Popular
                      </div>
                    ) : null}

                    <div className="mb-8 flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 text-3xl font-black text-white">
                          <Coins className="h-7 w-7 text-yellow-400" />
                          {pack.points.toLocaleString()}
                        </div>
                        <p className="mt-3 text-sm text-gray-400">
                          {pack.bonus > 0
                            ? `+${pack.bonus.toLocaleString()} bonus points`
                            : "Standard point pack"}
                        </p>
                      </div>
                      <div
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-full border",
                          active
                            ? "border-yellow-500/50 bg-yellow-500/15 text-yellow-400"
                            : "border-white/10 bg-black/20 text-gray-500",
                        )}
                      >
                        {active ? <CheckCircle2 className="h-5 w-5" /> : null}
                      </div>
                    </div>

                    <div className="flex items-end justify-between gap-3 border-t border-white/8 pt-5">
                      <div>
                        <div className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">
                          Price
                        </div>
                        <div className="mt-2 text-2xl font-black text-white">
                          {formatUsd(pack.price)}
                        </div>
                      </div>
                      {pack.bonus > 0 ? (
                        <div className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300">
                          <Gift className="h-3.5 w-3.5" />
                          Bonus
                        </div>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {plans.length > 0 ? (
            <section className="mb-12">
              <div className="mb-6">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">
                  Membership
                </p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-white">
                  Plans for heavy readers
                </h2>
              </div>

              <div className="grid gap-5 lg:grid-cols-3">
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    className={cn(
                      "overflow-hidden rounded-[28px] border p-6 shadow-xl",
                      palette.surface,
                      palette.border,
                    )}
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-2xl font-black text-white">{plan.name}</h3>
                        <p className="mt-2 text-sm text-gray-400">
                          {formatUsd(plan.price)} / month
                        </p>
                      </div>
                      {plan.badge ? (
                        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-gray-200">
                          {plan.badge}
                        </div>
                      ) : null}
                    </div>
                    <div className="space-y-3">
                      {plan.perks.map((perk) => (
                        <div key={`${plan.id}-${perk}`} className="flex items-center gap-3 text-sm text-gray-300">
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          {perk}
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={busyAction === `plan:${plan.id}`}
                      className={cn(
                        "mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-black uppercase tracking-[0.18em] text-white transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60",
                        palette.primaryBg,
                      )}
                    >
                      {busyAction === `plan:${plan.id}` ? (
                        <LoaderCircle className="h-5 w-5 animate-spin" />
                      ) : (
                        <Crown className="h-5 w-5" />
                      )}
                      {subscription?.planId === plan.id ? "Current plan" : "Choose plan"}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section
            className={cn(
              "grid gap-4 rounded-[28px] border p-6 shadow-xl md:grid-cols-3",
              palette.surface,
              palette.border,
            )}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Secure billing</h3>
                <p className="mt-2 text-sm leading-6 text-gray-400">
                  Billing runs through the existing checkout flow already wired into the app.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-400">
                <Zap className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Immediate unlocks</h3>
                <p className="mt-2 text-sm leading-6 text-gray-400">
                  Purchased points land in the wallet and are ready for locked episodes right away.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-fuchsia-500/10 text-fuchsia-400">
                <Crown className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Membership layer</h3>
                <p className="mt-2 text-sm leading-6 text-gray-400">
                  If plans are live, you can stack recurring value on top of the same wallet flow.
                </p>
              </div>
            </div>
          </section>
        </div>
      </FigmaChrome>
    </div>
  );
}

export default function FigmaStorePage(props) {
  return (
    <FigmaSiteProvider>
      <StoreContent {...props} />
    </FigmaSiteProvider>
  );
}
