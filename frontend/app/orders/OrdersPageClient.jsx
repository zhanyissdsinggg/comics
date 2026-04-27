"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import SiteHeader from "../../components/layout/SiteHeader";
import EditorialHero from "../../components/common/EditorialHero";
import SurfacePanel from "../../components/common/SurfacePanel";
import CommerceSuccessBanner from "../../components/common/CommerceSuccessBanner";
import StorefrontPathwaysGrid from "../../components/common/StorefrontPathwaysGrid";
import {
  StorefrontDesk,
  StorefrontSectionHeading,
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
} from "../../components/common/StorefrontPagePrimitives";
import { apiGet, apiPost } from "../../lib/apiClient";
import { getFriendlyMessage } from "../../lib/errorMessages";
import { formatUSDisplayCurrencyFromCents } from "../../lib/localization";
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

function formatOrderAmount(amount, currency) {
  const numericAmount = Number(amount || 0);
  return formatUSDisplayCurrencyFromCents(numericAmount, currency);
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
    return `${label} membership`;
  }

  if (["basic", "pro", "vip"].includes(normalized)) {
    return `${formatLabelWord(normalized)} membership`;
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
    "border border-black/10 bg-[linear-gradient(180deg,#ffffff_0%,#fbfcfd_100%)] text-black shadow-[0_18px_36px_rgba(15,23,42,0.08)] hover:border-black/14 hover:bg-white";
  const actionCardSecondaryClass =
    "border border-black/10 bg-white text-black shadow-[0_16px_32px_rgba(15,23,42,0.07)] hover:border-black/14 hover:bg-[#fcfcfd]";
  const subtleChipClass =
    "rounded-full border border-black/10 bg-[#f6f7f9] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/70";
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
        title: "Sign in.",
        cta: "Sign in",
        onClick: () => router.push("/signin?returnTo=/orders"),
        accentClass: actionCardPrimaryClass,
      },
      {
        id: "support",
        eyebrow: "Billing",
        title: "Support.",
        cta: "Support",
        onClick: () => router.push(buildSupportHref("", "billing")),
        accentClass: actionCardSecondaryClass,
      },
    ],
    [actionCardPrimaryClass, actionCardSecondaryClass, router],
  );
  const emptyOrderActionCards = useMemo(
    () => [
      {
        id: "packs",
        eyebrow: "Point packs",
        title: "Point packs.",
        cta: STOREFRONT_TERMS.viewPointPacks,
        onClick: () => router.push("/store"),
        accentClass: actionCardPrimaryClass,
      },
      {
        id: "membership",
        eyebrow: "Membership",
        title: "Membership.",
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
      {
        id: "support",
        eyebrow: "Billing",
        title: "Support.",
        cta: "Support",
        onClick: () => router.push(buildSupportHref("", "billing")),
        accentClass: actionCardSecondaryClass,
      },
    ],
    [actionCardPrimaryClass, actionCardSecondaryClass, router],
  );

  const billingTaskCards = useMemo(
    () => [
      {
        id: "receipt",
        eyebrow: "Receipts",
        title: viewerSignedIn
          ? latestPaidOrder
            ? "Receipts."
            : orders.length > 0
              ? "Receipts."
              : "Receipts."
          : "Sign in.",
        description: "",
        cta: viewerSignedIn ? "Receipts" : "Sign in",
        onClick: viewerSignedIn
          ? () => scrollToSection("purchase-history")
          : signInToOrders,
        accentClass: actionCardPrimaryClass,
      },
      {
        id: "membership-charges",
        eyebrow: "Membership",
        title: "Membership.",
        description: "",
        cta: latestMembershipOrder
          ? "See membership charges"
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
      {
        id: "purchase-issue",
        eyebrow: "Missing points?",
        title: latestPaidOrder ? "Report a charge." : "Support.",
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
      orders.length,
      refundActionsEnabled,
      router,
      scrollToSection,
      signInToOrders,
      viewerSignedIn,
    ],
  );

  return (
    <div className="min-h-screen overflow-hidden bg-black text-white">
      <SiteHeader variant="home" />
      <main className="mx-auto flex max-w-[1320px] flex-col gap-8 px-4 py-8 md:px-8 md:py-10">
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <EditorialHero
            appearance="light"
            accent="blue"
            eyebrow="Orders"
            title={viewerSignedIn ? "Orders." : "Sign in."}
            description={
              viewerSignedIn
                ? ""
                : ""
            }
          />

          <StorefrontDesk
            eyebrow="Desk"
            title={viewerSignedIn ? "Receipts." : "Sign in."}
            actions={
              viewerSignedIn ? (
                <>
                  <button
                    type="button"
                    onClick={() => scrollToSection("purchase-history")}
                    className={primaryButtonClass}
                  >
                    Receipts
                  </button>
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
            appearance="light"
            accent={feedback.type === "error" ? "rose" : "amber"}
            className={
              feedback.type === "error"
                ? "border border-rose-200/80 bg-[linear-gradient(180deg,#fff8fa_0%,#fff2f5_100%)] text-[#8f003f] shadow-[0_16px_34px_rgba(244,63,94,0.08)]"
                : "border border-amber-200/80 bg-[linear-gradient(180deg,#fffdf8_0%,#fff7eb_100%)] text-black shadow-[0_16px_34px_rgba(245,158,11,0.08)]"
            }
          >
            <p
              className={`text-sm font-medium ${feedback.type === "error" ? "text-[#8f003f]" : "text-black/78"}`}
            >
              {feedback.text}
            </p>
          </SurfacePanel>
        ) : null}

        {viewerSignedIn && refundPreviewOnly ? (
          <SurfacePanel
            className="border border-amber-200/80 bg-[linear-gradient(180deg,#fffdf8_0%,#fff7eb_100%)] text-black shadow-[0_18px_34px_rgba(245,158,11,0.08)]"
            appearance="light"
            tone="warning"
            accent="blue"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-black uppercase tracking-[0.03em]">
                        Charge issue?
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
              className="space-y-5"
              appearance="light"
              accent="blue"
            >
              <div className="space-y-2">
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-black/55">
                  Tasks
                </p>
                <h2 className="text-2xl font-black uppercase tracking-[-0.05em] text-black">
                  Orders.
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
              <StorefrontSectionHeading title="Receipts." />
              <StorefrontSectionHeading title="Sign in." />
            <StorefrontPathwaysGrid
              cards={signedOutActionCards}
              columnsClassName="md:grid-cols-2"
              appearance="light"
            />
          </SurfacePanel>
        ) : !hydrated || loading ? (
          <SurfacePanel className="space-y-5" appearance="light" accent="blue">
            <div className="space-y-2">
              <div
                className="h-4 w-28 animate-pulse rounded-full bg-slate-200"
                aria-hidden="true"
              />
              <div
                className="h-9 w-72 animate-pulse rounded-2xl bg-slate-200"
                aria-hidden="true"
              />
              <div
                className="h-4 w-full max-w-2xl animate-pulse rounded-full bg-slate-200"
                aria-hidden="true"
              />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-[24px] border border-black/10 bg-white p-4 shadow-[0_14px_28px_rgba(15,23,42,0.06)]"
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
            <StorefrontSectionHeading
              title="No orders yet."
              description=""
            />
            <StorefrontPathwaysGrid
              cards={emptyOrderActionCards}
              columnsClassName="md:grid-cols-2 xl:grid-cols-3"
              appearance="light"
            />
          </SurfacePanel>
        ) : (
          <SurfacePanel
            id="purchase-history"
            className="space-y-5"
            appearance="light"
            accent="blue"
          >
            <div className="flex flex-wrap items-end justify-between gap-4">
              <StorefrontSectionHeading
                eyebrow="History"
                title="Purchase history"
              />
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-medium text-black/58">
                  {orders.length} purchase{orders.length === 1 ? "" : "s"}{" "}
                  loaded
                </p>
                <button
                  type="button"
                  onClick={refreshOrders}
                  className={secondaryButtonClass}
                  disabled={workingId === "refresh"}
                >
                  {workingId === "refresh"
                    ? "Refreshing..."
                    : "Refresh"}
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {orders.map((order) => {
                const orderGuide = getCommerceJourneyGuide(order.packageId);

                return (
                  <div
                    key={order.orderId}
                    className="rounded-[26px] border border-black/10 bg-white p-4 shadow-[0_18px_38px_rgba(15,23,42,0.07)] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-black/14 hover:shadow-[0_22px_42px_rgba(15,23,42,0.1)]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-black uppercase tracking-[-0.02em] text-black">
                          {formatOrderPackageLabel(order.packageId)}
                        </p>
                        <p className="mt-2 text-xs font-medium text-black/58">
                          {formatOrderAmount(order.amount, order.currency)} |
                          Order ID {order.orderId}
                        </p>
                      </div>
                      <span className={subtleChipClass}>
                        {order.status}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-black/58">
                      <span className="rounded-full border border-sky-200/80 bg-sky-50 px-3 py-1 font-semibold uppercase tracking-[0.12em] text-sky-900">
                        {orderGuide.eyebrow}
                      </span>
                      <span className="rounded-full border border-black/10 bg-[#f6f7f9] px-3 py-1 font-semibold uppercase tracking-[0.12em] text-black/65">
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
                              ? "cursor-not-allowed border border-black/10 bg-slate-200 text-black/45 shadow-none"
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
      </main>
    </div>
  );
}
