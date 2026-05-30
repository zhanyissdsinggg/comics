"use client";
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

      const monthlyPoints = Number(
        plan?.monthlyPoints || plan?.includedPoints || 0,
      );
      return {
        id,
        name: String(plan?.name || id).trim(),
        price,
        monthlyPoints,
        badge:
          String(plan?.badge || "").trim() ||
          (index === 0 ? "Best Intro" : index === 1 ? "Reader Favorite" : ""),
        perks: [
          monthlyPoints > 0
            ? `${monthlyPoints.toLocaleString()} points / month`
            : null,
          plan?.discountPct
            ? `${plan.discountPct}% unlock savings`
            : "Member pricing",
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
  prelaunchStore = false,
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
  const normalizedPackages = useMemo(
    () => normalizePackages(packages),
    [packages],
  );
  const plans = useMemo(() => normalizePlans(planCatalog || {}), [planCatalog]);
  const [selectedPackId, setSelectedPackId] = useState(
    normalizedPackages.find((item) => item.popular)?.id ||
      normalizedPackages[0]?.id ||
      "",
  );
  const [busyAction, setBusyAction] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const walletBalance = paidPts + bonusPts;
  const selectedPack =
    normalizedPackages.find((item) => item.id === selectedPackId) ||
    normalizedPackages[0] ||
    null;
  const displayName = String(user?.email || user?.name || "Reader").split(
    "@",
  )[0];
  const purchaseActionsEnabled =
    billingAvailability?.purchaseActionsEnabled === true;
  const subscriptionActionsEnabled =
    billingAvailability?.subscriptionActionsEnabled === true;
  const storePreview = prelaunchStore || !purchaseActionsEnabled;
  const commerceReady = !storePreview && normalizedPackages.length > 0;
  const membershipReady = !storePreview && subscriptionActionsEnabled;
  const shellPanelClass = cn(
    "relative overflow-hidden rounded-[34px] border bg-[linear-gradient(180deg,rgba(22,21,36,0.96)_0%,rgba(11,11,20,0.94)_100%)] shadow-[0_30px_80px_rgba(5,5,15,0.38)] backdrop-blur-2xl",
    isAdultMode ? "border-red-500/18" : "border-cyan-300/14",
  );
  const insetPanelClass =
    "relative overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.03)_100%)] shadow-[0_20px_48px_rgba(8,6,20,0.24)] backdrop-blur-xl";
  const eyebrowClass =
    "text-[10px] font-semibold uppercase tracking-[0.24em] text-white/56";
  const primaryCtaClass = cn(
    "inline-flex w-full items-center justify-center gap-2 rounded-full border px-6 py-3.5 text-sm font-semibold tracking-[0.02em] transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto",
    isAdultMode
      ? "border-red-400/28 bg-[linear-gradient(135deg,#ef4444_0%,#f43f5e_100%)] text-white shadow-[0_18px_38px_rgba(239,68,68,0.26)] hover:-translate-y-0.5"
      : "border-[rgba(255,79,154,0.32)] bg-[linear-gradient(135deg,#ff4f9a_0%,#ff7ab1_52%,#ff9cc0_100%)] text-[#1a0e16] shadow-[0_18px_38px_rgba(255,79,154,0.26)] hover:-translate-y-0.5",
  );
  const secondaryCtaClass =
    "inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/12 bg-[rgba(255,255,255,0.05)] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(8,6,20,0.18)] transition-all hover:-translate-y-0.5 hover:border-white/18 hover:bg-[rgba(255,255,255,0.09)] sm:w-auto";
  const accentChipClass = cn(
    "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] shadow-[0_12px_28px_rgba(8,6,20,0.2)] md:px-4 md:py-2 md:text-xs",
    isAdultMode
      ? "border-red-400/24 bg-red-500/12 text-red-200"
      : "border-cyan-300/18 bg-cyan-300/10 text-cyan-100",
  );

  useEffect(() => {
    if (normalizedPackages.length > 0 && !selectedPackId) {
      setSelectedPackId(
        normalizedPackages.find((item) => item.popular)?.id ||
          normalizedPackages[0]?.id ||
          "",
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
    <div className={cn("min-h-screen pb-20", palette.rootBg)}>
      <FigmaChrome>
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <section className="mb-8 grid gap-4 lg:mb-10 lg:grid-cols-[minmax(0,1.6fr)_360px] lg:gap-6">
            <div className={cn(shellPanelClass, "p-4 md:p-8")}>
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,79,154,0.18),transparent_26%),radial-gradient(circle_at_top_right,rgba(103,232,249,0.14),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.08),transparent_34%)]" />
              <div className="pointer-events-none absolute inset-[1px] rounded-[33px] border border-white/6" />
              <div
                className={cn(
                  "pointer-events-none absolute -right-16 -top-12 h-56 w-56 rounded-full blur-[90px] opacity-30",
                  isAdultMode ? "bg-red-500" : "bg-yellow-400",
                )}
              />
              <div className="relative z-10 max-w-3xl">
                <div className={cn("mb-3", accentChipClass)}>
                  <Sparkles className="h-4 w-4" />
                  {storePreview ? "Store Preview" : "Wallet / Membership"}
                </div>
                <h1 className="max-w-2xl font-display text-[2.3rem] font-semibold leading-[0.92] tracking-[-0.06em] text-white md:max-w-3xl md:text-[4.6rem]">
                  {storePreview
                    ? "Coming soon."
                    : "Power up your next binge session."}
                </h1>
                {storePreview ? (
                  <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#ffdca1] md:text-xs">
                    Points are coming soon
                  </p>
                ) : null}
                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/72 md:text-base">
                  {storePreview
                    ? "Preview only. Checkout is disabled."
                    : "Buy points for locked episodes, or go member if you want the cleaner long-haul deal. Same storefront, sharper presentation."}
                </p>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row md:mt-8">
                  <button
                    type="button"
                    onClick={() => {
                      if (storePreview) {
                        router.push("/comics");
                        return;
                      }
                      void handleTopup();
                    }}
                    disabled={
                      !storePreview &&
                      (!selectedPack ||
                        busyAction.startsWith("topup:") ||
                        !commerceReady)
                    }
                    className={primaryCtaClass}
                  >
                    {!storePreview && busyAction.startsWith("topup:") ? (
                      <LoaderCircle className="h-5 w-5 animate-spin" />
                    ) : (
                      <CreditCard className="h-5 w-5" />
                    )}
                    {storePreview
                      ? "Browse free chapters"
                      : commerceReady
                        ? "Checkout selected pack"
                        : "Store unavailable"}
                  </button>
                  {!storePreview ? (
                    <button
                      type="button"
                      onClick={() => {
                        router.push("/account");
                      }}
                      className={secondaryCtaClass}
                    >
                      View account
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  ) : null}
                  {storePreview ? (
                    <button
                      type="button"
                      onClick={() => router.push("/support")}
                      className={secondaryCtaClass}
                    >
                      Support
                    </button>
                  ) : null}
                </div>
                {statusMessage ? (
                  <div className="mt-4 inline-flex rounded-full border border-white/10 bg-[rgba(255,255,255,0.05)] px-4 py-2 text-sm font-medium text-white/78">
                    {statusMessage}
                  </div>
                ) : null}

                <div className={cn("mt-6 p-3.5 lg:hidden", insetPanelClass)}>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.05)] text-[#ffd26f]">
                      <Coins className="h-5 w-5" />
                    </div>
                    <div>
                      <p className={eyebrowClass}>
                        Current Balance
                      </p>
                      <div className="font-display text-[2rem] font-semibold tracking-[-0.05em] text-white">
                        {walletBalance.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 rounded-[22px] border border-white/10 bg-[rgba(255,255,255,0.04)] px-3 py-2.5">
                    <div>
                      <div className="text-sm font-semibold text-white">
                        {displayName}
                      </div>
                      <div className="text-xs text-white/58">
                        {subscription?.active
                          ? "Membership active"
                          : "Free reader"}
                      </div>
                    </div>
                    <div
                      className={cn(
                        "rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]",
                        subscription?.active
                          ? "border-emerald-300/22 bg-emerald-400/12 text-emerald-200"
                          : "border-white/10 bg-[rgba(255,255,255,0.05)] text-white/68",
                      )}
                    >
                      {subscription?.active
                        ? subscription?.planId || "Member"
                        : "Free"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={cn("relative hidden overflow-hidden p-5 lg:block lg:p-6", shellPanelClass)}>
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,79,154,0.12),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(103,232,249,0.1),transparent_26%)]" />
              <div className="pointer-events-none absolute inset-[1px] rounded-[33px] border border-white/6" />
              <div className="relative">
              <p className={eyebrowClass}>
                Current Balance
              </p>
              <div className="mt-4 flex items-center gap-3 md:mt-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.05)] text-[#ffd26f] md:h-12 md:w-12">
                  <Coins className="h-6 w-6" />
                </div>
                <div>
                  <div className="font-display text-[2.6rem] font-semibold tracking-[-0.06em] text-white md:text-[3rem]">
                    {walletBalance.toLocaleString()}
                  </div>
                  <div className="text-sm text-white/58">
                    Paid {paidPts.toLocaleString()} / Bonus{" "}
                    {bonusPts.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className={cn("mt-6 p-3.5 md:mt-8 md:p-4", insetPanelClass)}>
                <p className={eyebrowClass}>
                  Account
                </p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold text-white">
                      {displayName}
                    </div>
                    <div className="text-sm text-white/58">
                      {subscription?.active
                        ? "Membership active"
                        : "Free reader"}
                    </div>
                  </div>
                  <div
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]",
                      subscription?.active
                        ? "border-emerald-300/22 bg-emerald-400/12 text-emerald-200"
                        : "border-white/10 bg-[rgba(255,255,255,0.05)] text-white/68",
                    )}
                  >
                    {subscription?.active
                      ? subscription?.planId || "Member"
                      : "Free"}
                  </div>
                </div>
                {subscriptionVoucher ? (
                  <div className="mt-4 flex items-center gap-2 rounded-[22px] border border-emerald-300/18 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100">
                    <Gift className="h-4 w-4" />
                    Voucher ready:{" "}
                    {String(subscriptionVoucher?.code || "Applied")}
                  </div>
                ) : null}
              </div>
              </div>
            </div>
          </section>

          <section className="mb-10 md:mb-12">
            <div className="mb-5 flex flex-col gap-3 md:mb-6 md:flex-row md:items-end md:justify-between">
              <div>
                <p className={eyebrowClass}>
                  Point Packs
                </p>
                <h2 className="mt-2 font-display text-[2rem] font-semibold tracking-[-0.05em] text-white md:text-[2.5rem]">
                  {storePreview
                    ? "Point packs preview."
                    : "Pick a reload pack"}
                </h2>
              </div>
              {!commerceReady ? (
                <span className="rounded-full border border-rose-300/18 bg-rose-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-rose-100">
                  {storePreview ? "Launching soon" : "Checkout unavailable"}
                </span>
              ) : null}
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {normalizedPackages.map((pack) => {
                const active = selectedPack?.id === pack.id;
                return (
                  <button
                    key={pack.id}
                    type="button"
                    onClick={() => setSelectedPackId(pack.id)}
                    className={cn(
                      "relative flex h-full flex-col overflow-hidden rounded-[30px] border p-5 text-left shadow-[0_20px_48px_rgba(8,6,20,0.24)] transition-all hover:-translate-y-1 active:scale-[0.99] md:p-6",
                      active
                        ? "border-cyan-300/28 bg-[linear-gradient(180deg,rgba(92,228,255,0.16)_0%,rgba(255,79,154,0.12)_100%)] shadow-[0_24px_58px_rgba(8,6,20,0.28)]"
                        : insetPanelClass,
                    )}
                  >
                    {pack.popular ? (
                      <div className="absolute right-4 top-4 rounded-full border border-[rgba(255,214,130,0.22)] bg-[linear-gradient(135deg,#f6c25f_0%,#ffd97f_100%)] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.22em] text-[#241608] shadow-[0_12px_24px_rgba(246,194,95,0.22)] md:px-3 md:text-[10px]">
                        Most Popular
                      </div>
                    ) : null}

                    <div className="mb-5 flex min-h-[5rem] items-start justify-between gap-3 md:mb-8 md:min-h-[7rem]">
                      <div>
                        <div className="flex items-center gap-2 font-display text-[2rem] font-semibold tracking-[-0.05em] text-white md:text-[2.35rem]">
                          <Coins className="h-6 w-6 text-[#ffd26f] md:h-7 md:w-7" />
                          {pack.points.toLocaleString()}
                        </div>
                        <p className="mt-1.5 text-sm leading-6 text-white/62">
                          {pack.bonus > 0
                            ? `+${pack.bonus.toLocaleString()} bonus points`
                            : "Standard point pack"}
                        </p>
                      </div>
                      <div
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-full border",
                          active
                            ? "border-cyan-300/28 bg-cyan-300/12 text-cyan-100"
                            : "border-white/10 bg-[rgba(255,255,255,0.04)] text-white/36",
                        )}
                      >
                        {active ? <CheckCircle2 className="h-5 w-5" /> : null}
                      </div>
                    </div>

                    <div className="mt-auto flex items-end justify-between gap-3 border-t border-white/8 pt-3.5 md:pt-5">
                      <div>
                        <div className={eyebrowClass}>
                          Price
                        </div>
                        <div className="mt-1.5 font-display text-[2rem] font-semibold tracking-[-0.05em] text-white">
                          {formatUsd(pack.price)}
                        </div>
                      </div>
                      {pack.bonus > 0 ? (
                        <div className="inline-flex items-center gap-1 rounded-full border border-emerald-300/18 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-100">
                          <Gift className="h-3.5 w-3.5" />
                          Bonus
                        </div>
                      ) : null}
                    </div>
                    {storePreview ? (
                      <p className="mt-4 text-xs font-medium uppercase tracking-[0.16em] text-white/42">
                        Preview only. Checkout is disabled.
                      </p>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </section>

          {!storePreview && plans.length > 0 ? (
            <section className="mb-10 md:mb-12">
              <div className="mb-5 md:mb-6">
                <p className={eyebrowClass}>
                  Membership
                </p>
                <h2 className="mt-2 font-display text-[2rem] font-semibold tracking-[-0.05em] text-white md:text-[2.5rem]">
                  Plans for heavy readers
                </h2>
              </div>

              <div className="grid gap-4 lg:grid-cols-3 lg:gap-5">
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    className={cn(
                      "flex h-full flex-col overflow-hidden rounded-[30px] border p-5 shadow-[0_20px_48px_rgba(8,6,20,0.24)] md:p-6",
                      insetPanelClass,
                    )}
                  >
                    <div className="mb-4 flex min-h-[4.5rem] items-center justify-between gap-3 md:min-h-[5rem]">
                      <div>
                        <h3 className="font-display text-[1.55rem] font-semibold tracking-[-0.04em] text-white md:text-[1.85rem]">
                          {plan.name}
                        </h3>
                        <p className="mt-1.5 text-sm text-white/62">
                          {formatUsd(plan.price)} / month
                        </p>
                      </div>
                      {plan.badge ? (
                        <div className="rounded-full border border-white/10 bg-[rgba(255,255,255,0.05)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/72">
                          {plan.badge}
                        </div>
                      ) : null}
                    </div>
                    <div className="space-y-3">
                      {plan.perks.map((perk) => (
                        <div
                          key={`${plan.id}-${perk}`}
                          className="flex items-center gap-3 text-sm text-white/68"
                        >
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          {perk}
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={
                        !membershipReady || busyAction === `plan:${plan.id}`
                      }
                      className={cn("mt-5 md:mt-auto", primaryCtaClass)}
                    >
                      {busyAction === `plan:${plan.id}` ? (
                        <LoaderCircle className="h-5 w-5 animate-spin" />
                      ) : (
                        <Crown className="h-5 w-5" />
                      )}
                      {!membershipReady
                        ? "Plans soon"
                        : subscription?.planId === plan.id
                          ? "Current plan"
                          : "Choose plan"}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section
            className={cn("grid gap-4 p-5 md:grid-cols-3 md:p-6", shellPanelClass)}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-300/18 bg-emerald-400/10 text-emerald-200 md:h-12 md:w-12">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">
                  Secure billing
                </h3>
                <p className="mt-2 text-sm leading-6 text-white/62">
                  {storePreview
                    ? "Checkout is staged but not open yet. We are keeping the flow visible so the pricing structure stays clear."
                    : "Billing runs through the existing checkout flow already wired into the app."}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/18 bg-cyan-300/10 text-cyan-100 md:h-12 md:w-12">
                <Zap className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">
                  Immediate unlocks
                </h3>
                <p className="mt-2 text-sm leading-6 text-white/62">
                  {storePreview
                    ? "Free chapters and catalog browsing stay live while paid unlocks wait for launch."
                    : "Purchased points land in the wallet and are ready for locked episodes right away."}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[rgba(255,120,164,0.2)] bg-[rgba(255,79,154,0.1)] text-[#ffd7e8] md:h-12 md:w-12">
                <Crown className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">
                  Membership layer
                </h3>
                <p className="mt-2 text-sm leading-6 text-white/62">
                  {storePreview
                    ? "Membership pricing is visible early so readers can compare plans before billing opens."
                    : "If plans are live, you can stack recurring value on top of the same wallet flow."}
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
