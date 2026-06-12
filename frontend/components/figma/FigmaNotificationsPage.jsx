"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Gift, LoaderCircle, Sparkles } from "lucide-react";
import EditorialHero from "../common/EditorialHero";
import SurfacePanel from "../common/SurfacePanel";
import {
  storefrontBadgeClass,
  storefrontInfoCardClass,
  storefrontNoticeClass,
  storefrontSoftCardClass,
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
  StorefrontInfoCard,
  StorefrontSectionHeading,
} from "../common/StorefrontPagePrimitives";
import { StorefrontPage } from "../storefront/StorefrontScaffold";
import { useAdultGateStore } from "../../store/useAdultGateStore";
import { useNotificationsStore } from "../../store/useNotificationsStore";
import { buildPathWithAttribution } from "../../lib/paymentAttribution";
import FigmaChrome from "./FigmaChrome";
import { FigmaSiteProvider } from "./FigmaSiteContext";
import { buildNotificationCards, cn } from "./figma-utils";

function resolveNotificationHref(item) {
  if (item?.seriesId && item?.episodeId) {
    return buildPathWithAttribution(
      `/read/${encodeURIComponent(item.seriesId)}/${encodeURIComponent(item.episodeId)}`,
      {
        entryPoint:
          item.type === "TTF_READY"
            ? "FIGMA_NOTIFICATION_TTF"
            : "FIGMA_NOTIFICATION_EPISODE",
        sourcePath: "/notifications",
        sourceSeriesId: item.seriesId,
        sourceEpisodeId: item.episodeId,
        returnTo: "/notifications",
      },
    );
  }

  if (item?.seriesId) {
    return buildPathWithAttribution(
      `/series/${encodeURIComponent(item.seriesId)}`,
      {
        entryPoint: "FIGMA_NOTIFICATION_SERIES",
        sourcePath: "/notifications",
        sourceSeriesId: item.seriesId,
        returnTo: "/notifications",
      },
    );
  }

  if (item?.type === "PROMO" || item?.type === "SUB_VOUCHER") {
    return buildPathWithAttribution("/store", {
      entryPoint:
        item.type === "PROMO"
          ? "FIGMA_NOTIFICATION_PROMO"
          : "FIGMA_NOTIFICATION_VOUCHER",
      sourcePath: "/notifications",
      returnTo: "/notifications",
    });
  }

  return "/notifications";
}

function NotificationCard({ card, workingId, onOpen }) {
  const icon =
    card.kind === "PROMO" || card.kind === "SUB_VOUCHER"
      ? Gift
      : card.kind === "TTF_READY"
        ? Sparkles
        : Bell;
  const Icon = icon;
  const isBusy = workingId === card.id;

  return (
    <button
      type="button"
      onClick={() => onOpen(card)}
      className={cn(
        "group flex w-full items-start gap-4 rounded-[28px] border p-4 text-left shadow-[0_22px_48px_rgba(8,6,20,0.28)] transition-all duration-150 hover:-translate-y-1 hover:border-white/18 hover:bg-[rgba(255,255,255,0.075)] active:scale-[0.99] md:p-5",
        card.read
          ? "border-white/10 bg-[rgba(255,255,255,0.035)] backdrop-blur-xl"
          : "border-cyan-300/18 bg-[linear-gradient(135deg,rgba(255,79,154,0.12)_0%,rgba(86,215,255,0.12)_100%)] backdrop-blur-xl",
      )}
    >
      <div
        className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] border shadow-[0_16px_30px_rgba(8,6,20,0.22)]",
          card.kind === "PROMO" || card.kind === "SUB_VOUCHER"
            ? "border-amber-300/20 bg-amber-400/10 text-amber-200"
            : card.kind === "TTF_READY"
              ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-200"
              : "border-cyan-300/20 bg-cyan-400/10 text-cyan-100",
        )}
      >
        <Icon className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-[1.15rem] font-semibold leading-tight tracking-[-0.04em] text-white">
            {card.title}
          </h3>
          {!card.read ? (
            <span className="inline-flex items-center rounded-full border border-[rgba(255,143,195,0.28)] bg-[linear-gradient(135deg,rgba(255,79,154,0.22)_0%,rgba(124,58,237,0.18)_100%)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white shadow-[0_12px_24px_rgba(255,79,154,0.18)]">
              New
            </span>
          ) : null}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/44">
          <span className={storefrontBadgeClass}>
            {card.kind.replaceAll("_", " ")}
          </span>
          <span>{card.dateLabel || "Recent"}</span>
        </div>
        <p className="mt-2 text-sm leading-6 text-white/66">{card.body}</p>
      </div>

      <div className="shrink-0 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-white/46">
        {isBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : card.cta}
      </div>
    </button>
  );
}

