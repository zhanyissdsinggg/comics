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
import EditorialHero from "../common/EditorialHero";
import SurfacePanel from "../common/SurfacePanel";
import {
  storefrontBadgeClass,
  storefrontHighlightBadgeClass,
  storefrontInfoCardClass,
  storefrontNoticeClass,
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
  storefrontSoftCardClass,
  StorefrontSectionHeading,
} from "../common/StorefrontPagePrimitives";
import { StorefrontPage } from "../storefront/StorefrontScaffold";
import { useWalletStore } from "../../store/useWalletStore";
import { useAuthStore } from "../../store/useAuthStore";
import FigmaChrome from "./FigmaChrome";
import { FigmaSiteProvider, useFigmaSite } from "./FigmaSiteContext";
import { formatUsd } from "./figma-utils";

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
  const { isAdultMode, openLogin } = useFigmaSite();
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
  const accent = isAdultMode ? "rose" : "blue";
  const primaryCtaClass = `${storefrontPrimaryButtonClass} w-full disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto`;
  const secondaryCtaClass = `${storefrontSecondaryButtonClass} w-full sm:w-auto`;
  const quietCardClass = `${storefrontInfoCardClass} text-white`;
  const planCardClass =
    "flex h-full flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.03)_100%)] p-5 shadow-[0_20px_48px_rgba(8,6,20,0.24)] md:p-6";
  const inactivePackClass =
    "relative flex h-full flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.03)_100%)] p-5 text-left shadow-[0_20px_48px_rgba(8,6,20,0.24)] transition-all hover:-translate-y-1 active:scale-[0.99] md:p-6";

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

  const heroStats = [
    {
      label: "Wallet",
      value: `${walletBalance.toLocaleString()} pts`,
      hint: `Paid ${paidPts.toLocaleString()} / Bonus ${bonusPts.toLocaleString()}`,
    },
    {
      label: "Point packs",
      value: normalizedPackages.length > 0 ? `${normalizedPackages.length} live` : "Preview",
      hint: commerceReady ? "Pick a pack and open checkout." : "Browsing only right now.",
    },
    {
      label: "Membership",
      value: subscription?.active
        ? subscription?.planId || "Active"
        : membershipReady
          ? "Available"
          : "Preview",
      hint: subscription?.active
        ? "Perks are already attached to this account."
        : "Monthly plan layer for long-haul readers.",
    },
  ];

  const deskCards = [
    {
      label: "Balance",
      value: walletBalance.toLocaleString(),
      hint: "Live wallet total.",
      icon: Coins,
    },
    {
      label: "Reader state",
      value: subscription?.active ? "Member" : "Free",
      hint: displayName,
      icon: Crown,
    },
    {
      label: "Commerce",
      value: storePreview ? "Preview" : "Live",
      hint: storePreview ? "Checkout disabled." : "Wallet checkout ready.",
      icon: CreditCard,
    },
  ];

  const helperCards = [
    {
      icon: ShieldCheck,
      title: "Secure billing",
      body: storePreview
        ? "Checkout is staged but not open yet. Pricing stays visible so readers can still compare the structure."
        : "Billing runs through the existing checkout flow already wired into the app.",
    },
    {
      icon: Zap,
      title: "Immediate unlocks",
      body: storePreview
        ? "Free chapters and catalog browsing stay live while paid unlocks wait for launch."
        : "Purchased points land in the wallet and are ready for locked episodes right away.",
    },
    {
      icon: Crown,
      title: "Membership layer",
      body: storePreview
        ? "Membership pricing is visible early so readers can compare plans before billing opens."
        : "If plans are live, you can stack recurring value on top of the same wallet flow.",
    },
  ];

  return (
    <StorefrontPage accentClass="from-[rgba(82,188,255,0.12)] via-[rgba(167,139,250,0.08)] to-[rgba(255,87,166,0.1)]">
      <FigmaChrome>
        <div className="flex flex-col gap-8">
          <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
            <EditorialHero
              accent={accent}
              appearance="dark"
              eyebrow={storePreview ? "Store Preview" : "Wallet / Membership"}
              title={
                storePreview
                  ? "Points are warming up for launch."
                  : "Power up the next binge session."
              }
              description={
                storePreview
                  ? "Preview the pack structure, compare membership, and keep browsing free chapters until checkout opens."
                  : "Buy points for locked episodes, or switch to membership if you want the cleaner long-haul reading deal."
              }
              secondary={isAdultMode ? "18+ mode active" : "Core mode active"}
              stats={heroStats}
              actions={
                <>
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
                  ) : (
                    <button
                      type="button"
                      onClick={() => router.push("/support")}
                      className={secondaryCtaClass}
                    >
                      Support
                    </button>
                  )}
                </>
              }
            />

            <SurfacePanel
              tone="muted"
              accent={accent}
              appearance="dark"
              className="space-y-4"
            >
              <StorefrontSectionHeading
                eyebrow="Reader Desk"
                title="Balance, account state, and plan access"
                description="Live wallet state stays attached to the same checkout and subscription logic already wired into the app."
              />

              <div className="grid gap-3">
                {deskCards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <div key={card.label} className={quietCardClass}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/50">
                            {card.label}
                          </p>
                          <p className="mt-2 font-display text-[1.4rem] font-semibold tracking-[-0.04em] text-white">
                            {card.value}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-white/66">
                            {card.hint}
                          </p>
                        </div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-[18px] border border-white/12 bg-[linear-gradient(135deg,rgba(255,79,154,0.16)_0%,rgba(86,215,255,0.14)_100%)] text-white shadow-[0_14px_30px_rgba(8,6,20,0.16)]">
                          <Icon className="size-4" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className={storefrontSoftCardClass}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/50">
                  Account
                </p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-white">
                      {displayName}
                    </p>
                    <p className="mt-1 text-sm text-white/60">
                      {subscription?.active ? "Membership active" : "Free reader"}
                    </p>
                  </div>
                  <span
                    className={
                      subscription?.active
                        ? storefrontHighlightBadgeClass
                        : storefrontBadgeClass
                    }
                  >
                    {subscription?.active
                      ? subscription?.planId || "Member"
                      : "Free"}
                  </span>
                </div>
                {subscriptionVoucher ? (
                  <div className="mt-4 rounded-[20px] border border-emerald-300/18 bg-emerald-400/10 px-3 py-3 text-sm text-emerald-100 shadow-[0_14px_30px_rgba(16,185,129,0.12)]">
                    Voucher ready: {String(subscriptionVoucher?.code || "Applied")}
                  </div>
                ) : null}
              </div>

              {statusMessage ? (
                <p className={storefrontNoticeClass}>{statusMessage}</p>
              ) : null}
            </SurfacePanel>
          </section>

          <section className="space-y-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <StorefrontSectionHeading
                eyebrow="Point Packs"
                title={storePreview ? "Point packs preview" : "Pick a reload pack"}
                description="Small top-up for one more chapter run, or a bigger reload if you already know tonight is going long."
              />
              {!commerceReady ? (
                <span
                  className={
                    isAdultMode
                      ? "inline-flex items-center gap-2 rounded-full border border-rose-300/22 bg-rose-400/12 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-100 shadow-[0_14px_30px_rgba(244,63,94,0.14)]"
                      : storefrontBadgeClass
                  }
                >
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
                    className={
                      active
                        ? "relative flex h-full flex-col overflow-hidden rounded-[30px] border border-cyan-300/28 bg-[linear-gradient(180deg,rgba(92,228,255,0.16)_0%,rgba(255,79,154,0.12)_100%)] p-5 text-left shadow-[0_24px_58px_rgba(8,6,20,0.28)] transition-all hover:-translate-y-1 active:scale-[0.99] md:p-6"
                        : inactivePackClass
                    }
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
                        className={
                          active
                            ? "flex h-8 w-8 items-center justify-center rounded-full border border-cyan-300/28 bg-cyan-300/12 text-cyan-100"
                            : "flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-[rgba(255,255,255,0.035)] text-white/36"
                        }
                      >
                        {active ? <CheckCircle2 className="h-5 w-5" /> : null}
                      </div>
                    </div>

                    <div className="mt-auto flex items-end justify-between gap-3 border-t border-white/8 pt-3.5 md:pt-5">
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/50">
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
            <section className="space-y-5">
              <StorefrontSectionHeading
                eyebrow="Membership"
                title="Plans for heavy readers"
                description="Monthly readers get cleaner value when they want recurring perks instead of one-off reloads."
              />

              <div className="grid gap-4 lg:grid-cols-3 lg:gap-5">
                {plans.map((plan) => (
                  <div key={plan.id} className={planCardClass}>
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
                        <div className={storefrontBadgeClass}>{plan.badge}</div>
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
                      className={`mt-5 md:mt-auto ${primaryCtaClass}`}
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

          <section className="grid gap-4 md:grid-cols-3">
            {helperCards.map((item) => {
              const Icon = item.icon;
              return (
                <SurfacePanel
                  key={item.title}
                  tone="muted"
                  accent={accent}
                  appearance="dark"
                  className="space-y-4"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/12 bg-[linear-gradient(135deg,rgba(255,79,154,0.16)_0%,rgba(86,215,255,0.14)_100%)] text-white shadow-[0_14px_30px_rgba(8,6,20,0.16)]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-white/66">
                      {item.body}
                    </p>
                  </div>
                </SurfacePanel>
              );
            })}
          </section>
        </div>
      </FigmaChrome>
    </StorefrontPage>
  );
}

export default function FigmaStorePage(props) {
  return (
    <FigmaSiteProvider>
      <StoreContent {...props} />
    </FigmaSiteProvider>
  );
}
