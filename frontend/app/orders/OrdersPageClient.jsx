"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import SiteHeader from "../../components/layout/SiteHeader";
import EditorialHero from "../../components/common/EditorialHero";
import SurfacePanel from "../../components/common/SurfacePanel";
import CommerceSuccessBanner from "../../components/common/CommerceSuccessBanner";
import StorefrontPathwaysGrid from "../../components/common/StorefrontPathwaysGrid";
import { apiGet, apiPost } from "../../lib/apiClient";
import { getFriendlyMessage } from "../../lib/errorMessages";
import { formatUSDisplayCurrency } from "../../lib/localization";
import { useAuthStore } from "../../store/useAuthStore";
import { buildPathWithAttribution } from "../../lib/paymentAttribution";
import {
  consumeCommerceSuccessForPath,
  getCommerceSuccessPresentation,
} from "../../lib/commerceSuccess";
import { getCommerceJourneyGuide, STOREFRONT_TERMS } from "../../lib/storefrontCopy";
import { buildSupportPath } from "../../lib/supportRouting";

function formatOrderAmount(amount, currency) {
  const numericAmount = Number(amount || 0);
  return formatUSDisplayCurrency(numericAmount, currency);
}

function formatOrderDate(value) {
  if (!value) {
    return "Date unavailable";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatLabelWord(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) {
    return "";
  }
  if (normalized === "vip") {
    return "VIP";
  }
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function normalizePackageId(value) {
  return String(value || "").trim().toLowerCase();
}

function isMembershipCharge(packageId) {
  const normalized = normalizePackageId(packageId);
  return normalized.startsWith("subscribe_") || ["basic", "pro", "vip"].includes(normalized);
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
    return `${label} membership`;
  }

  if (["basic", "pro", "vip"].includes(normalized)) {
    return `${formatLabelWord(normalized)} membership`;
  }

  return normalized
    .split(/[_-]+/)
    .map(formatLabelWord)
    .join(" ");
}

function buildSupportHref(orderId, topic = "billing") {
  return buildSupportPath({
    topic,
    orderId,
    context: orderId ? `Purchase issue for ${orderId}` : "Purchase or billing question",
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
    setCommerceNotice(getCommerceSuccessPresentation(consumeCommerceSuccessForPath("/orders")));
  }, []);

  const refundActionsEnabled = billingAvailability?.refundActionsEnabled === true;
  const refundPreviewOnly = billingAvailability?.refundActionsEnabled === false;
  const latestPaidOrder = useMemo(
    () => orders.find((order) => order.status === "PAID") || null,
    [orders],
  );
  const latestMembershipOrder = useMemo(
    () => orders.find((order) => order.status === "PAID" && isMembershipCharge(order.packageId)) || null,
    [orders],
  );
  const scrollToSection = useCallback((id) => {
    if (typeof document === "undefined") {
      return;
    }
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
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
        text: getFriendlyMessage(response.error, response.message || "Refresh failed."),
      });
    }
    setWorkingId("");
  }, [signInToOrders, viewerSignedIn]);
  const signedOutActionCards = useMemo(
    () => [
      {
        id: "signin",
        eyebrow: "Account",
        title: "Sign in and keep every receipt on one account.",
        description: "Receipts, membership charges, and order IDs land here after checkout.",
        cta: "Sign in",
        onClick: () => router.push("/signin?returnTo=/orders"),
        accentClass:
          "border-[rgba(47,107,255,0.14)] bg-[rgba(47,107,255,0.08)] text-slate-900 hover:border-[rgba(47,107,255,0.2)] hover:bg-[rgba(47,107,255,0.12)]",
      },
      {
        id: "support",
        eyebrow: "Billing help",
        title: "Get help with a missing receipt or wrong charge.",
        description: "Use Support when a charge or receipt needs review.",
        cta: "Get billing help",
        onClick: () => router.push(buildSupportHref("", "billing")),
        accentClass:
          "border-black/8 bg-white text-slate-900 hover:border-black/12 hover:bg-[#f8f9fc]",
      },
    ],
    [router],
  );
  const emptyOrderActionCards = useMemo(
    () => [
      {
        id: "packs",
        eyebrow: "Point packs",
        title: "Buy a pack when you only need flexible unlocks.",
        description: "Point packs are the one-time option.",
        cta: STOREFRONT_TERMS.viewPointPacks,
        onClick: () => router.push("/store"),
        accentClass:
          "border-[rgba(47,107,255,0.14)] bg-[rgba(47,107,255,0.08)] text-slate-900 hover:border-[rgba(47,107,255,0.2)] hover:bg-[rgba(47,107,255,0.12)]",
      },
      {
        id: "membership",
        eyebrow: "Membership",
        title: "View monthly plans before your first checkout.",
        description: "Membership may fit better if you read often.",
        cta: STOREFRONT_TERMS.compareMembership,
        onClick: () =>
          router.push(
            buildPathWithAttribution("/subscribe", {
              entryPoint: "ORDERS_EMPTY_STATE",
              sourcePath: "/orders",
              returnTo: "/orders",
            }),
          ),
        accentClass:
          "border-black/8 bg-white text-slate-900 hover:border-black/12 hover:bg-[#f8f9fc]",
      },
      {
        id: "support",
        eyebrow: "Billing help",
        title: "Know where to go if the first charge looks wrong.",
        description: "Billing help stays available right away.",
        cta: "Get billing help",
        onClick: () => router.push(buildSupportHref("", "billing")),
        accentClass:
          "border-black/8 bg-white text-slate-900 hover:border-black/12 hover:bg-[#f8f9fc]",
      },
    ],
    [router],
  );

  const billingTaskCards = useMemo(
    () => [
      {
        id: "receipt",
        eyebrow: "Receipts",
        title: viewerSignedIn
          ? latestPaidOrder
            ? "View receipts and order IDs."
            : orders.length > 0
              ? "Open receipts as soon as they land."
              : "Your first receipt will land here."
          : "Sign in to keep receipts on one account.",
        description: viewerSignedIn
          ? latestPaidOrder
            ? `Latest receipt: ${latestPaidOrder.orderId}. Use the order ID when a charge, receipt, or points balance needs a closer look.`
            : "Recent charges and order IDs appear here after checkout."
          : "Receipts, renewals, and order IDs stay on your account after checkout.",
        cta: viewerSignedIn ? "View receipts" : "Sign in",
        onClick: viewerSignedIn ? () => scrollToSection("purchase-history") : signInToOrders,
        accentClass:
          "border-[rgba(47,107,255,0.14)] bg-[rgba(47,107,255,0.08)] text-slate-900 hover:border-[rgba(47,107,255,0.2)] hover:bg-[rgba(47,107,255,0.12)]",
      },
      {
        id: "membership-charges",
        eyebrow: "Membership charges",
        title: latestMembershipOrder
          ? "Membership charges stay in the same purchase history."
          : viewerSignedIn
            ? "Membership charges will show up here too."
            : "Membership charges land here after checkout.",
        description: latestMembershipOrder
          ? `${formatOrderPackageLabel(latestMembershipOrder.packageId)} was charged on ${formatOrderDate(latestMembershipOrder.createdAt)} for ${formatOrderAmount(latestMembershipOrder.amount, latestMembershipOrder.currency)}.`
          : viewerSignedIn
            ? "Membership receipts appear here alongside point-pack purchases."
            : "Membership renewals and receipts stay in Purchases too.",
        cta: latestMembershipOrder ? "See membership charges" : STOREFRONT_TERMS.compareMembership,
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
        accentClass:
          "border-black/8 bg-white text-slate-900 hover:border-black/12 hover:bg-[#f8f9fc]",
      },
      {
        id: "purchase-issue",
        eyebrow: "Missing points?",
        title: latestPaidOrder
          ? "Report a wrong charge, refund issue, or missing points."
          : "Need billing help before or after checkout?",
        description: refundActionsEnabled
          ? "Refund-eligible purchases can still be requested here."
          : "Use billing help for missing receipts, missing points, or wrong charges.",
        cta: "Get billing help",
        onClick: () => router.push(buildSupportHref(latestPaidOrder?.orderId)),
        accentClass:
          "border-black/8 bg-white text-slate-900 hover:border-black/12 hover:bg-[#f8f9fc]",
      },
    ],
    [
      latestMembershipOrder,
      latestPaidOrder,
      orders.length,
      refundActionsEnabled,
      router,
      scrollToSection,
      signInToOrders,
      viewerSignedIn,
    ],
  );

  const secondaryButtonClass =
    "rounded-full border border-black/8 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[#f8f9fc] disabled:cursor-not-allowed disabled:opacity-50";
  const primaryButtonClass =
    "rounded-full bg-slate-950 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50";
  const heroPrimaryButtonClass =
    "h-11 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800";
  const heroSecondaryButtonClass =
    "h-11 rounded-full border border-black/8 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[#f8f9fc]";

  return (
    <div className="gush-page-shell">
      <div className="gush-page-ambient" />
      <SiteHeader variant="light" />
      <main className="gush-page-main gush-section-stack">
        <EditorialHero
          appearance="light"
          accent="blue"
          eyebrow="Orders"
          title={
            viewerSignedIn
              ? "Receipts and billing."
              : "Billing history lives here after sign-in."
          }
          description={
            viewerSignedIn
              ? "Open receipts fast and fix charge issues from one place."
              : "Sign in to see receipts and billing history."
          }
          actions={
            viewerSignedIn ? (
              <>
                <button
                  type="button"
                  onClick={() => scrollToSection("purchase-history")}
                  className={heroPrimaryButtonClass}
                >
                  View receipts
                </button>
                <button
                  type="button"
                  onClick={() => router.push(buildSupportHref(latestPaidOrder?.orderId))}
                  className={heroSecondaryButtonClass}
                >
                  Get billing help
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={signInToOrders}
                  className={heroPrimaryButtonClass}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => router.push(buildSupportHref("", "billing"))}
                  className={heroSecondaryButtonClass}
                >
                  Get billing help
                </button>
              </>
            )
          }
        />

        {commerceNotice ? (
          <CommerceSuccessBanner
            notice={commerceNotice}
            onDismiss={() => setCommerceNotice(null)}
          />
        ) : null}

        {feedback.text ? (
          <SurfacePanel
            appearance="light"
            accent={feedback.type === "error" ? "rose" : "blue"}
            className={
              feedback.type === "error"
                ? "border border-red-200 bg-red-50 text-red-600"
                : "border border-[rgba(47,107,255,0.14)] bg-[rgba(47,107,255,0.08)] text-slate-700"
            }
          >
            <p className={`text-sm ${feedback.type === "error" ? "text-red-600" : "text-slate-700"}`}>{feedback.text}</p>
          </SurfacePanel>
        ) : null}

        {viewerSignedIn && refundPreviewOnly ? (
          <SurfacePanel className="border border-amber-200 bg-amber-50 text-amber-700" appearance="light" tone="warning" accent="amber">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold">Need help with a charge?</p>
                <p className="text-sm text-amber-700/85">
                  You can still review purchases here. Include the order ID if something looks off.
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.push(buildSupportHref(latestPaidOrder?.orderId))}
                className={secondaryButtonClass}
              >
                Get billing help
              </button>
            </div>
          </SurfacePanel>
        ) : null}

        {viewerSignedIn && hydrated ? (
          <>
            <SurfacePanel className="space-y-5" appearance="light" accent="blue">
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                  Billing tasks
                </p>
                <h2 className="font-display text-2xl font-semibold tracking-tight text-slate-950">
                  Find the receipt or get help.
                </h2>
              </div>
              <StorefrontPathwaysGrid
                cards={billingTaskCards}
                columnsClassName="md:grid-cols-2 xl:grid-cols-3"
                appearance="light"
              />
            </SurfacePanel>
          </>
        ) : null}

        {!viewerSignedIn ? (
            <SurfacePanel className="space-y-4" appearance="light" accent="blue">
              <h2 className="font-display text-2xl font-semibold tracking-tight text-slate-950">
                Sign in to see receipts and billing history.
              </h2>
              <p className="text-sm leading-6 text-slate-600">
                This page becomes your billing center after sign-in.
              </p>
            <StorefrontPathwaysGrid
              cards={signedOutActionCards}
              columnsClassName="md:grid-cols-2"
              appearance="light"
            />
          </SurfacePanel>
        ) : !hydrated || loading ? (
          <SurfacePanel className="space-y-5" appearance="light" accent="blue">
            <div className="space-y-2">
              <div className="h-4 w-28 animate-pulse rounded-full bg-slate-200" aria-hidden="true" />
              <div className="h-9 w-72 animate-pulse rounded-2xl bg-slate-200" aria-hidden="true" />
              <div className="h-4 w-full max-w-2xl animate-pulse rounded-full bg-slate-200" aria-hidden="true" />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-[24px] border border-black/8 bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]"
                  aria-hidden="true"
                >
                  <div className="h-4 w-24 animate-pulse rounded-full bg-slate-200" />
                  <div className="mt-4 h-6 w-40 animate-pulse rounded-2xl bg-slate-200" />
                  <div className="mt-4 h-3 w-full animate-pulse rounded-full bg-slate-100" />
                </div>
              ))}
            </div>
          </SurfacePanel>
        ) : orders.length === 0 ? (
            <SurfacePanel className="space-y-4" appearance="light" accent="blue">
              <h2 className="font-display text-2xl font-semibold tracking-tight text-slate-950">
                No purchases yet.
              </h2>
              <p className="text-sm leading-6 text-slate-600">
                Purchases appear here after checkout.
              </p>
            <StorefrontPathwaysGrid
              cards={emptyOrderActionCards}
              columnsClassName="md:grid-cols-2 xl:grid-cols-3"
              appearance="light"
            />
          </SurfacePanel>
        ) : (
          <SurfacePanel id="purchase-history" className="space-y-5" appearance="light" accent="blue">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                  Receipts and charges
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                  Purchase history
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs text-slate-500">{orders.length} purchase{orders.length === 1 ? "" : "s"} loaded</p>
                <button
                  type="button"
                  onClick={refreshOrders}
                  className={secondaryButtonClass}
                  disabled={workingId === "refresh"}
                >
                  {workingId === "refresh" ? "Refreshing..." : "Refresh purchases"}
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {orders.map((order) => {
                const orderGuide = getCommerceJourneyGuide(order.packageId);

                return (
                  <div
                    key={order.orderId}
                    className="rounded-[24px] border border-black/8 bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">{formatOrderPackageLabel(order.packageId)}</p>
                        <p className="mt-2 text-xs text-slate-500">
                          {formatOrderAmount(order.amount, order.currency)} | Order ID {order.orderId}
                        </p>
                      </div>
                      <span className="rounded-full border border-black/8 bg-[#f8f9fc] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-600">
                        {order.status}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500">
                      <span className="rounded-full border border-black/8 bg-[#f8f9fc] px-3 py-1">
                        {orderGuide.eyebrow}
                      </span>
                      <span className="rounded-full border border-black/8 bg-[#f8f9fc] px-3 py-1">
                        Placed {formatOrderDate(order.createdAt)}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{orderGuide.description}</p>
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
                            const response = await apiPost("/api/payments/refund", {
                              orderId: order.orderId,
                            });
                            if (response.ok) {
                              setOrders((prev) =>
                                prev.map((item) =>
                                  item.orderId === order.orderId ? response.data?.order : item,
                                ),
                              );
                              setFeedback({ type: "success", text: "Refund request sent." });
                            } else {
                              setFeedback({
                                type: "error",
                                text: getFriendlyMessage(response.error, response.message || "Refund request failed."),
                              });
                            }
                            setWorkingId("");
                          }}
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                            workingId === order.orderId
                              ? "cursor-not-allowed bg-slate-300 text-slate-500"
                              : "bg-slate-950 text-white hover:bg-slate-800"
                          }`}
                          disabled={workingId === order.orderId}
                        >
                          {workingId === order.orderId ? "Requesting..." : "Request refund"}
                        </button>
                      ) : order.status === "PAID" ? (
                      <button
                        type="button"
                        onClick={() => router.push(buildSupportHref(order.orderId))}
                        className="rounded-full border border-black/8 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[#f8f9fc]"
                      >
                        Get billing help
                      </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => router.push(orderGuide.nextHref)}
                        className="rounded-full border border-black/8 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[#f8f9fc]"
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
      </main>
    </div>
  );
}