function NotificationsContent() {
  const router = useRouter();
  const { isAdultMode } = useAdultGateStore();
  const { notifications, unreadCount, loadNotifications, markRead } =
    useNotificationsStore();
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState("");
  const [error, setError] = useState("");

  const cards = useMemo(
    () => buildNotificationCards(notifications),
    [notifications],
  );

  const accent = isAdultMode ? "rose" : "blue";
  const totalCount = notifications.length;
  const releaseCount = notifications.filter(
    (item) => item?.type === "EPISODE" || item?.type === "TTF_READY",
  ).length;
  const promoCount = notifications.filter(
    (item) => item?.type === "PROMO" || item?.type === "SUB_VOUCHER",
  ).length;

  const refreshInbox = useCallback(async () => {
    setLoading(true);
    setError("");
    const response = await loadNotifications(isAdultMode ? "1" : "0");
    if (!response.ok) {
      setError("Notifications failed to load.");
    }
    setLoading(false);
  }, [isAdultMode, loadNotifications]);

  useEffect(() => {
    void refreshInbox();
  }, [refreshInbox]);

  const handleOpen = async (card) => {
    const source = card?.item || null;
    if (!source) {
      return;
    }

    setWorkingId(card.id);
    if (!source.read) {
      await markRead([source.id]);
    }
    setWorkingId("");
    router.push(resolveNotificationHref(source));
  };

  const handleMarkAll = async () => {
    const unreadIds = notifications
      .filter((item) => !item.read)
      .map((item) => item.id);
    if (unreadIds.length === 0) {
      return;
    }

    setWorkingId("__all__");
    const response = await markRead(unreadIds);
    if (!response.ok) {
      setError("Mark all read failed.");
    }
    setWorkingId("");
  };

  return (
    <StorefrontPage accentClass="from-[rgba(82,188,255,0.12)] via-[rgba(167,139,250,0.08)] to-[rgba(255,87,166,0.1)]">
      <FigmaChrome>
        <div className="flex flex-col gap-8">
          <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
            <EditorialHero
              accent={accent}
              appearance="dark"
              eyebrow="Inbox"
              title="Everything worth opening lands here first."
              description="Episode drops, time-to-free unlocks, and store prompts all stay in one reading lane so the jump back into the catalog remains fast."
              secondary={isAdultMode ? "18+ mode active" : "Standard mode active"}
              stats={[
                {
                  label: "Unread",
                  value: String(unreadCount),
                  hint: unreadCount > 0 ? "Waiting for a tap." : "All clear.",
                },
                {
                  label: "Total feed",
                  value: String(totalCount),
                  hint: "Current inbox volume.",
                },
                {
                  label: "Reading alerts",
                  value: String(releaseCount),
                  hint: "Episode and unlock notices.",
                },
              ]}
              actions={
                <>
                  <button
                    type="button"
                    onClick={() => void refreshInbox()}
                    className={storefrontSecondaryButtonClass}
                  >
                    Refresh
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleMarkAll()}
                    disabled={workingId === "__all__" || unreadCount === 0}
                    className={`${storefrontPrimaryButtonClass} disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    {workingId === "__all__" ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCheck className="h-4 w-4" />
                    )}
                    Mark all read
                  </button>
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
                eyebrow="Queue Health"
                title="One feed for reading, promo, and entitlement updates"
                description="The notification system still uses the current data source and routing. Only the storefront shell changed."
              />

              <div className="grid gap-3">
                <div className={storefrontInfoCardClass}>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/50">
                    Current lane
                  </p>
                  <p className="mt-2 font-display text-[1.45rem] font-semibold tracking-[-0.04em] text-white">
                    {isAdultMode ? "Mature feed context" : "Core feed context"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/64">
                    The inbox refreshes against the active mode, so content
                    visibility stays consistent with the existing gate logic.
                  </p>
                </div>

                <div className={storefrontInfoCardClass}>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/50">
                    Promo signals
                  </p>
                  <p className="mt-2 font-display text-[1.45rem] font-semibold tracking-[-0.04em] text-white">
                    {promoCount}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/64">
                    Store nudges and voucher messages keep their original jump
                    paths into the live store route.
                  </p>
                </div>
              </div>

              {error ? <p className={storefrontNoticeClass}>{error}</p> : null}
            </SurfacePanel>
          </section>

          <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <SurfacePanel
              tone="muted"
              accent={accent}
              appearance="dark"
              className="space-y-5"
            >
              <StorefrontSectionHeading
                eyebrow="Live Feed"
                title="Notifications are grouped into a single reading lane"
                description="Unread states, mark-all behavior, and destination routing still use the existing store and reader logic."
              />

              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={`notification-skeleton-${index}`}
                      className="h-28 animate-pulse rounded-[28px] border border-white/10 bg-[rgba(255,255,255,0.035)] shadow-[0_18px_36px_rgba(8,6,20,0.22)]"
                    />
                  ))}
                </div>
              ) : cards.length > 0 ? (
                <div className="space-y-4">
                  {cards.map((card) => (
                    <NotificationCard
                      key={card.id}
                      card={card}
                      workingId={workingId}
                      onOpen={handleOpen}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-[28px] border border-white/10 bg-[rgba(255,255,255,0.035)] px-6 py-10 text-center shadow-[0_18px_36px_rgba(8,6,20,0.22)]">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-[rgba(255,255,255,0.035)] shadow-[0_14px_28px_rgba(8,6,20,0.18)]">
                    <Bell className="h-8 w-8 text-white/46" />
                  </div>
                  <h2 className="mt-5 font-display text-[2rem] font-semibold tracking-[-0.04em] text-white">
                    Inbox cleared
                  </h2>
                  <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/62">
                    No new alerts right now. When another release, unlock, or
                    promo hits the backend, it will surface here.
                  </p>
                </div>
              )}
            </SurfacePanel>

            <div className="grid gap-4">
              <StorefrontInfoCard
                eyebrow="Signal Types"
                title="What flows through this inbox"
                description="This page stays wired to the same notification payloads. The visual system is now aligned with the rest of the storefront."
              >
                <div className="mt-4 grid gap-3">
                  <div className={`${storefrontSoftCardClass} px-4 py-3 text-sm text-white/68`}>
                    Episode drops and branch continuations
                  </div>
                  <div className={`${storefrontSoftCardClass} px-4 py-3 text-sm text-white/68`}>
                    Promo pushes and subscription vouchers
                  </div>
                  <div className={`${storefrontSoftCardClass} px-4 py-3 text-sm text-white/68`}>
                    Time-to-free unlock reminders
                  </div>
                </div>
              </StorefrontInfoCard>

              <StorefrontInfoCard
                eyebrow="Return Path"
                title="Every notification keeps the fast jump intact"
                description="Reader alerts return to chapters, series notices reopen detail pages, and promo alerts still point at the existing store route."
              />
            </div>
          </section>
        </div>
      </FigmaChrome>
    </StorefrontPage>
  );
}

export default function FigmaNotificationsPage() {
  return (
    <FigmaSiteProvider>
      <NotificationsContent />
    </FigmaSiteProvider>
  );
}
