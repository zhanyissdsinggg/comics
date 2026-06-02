"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import EditorialHero from "../../components/common/EditorialHero";
import SurfacePanel from "../../components/common/SurfacePanel";
import CommerceSuccessBanner from "../../components/common/CommerceSuccessBanner";
import StorefrontPathwaysGrid from "../../components/common/StorefrontPathwaysGrid";
import {
  StorefrontDesk,
  StorefrontSectionHeading,
  storefrontBadgeClass,
  storefrontNoticeClass,
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
} from "../../components/common/StorefrontPagePrimitives";
import { apiGet, apiPost } from "../../lib/apiClient";
import { getFriendlyMessage } from "../../lib/errorMessages";
import {
  formatUSDate,
  formatUSDisplayCurrencyFromCents,
} from "../../lib/localization";
import { useAuthStore } from "../../store/useAuthStore";
import { buildPathWithAttribution } from "../../lib/paymentAttribution";
import {
  consumeCommerceSuccessForPath,
  getCommerceSuccessPresentation,
} from "../../lib/commerceSuccess";
import {
  getCommerceJourneyGuide,
  STOREFRONT_TERMS,
} from "../../lib/storefrontCopy";
import { buildSupportPath } from "../../lib/supportRouting";
import { siteConfig } from "../../lib/siteConfig";
import { StorefrontPage } from "../../components/storefront/StorefrontScaffold";

function formatOrderAmount(amount, currency) {
  const numericAmount = Number(amount || 0);
  return formatUSDisplayCurrencyFromCents(numericAmount, currency);
}

function formatOrderDate(value) {
  if (!value) {
    return "Date unavailable";
  }

  const formatted = formatUSDate(value, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return formatted || "Date unavailable";
}

function formatLabelWord(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (!normalized) {
    return "";
  }
  if (normalized === "vip") {
    return "VIP";
  }
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function normalizePackageId(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function isMembershipCharge(packageId) {
  const normalized = normalizePackageId(packageId);
  return (
    normalized.startsWith("subscribe_") ||
    ["basic", "pro", "vip"].includes(normalized)
  );
}

function formatOrderPackageLabel(packageId) {
  const normalized = normalizePackageId(packageId);

  if (!normalized) {
    return "Recent purchase";
  }

  if (normalized.startsWith("points_pack_")) {
    const label = normalized
      .replace(/^points_pack_/, "")
      .split("_")
      .map(formatLabelWord)
      .join(" ");
    return `${label} point pack`;
  }

  if (normalized.startsWith("subscribe_")) {
    const label = normalized
      .replace(/^subscribe_/, "")
      .split("_")
      .map(formatLabelWord)
      .join(" ");
    return `${label} plan`;
  }

  if (["basic", "pro", "vip"].includes(normalized)) {
    return `${formatLabelWord(normalized)} plan`;
  }

  return normalized.split(/[_-]+/).map(formatLabelWord).join(" ");
}

function buildSupportHref(orderId, topic = "billing") {
  return buildSupportPath({
    topic,
    orderId,
    context: orderId
      ? `Purchase issue for ${orderId}`
      : "Purchase or billing question",
  });
}

export default function OrdersPageClient({ initialSignedIn = false }) {
  const router = useRouter();
  const { hydrated, isSignedIn } = useAuthStore();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState("");
  const [feedback, setFeedback] = useState({ type: "", text: "" });
  const [billingAvailability, setBillingAvailability] = useState(null);
  const [commerceNotice, setCommerceNotice] = useState(null);
  const viewerSignedIn = hydrated ? isSignedIn : initialSignedIn;
  const checkoutVisible = siteConfig.monetization.checkoutEnabled;
  const membershipVisible = siteConfig.monetization.membershipEnabled;
  const pointPacksVisible = siteConfig.monetization.pointPacksEnabled;

  useEffect(() => {
    let mounted = true;

    apiGet("/api/billing/topups").then((response) => {
      if (!mounted || !response.ok) {
        return;
      }
      setBillingAvailability(response.data?.billing || null);
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    if (!hydrated) {
      setLoading(true);
      return () => {
        mounted = false;
      };
    }

    if (!viewerSignedIn) {
      setOrders([]);
      setLoading(false);
      return () => {
        mounted = false;
      };
    }

    setLoading(true);
    apiGet("/api/orders", { suppressAuthModal: true }).then((response) => {
      if (!mounted) {
        return;
      }
      if (response.ok) {
        setOrders(response.data?.orders || []);
      }
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [hydrated, viewerSignedIn]);

  useEffect(() => {
    setCommerceNotice(
      getCommerceSuccessPresentation(consumeCommerceSuccessForPath("/orders")),
    );
  }, []);

  const refundActionsEnabled =
    billingAvailability?.refundActionsEnabled === true;
  const refundPreviewOnly = billingAvailability?.refundActionsEnabled === false;
  const primaryButtonClass = `${storefrontPrimaryButtonClass} disabled:cursor-not-allowed disabled:opacity-50`;
  const secondaryButtonClass = `${storefrontSecondaryButtonClass} disabled:cursor-not-allowed disabled:opacity-50`;

  // NOTE: These class strings are referenced by multiple useMemo blocks below.
  // They must be declared before use to avoid TDZ runtime errors in production builds.
  const actionCardPrimaryClass =
    "border border-[rgba(255,79,154,0.24)] bg-[linear-gradient(180deg,rgba(255,79,154,0.12)_0%,rgba(255,255,255,0.03)_100%)] text-white shadow-[0_22px_46px_rgba(8,6,20,0.24)] hover:border-[rgba(255,79,154,0.34)] hover:bg-[linear-gradient(180deg,rgba(255,79,154,0.16)_0%,rgba(255,255,255,0.05)_100%)]";
  const actionCardSecondaryClass =
    "border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.03)_100%)] text-white shadow-[0_22px_46px_rgba(8,6,20,0.24)] hover:border-white/16 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.04)_100%)]";
  const subtleChipClass =
    "rounded-full border border-white/12 bg-[rgba(255,255,255,0.035)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/72 shadow-[0_12px_24px_rgba(8,6,20,0.18)]";
  const panelClass = "space-y-5";
  const orderCardClass =
    "rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.03)_100%)] p-4 text-white shadow-[0_18px_40px_rgba(8,6,20,0.22)] transition-all duration-150 hover:-translate-y-0.5 hover:border-white/16 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.04)_100%)]";
  const latestPaidOrder = useMemo(
    () => orders.find((order) => order.status === "PAID") || null,
    [orders],
  );
  const latestMembershipOrder = useMemo(
    () =>
      orders.find(
        (order) =>
          order.status === "PAID" && isMembershipCharge(order.packageId),
      ) || null,
    [orders],
  );
  const totalSpentCents = useMemo(
    () =>
      orders.reduce((sum, order) => {
        if (order.status !== "PAID") {
          return sum;
        }
        return sum + Number(order.amount || 0);
      }, 0),
    [orders],
  );
  const paidOrdersCount = useMemo(
    () => orders.filter((order) => order.status === "PAID").length,
    [orders],
  );
  const latestOrderDate = useMemo(
    () => formatOrderDate(orders[0]?.createdAt),
    [orders],
  );
  const scrollToSection = useCallback((id) => {
    if (typeof document === "undefined") {
      return;
    }
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);
  const signInToOrders = useCallback(() => {
    router.push("/signin?returnTo=/orders");
  }, [router]);
  const refreshOrders = useCallback(async () => {
    if (!viewerSignedIn) {
      signInToOrders();
      return;
    }

    setWorkingId("refresh");
    const response = await apiGet("/api/orders", {
      suppressAuthModal: true,
      bust: true,
      dedupeMs: 0,
    });
    if (response.ok) {
      setOrders(response.data?.orders || []);
      setFeedback({ type: "success", text: "Purchase list updated." });
    } else {
      setFeedback({
        type: "error",
        text: getFriendlyMessage(
          response.error,
          response.message || "Refresh failed.",
        ),
      });
    }
    setWorkingId("");
  }, [signInToOrders, viewerSignedIn]);
  const signedOutActionCards = useMemo(
    () => [
      {
        id: "signin",
        eyebrow: "Account",
        title: "Sign in to view purchases",
        cta: "Sign in",
        onClick: () => router.push("/signin?returnTo=/orders"),
        accentClass: actionCardPrimaryClass,
      },
      {
        id: "support",
        eyebrow: "Billing",
        title: "Need billing help?",
        cta: "Support",
        onClick: () => router.push(buildSupportHref("", "billing")),
        accentClass: actionCardSecondaryClass,
      },
    ],
    [actionCardPrimaryClass, actionCardSecondaryClass, router],
  );
  const emptyOrderActionCards = useMemo(
    () =>
      []
        .concat(
          pointPacksVisible
            ? [
                {
                  id: "packs",
                  eyebrow: "Points",
                  title: "Get points",
                  cta: STOREFRONT_TERMS.viewPointPacks,
                  onClick: () => router.push("/store"),
                  accentClass: actionCardPrimaryClass,
                },
              ]
            : [],
        )
        .concat(
          membershipVisible
            ? [
                {
                  id: "membership",
                  eyebrow: "Plans",
                  title: "Plans",
                  cta: STOREFRONT_TERMS.compareMembership,
                  onClick: () =>
                    router.push(
                      buildPathWithAttribution("/subscribe", {
                        entryPoint: "ORDERS_EMPTY_STATE",
                        sourcePath: "/orders",
                        returnTo: "/orders",
                      }),
                    ),
                  accentClass: actionCardSecondaryClass,
                },
              ]
            : [],
        )
        .concat([
          {
            id: "support",
            eyebrow: "Billing",
            title: "Billing help.",
            cta: "Support",
            onClick: () => router.push(buildSupportHref("", "billing")),
            accentClass: actionCardSecondaryClass,
          },
        ]),
    [
      actionCardPrimaryClass,
      actionCardSecondaryClass,
      membershipVisible,
      pointPacksVisible,
      router,
    ],
  );

  const billingTaskCards = useMemo(
    () => [
      {
        id: "receipt",
        eyebrow: "Orders",
        title: viewerSignedIn
          ? latestPaidOrder
            ? "Orders"
            : orders.length > 0
              ? "Orders"
              : "Orders"
          : "Sign in",
        description: "",
        cta: viewerSignedIn ? "Orders" : "Sign in",
        onClick: viewerSignedIn
          ? () => scrollToSection("purchase-history")
          : signInToOrders,
        accentClass: actionCardPrimaryClass,
      },
      ...(membershipVisible
        ? [
            {
              id: "membership-charges",
              eyebrow: "Plans",
              title: "Plans",
              description: "",
              cta: latestMembershipOrder
                ? "See plan charges"
                : STOREFRONT_TERMS.compareMembership,
              onClick: latestMembershipOrder
                ? () => scrollToSection("purchase-history")
                : () =>
                    router.push(
                      buildPathWithAttribution("/subscribe", {
                        entryPoint: "ORDERS_MEMBERSHIP_CHARGES",
                        sourcePath: "/orders",
                        returnTo: "/orders",
                      }),
                    ),
              accentClass: actionCardSecondaryClass,
            },
          ]
        : []),
      {
        id: "purchase-issue",
        eyebrow: "Missing points?",
        title: latestPaidOrder ? "Report a charge." : "Billing help.",
        description: "",
        cta: "Support",
        onClick: () => router.push(buildSupportHref(latestPaidOrder?.orderId)),
        accentClass: actionCardSecondaryClass,
      },
    ],
    [
      actionCardPrimaryClass,
      actionCardSecondaryClass,
      latestMembershipOrder,
      latestPaidOrder,
      membershipVisible,
      orders.length,
      refundActionsEnabled,
      router,
      scrollToSection,
      signInToOrders,
      viewerSignedIn,
    ],
  );

  if (!viewerSignedIn) {
    return (
      <StorefrontPage accentClass="from-[rgba(103,232,249,0.12)] via-[rgba(167,139,250,0.08)] to-[rgba(255,79,154,0.1)]">
        <div className="mx-auto flex w-full max-w-[960px] flex-col gap-6">
          <EditorialHero
            appearance="dark"
            accent="blue"
            eyebrow="Orders"
            title="Sign in to view purchases"
            description="Need billing help? Support can help."
          />

          <SurfacePanel
            className={panelClass}
            appearance="dark"
            accent="blue"
          >
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/56">
                Account
              </p>
              <h2 className="font-display text-[2rem] font-semibold tracking-[-0.05em] text-white">
                Sign in to view purchases
              </h2>
              <p className="text-sm font-semibold leading-6 text-white/70">
                Need billing help? Support can help.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={signInToOrders}
                className={primaryButtonClass}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => router.push(buildSupportHref("", "billing"))}
                className={secondaryButtonClass}
              >
                Support
              </button>
            </div>
          </SurfacePanel>
        </div>
      </StorefrontPage>
    );
  }

  return (
    <StorefrontPage accentClass="from-[rgba(103,232,249,0.12)] via-[rgba(167,139,250,0.08)] to-[rgba(255,79,154,0.1)]">
      <div className="flex flex-col gap-8">
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <EditorialHero
            appearance="dark"
            accent="blue"
            eyebrow="Orders"
            title={viewerSignedIn ? "Your payment shelf, cleaned up." : "Sign in to view purchases"}
            description={
              viewerSignedIn
                ? "Track purchases, jump back into the right commerce lane, and send billing issues with the right context."
                : "Need billing help? Support can help."
            }
            stats={
              viewerSignedIn
                ? [
                    {
                      label: "Paid orders",
                      value: `${paidOrdersCount}`,
                    },
                    {
                      label: "Total spent",
                      value: formatOrderAmount(totalSpentCents, orders[0]?.currency || "USD"),
                    },
                    {
                      label: "Latest order",
                      value: latestOrderDate,
                    },
                  ]
                : []
            }
          />

          <StorefrontDesk
            eyebrow="Desk"
            title={viewerSignedIn ? "Need a fast route?" : "Need billing help?"}
            description={
              viewerSignedIn
                ? "Jump straight to purchase history, plan charges, or support."
                : null
            }
            actions={
              viewerSignedIn ? (
                <>
                  {checkoutVisible ? (
                    <button
                      type="button"
                      onClick={() => scrollToSection("purchase-history")}
                      className={primaryButtonClass}
                    >
                      Orders
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() =>
                      router.push(buildSupportHref(latestPaidOrder?.orderId))
                    }
                    className={secondaryButtonClass}
                  >
                    Support
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={signInToOrders}
                    className={primaryButtonClass}
                  >
                    Sign in
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push(buildSupportHref("", "billing"))}
                    className={secondaryButtonClass}
                  >
                    Support
                  </button>
                </>
              )
            }
          />
        </section>

        {commerceNotice ? (
          <CommerceSuccessBanner
            notice={commerceNotice}
            onDismiss={() => setCommerceNotice(null)}
          />
        ) : null}

        {feedback.text ? (
          <SurfacePanel
            appearance="dark"
            accent={feedback.type === "error" ? "rose" : "amber"}
            className={
              feedback.type === "error"
                ? "border border-rose-300/22 bg-[rgba(255,79,154,0.12)] shadow-[0_18px_38px_rgba(255,79,154,0.14)]"
                : "border border-amber-300/20 bg-[rgba(247,195,91,0.12)] shadow-[0_18px_38px_rgba(247,195,91,0.14)]"
            }
          >
            <p
              className={`text-sm font-medium ${feedback.type === "error" ? "text-rose-100" : "text-amber-100"}`}
            >
              {feedback.text}
            </p>
          </SurfacePanel>
        ) : null}

        {viewerSignedIn && refundPreviewOnly ? (
          <SurfacePanel
            className="border border-amber-300/20 bg-[rgba(247,195,91,0.12)] text-amber-100 shadow-[0_18px_38px_rgba(247,195,91,0.14)]"
            appearance="dark"
            tone="warning"
            accent="blue"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold tracking-[0.01em]">
                  Need help?
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  router.push(buildSupportHref(latestPaidOrder?.orderId))
                }
                className={secondaryButtonClass}
              >
                Support
              </button>
            </div>
          </SurfacePanel>
        ) : null}

        {viewerSignedIn && hydrated ? (
          <>
            <SurfacePanel
              className={panelClass}
              appearance="dark"
              accent="blue"
            >
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/56">
                    Tasks
                  </p>
                  <h2 className="font-display text-[2rem] font-semibold tracking-[-0.05em] text-white">
                    Keep billing in one place
                  </h2>
                  <p className="max-w-2xl text-sm leading-6 text-white/68">
                    Open the right lane for receipts, plan charges, point packs,
                    or support without hunting through the old account UI.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                  <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.03)_100%)] p-4 shadow-[0_18px_38px_rgba(8,6,20,0.18)]">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">
                      Paid orders
                    </div>
                    <div className="mt-2 font-display text-[1.7rem] font-semibold tracking-[-0.05em] text-white">
                      {paidOrdersCount}
                    </div>
                  </div>
                  <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.03)_100%)] p-4 shadow-[0_18px_38px_rgba(8,6,20,0.18)]">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">
                      Membership
                    </div>
                    <div className="mt-2 text-sm font-semibold leading-6 text-white">
                      {latestMembershipOrder ? "Latest plan charge found" : "No active plan charge in history"}
                    </div>
                  </div>
                  <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.03)_100%)] p-4 shadow-[0_18px_38px_rgba(8,6,20,0.18)]">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">
                      Support lane
                    </div>
                    <div className="mt-2 text-sm font-semibold leading-6 text-white">
                      Purchase questions route straight to billing support.
                    </div>
                  </div>
                </div>
              </div>
              <StorefrontPathwaysGrid
                cards={billingTaskCards}
                columnsClassName="md:grid-cols-2 xl:grid-cols-3"
                appearance="dark"
              />
            </SurfacePanel>
          </>
        ) : null}

        {!hydrated || loading ? (
          <SurfacePanel
            className={panelClass}
            appearance="dark"
            accent="blue"
          >
            <div className="space-y-2">
              <div
                className="h-4 w-28 animate-pulse rounded-full bg-white/20"
                aria-hidden="true"
              />
              <div
                className="h-9 w-72 animate-pulse rounded-2xl bg-white/20"
                aria-hidden="true"
              />
              <div
                className="h-4 w-full max-w-2xl animate-pulse rounded-full bg-white/15"
                aria-hidden="true"
              />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-[24px] border border-white/10 bg-[rgba(255,255,255,0.035)] p-4 shadow-[0_18px_38px_rgba(8,6,20,0.22)]"
                  aria-hidden="true"
                >
                  <div className="h-4 w-24 animate-pulse rounded-full bg-white/20" />
                  <div className="mt-4 h-6 w-40 animate-pulse rounded-2xl bg-white/20" />
                  <div className="mt-4 h-3 w-full animate-pulse rounded-full bg-white/15" />
                </div>
              ))}
            </div>
          </SurfacePanel>
        ) : orders.length === 0 ? (
          <SurfacePanel
            className="space-y-4"
            appearance="dark"
            accent="blue"
          >
            <StorefrontSectionHeading
              eyebrow="History"
              title="No orders yet"
              description="When purchases land, they will show up here with the same support and follow-up tools."
            />
            {emptyOrderActionCards.length > 0 ? (
              <StorefrontPathwaysGrid
                cards={emptyOrderActionCards}
                columnsClassName="md:grid-cols-2 xl:grid-cols-3"
                appearance="dark"
              />
            ) : (
              <p className="text-sm font-semibold leading-6 text-white/70">
                Billing help is available if you need it.
              </p>
            )}
          </SurfacePanel>
        ) : (
          <SurfacePanel
            id="purchase-history"
            className={panelClass}
            appearance="dark"
            accent="blue"
          >
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <StorefrontSectionHeading
                  eyebrow="History"
                  title="Purchase history"
                  description="Charges, refunds, and the next step for each purchase all stay in one feed."
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-medium text-white/55">
                  {orders.length} purchase{orders.length === 1 ? "" : "s"}{" "}
                  loaded
                </p>
                <button
                  type="button"
                  onClick={refreshOrders}
                  className={secondaryButtonClass}
                  disabled={workingId === "refresh"}
                >
                  {workingId === "refresh" ? "Refreshing..." : "Refresh"}
                </button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.03)_100%)] p-4 shadow-[0_18px_38px_rgba(8,6,20,0.18)]">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">
                  Total spent
                </div>
                <div className="mt-2 font-display text-[1.7rem] font-semibold tracking-[-0.05em] text-white">
                  {formatOrderAmount(totalSpentCents, orders[0]?.currency || "USD")}
                </div>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.03)_100%)] p-4 shadow-[0_18px_38px_rgba(8,6,20,0.18)]">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">
                  Latest charge
                </div>
                <div className="mt-2 text-sm font-semibold leading-6 text-white">
                  {latestOrderDate}
                </div>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.03)_100%)] p-4 shadow-[0_18px_38px_rgba(8,6,20,0.18)]">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">
                  Support
                </div>
                <div className="mt-2 text-sm font-semibold leading-6 text-white">
                  Report missing points or billing issues from the same page.
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {orders.map((order) => {
                const orderGuide = getCommerceJourneyGuide(order.packageId);

                return (
                  <div
                    key={order.orderId}
                    className={orderCardClass}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold tracking-[-0.02em] text-white">
                          {formatOrderPackageLabel(order.packageId)}
                        </p>
                        <p className="mt-2 text-xs font-medium text-white/55">
                          {formatOrderAmount(order.amount, order.currency)} |
                          Order ID {order.orderId}
                        </p>
                      </div>
                      <span className={subtleChipClass}>{order.status}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-white/55">
                      <span className={storefrontBadgeClass}>
                        {orderGuide.eyebrow}
                      </span>
                      <span className={subtleChipClass}>
                        Placed {formatOrderDate(order.createdAt)}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {order.status === "PAID" && refundActionsEnabled ? (
                        <button
                          type="button"
                          onClick={async () => {
                            if (!isSignedIn) {
                              router.push("/signin?returnTo=/orders");
                              return;
                            }
                            setWorkingId(order.orderId);
                            const response = await apiPost(
                              "/api/payments/refund",
                              {
                                orderId: order.orderId,
                              },
                            );
                            if (response.ok) {
                              setOrders((prev) =>
                                prev.map((item) =>
                                  item.orderId === order.orderId
                                    ? response.data?.order
                                    : item,
                                ),
                              );
                              setFeedback({
                                type: "success",
                                text: "Refund request sent.",
                              });
                            } else {
                              setFeedback({
                                type: "error",
                                text: getFriendlyMessage(
                                  response.error,
                                  response.message || "Refund request failed.",
                                ),
                              });
                            }
                            setWorkingId("");
                          }}
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] transition ${
                            workingId === order.orderId
                              ? "cursor-not-allowed border border-white/10 bg-[rgba(255,255,255,0.035)] text-white/40 shadow-none"
                              : primaryButtonClass
                          }`}
                          disabled={workingId === order.orderId}
                        >
                          {workingId === order.orderId
                            ? "Requesting..."
                            : "Request refund"}
                        </button>
                      ) : order.status === "PAID" ? (
                        <button
                          type="button"
                          onClick={() =>
                            router.push(buildSupportHref(order.orderId))
                          }
                          className={`${secondaryButtonClass} h-9 px-3 py-1.5 text-xs tracking-[0.08em]`}
                        >
                          Support
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => router.push(orderGuide.nextHref)}
                        className={`${secondaryButtonClass} h-9 px-3 py-1.5 text-xs tracking-[0.08em]`}
                      >
                        {orderGuide.nextCta}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </SurfacePanel>
        )}
      </div>
    </StorefrontPage>
  );
}
