"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import EditorialHero from "../../components/common/EditorialHero";
import SurfacePanel from "../../components/common/SurfacePanel";
import {
  StorefrontDesk,
  StorefrontSectionHeading,
  storefrontBadgeClass,
  storefrontNoticeClass,
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
} from "../../components/common/StorefrontPagePrimitives";
import NotificationList from "../../components/notifications/NotificationList";
import { useNotificationsStore } from "../../store/useNotificationsStore";
import { useAdultGateStore } from "../../store/useAdultGateStore";
import { trackEvent } from "../../lib/trackEvent";
import { buildPathWithAttribution } from "../../lib/paymentAttribution";

export default function NotificationsPage() {
  const router = useRouter();
  const { notifications, unreadCount, loadNotifications, markRead } =
    useNotificationsStore();
  const { isAdultMode } = useAdultGateStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [workingId, setWorkingId] = useState(null);

  const loadInbox = useCallback(() => {
    setLoading(true);
    setError(null);
    return loadNotifications(isAdultMode ? "1" : "0")
      .then((response) => {
        if (!response.ok) {
          setError("LOAD_ERROR");
        }
      })
      .finally(() => setLoading(false));
  }, [isAdultMode, loadNotifications]);

  useEffect(() => {
    trackEvent("view_notifications", {});
    loadInbox();
  }, [loadInbox]);

  const handleMarkRead = async (notificationId) => {
    setError(null);
    setWorkingId(notificationId);
    const response = await markRead([notificationId]);
    if (!response.ok) {
      setError("MARK_ERROR");
    }
    setWorkingId(null);
  };

  const handleMarkAllRead = async () => {
    const unreadIds = notifications
      .filter((item) => !item.read)
      .map((item) => item.id);
    if (unreadIds.length === 0) {
      return;
    }

    setError(null);
    setWorkingId("__all__");
    const response = await markRead(unreadIds);
    if (!response.ok) {
      setError("MARK_ERROR");
    }
    setWorkingId(null);
  };

  const handleNavigate = useCallback(
    (item) => {
      if (!item) {
        return;
      }

      if (item.seriesId && item.episodeId) {
        const targetPath = `/read/${item.seriesId}/${item.episodeId}`;
        router.push(
          buildPathWithAttribution(targetPath, {
            entryPoint:
              item.type === "TTF_READY"
                ? "NOTIFICATION_TTF_READY"
                : "NOTIFICATION_EPISODE",
            sourcePath: "/notifications",
            sourceSeriesId: item.seriesId,
            sourceEpisodeId: item.episodeId,
            returnTo: targetPath,
          }),
        );
        return;
      }

      if (item.seriesId) {
        const targetPath = `/series/${item.seriesId}`;
        router.push(
          buildPathWithAttribution(targetPath, {
            entryPoint: "NOTIFICATION_SERIES",
            sourcePath: "/notifications",
            sourceSeriesId: item.seriesId,
            returnTo: targetPath,
          }),
        );
        return;
      }

      if (item.type === "PROMO" || item.type === "SUB_VOUCHER") {
        const ctaType = item.ctaType || "STORE";
        const target = item.ctaTarget || "";
        const promotionId =
          item.type === "PROMO" &&
          typeof item.id === "string" &&
          item.id.startsWith("PROMO_")
            ? item.id.replace(/^PROMO_/, "")
            : undefined;
        const attribution = {
          promotionId,
          entryPoint:
            item.type === "PROMO"
              ? "NOTIFICATION_PROMO"
              : "NOTIFICATION_SUB_VOUCHER",
          sourcePath: "/notifications",
          returnTo: "/notifications",
        };

        if (ctaType === "SUBSCRIBE") {
          router.push(buildPathWithAttribution("/subscribe", attribution));
          return;
        }
        if (ctaType === "SERIES" && target) {
          const targetPath = `/series/${target}`;
          router.push(
            buildPathWithAttribution(targetPath, {
              ...attribution,
              sourceSeriesId: target,
              returnTo: targetPath,
            }),
          );
          return;
        }
        if (ctaType === "READ" && target) {
          const [seriesId, episodeId] = target.split("/");
          if (seriesId && episodeId) {
            const targetPath = `/read/${seriesId}/${episodeId}`;
            router.push(
              buildPathWithAttribution(targetPath, {
                ...attribution,
                sourceSeriesId: seriesId,
                sourceEpisodeId: episodeId,
                returnTo: targetPath,
              }),
            );
            return;
          }
        }
        if (ctaType === "URL" && target) {
          window.location.href = target;
          return;
        }
        router.push(
          buildPathWithAttribution("/store", attribution, { focus: "auto" }),
        );
      }
    },
    [router],
  );

  const notificationStats = useMemo(() => {
    const total = notifications.length;
    const promo = notifications.filter(
      (item) => item.type === "PROMO" || item.type === "SUB_VOUCHER",
    ).length;
    const episodes = notifications.filter(
      (item) => item.type === "NEW_EPISODE" || item.type === "TTF_READY",
    ).length;

    return [
      {
        label: "Unread",
        value: loading ? "--" : unreadCount.toLocaleString(),
        hint: "",
      },
      {
        label: "Chapters",
        value: loading ? "--" : episodes.toLocaleString(),
        hint: "",
      },
      {
        label: "Offers",
        value: loading ? "--" : promo.toLocaleString(),
        hint: "",
      },
      {
        label: "Total",
        value: loading ? "--" : total.toLocaleString(),
        hint: "",
      },
    ];
  }, [loading, notifications, unreadCount]);

  const inboxDeskTitle = loading
    ? "Inbox"
    : unreadCount > 0
      ? "Inbox"
      : "Inbox";

  return (
    <div className="min-h-screen overflow-hidden bg-[linear-gradient(180deg,#0f0d13_0%,#130f18_44%,#17131d_100%)] text-white">
      <main className="mx-auto flex max-w-[1320px] flex-col gap-8 px-4 py-8 md:px-8 md:py-10">
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <EditorialHero
            appearance="dark"
            accent="blue"
            eyebrow="Notifications"
            title="Inbox."
            description=""
            secondary=""
            stats={notificationStats}
            actions={
              <>
                <button
                  type="button"
                  onClick={() => router.push("/library")}
                  className={storefrontPrimaryButtonClass}
                  data-testid="notifications-go-library"
                >
                  Open Library
                </button>
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  disabled={
                    loading || unreadCount === 0 || workingId === "__all__"
                  }
                  className={`${storefrontSecondaryButtonClass} disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {workingId === "__all__" ? "Saving..." : "Mark read"}
                </button>
              </>
            }
          />

          <StorefrontDesk
            eyebrow="Inbox"
            title={inboxDeskTitle}
            description=""
            actions={
              <>
                <button
                  type="button"
                  onClick={() => router.push("/library")}
                  className={storefrontPrimaryButtonClass}
                  data-testid="notifications-go-library"
                >
                  Open Library
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/search")}
                  className={storefrontSecondaryButtonClass}
                >
                  Search
                </button>
              </>
            }
          />
        </section>

        {loading ? (
          <SurfacePanel className="space-y-5" appearance="dark" accent="blue">
            <div className="space-y-2">
              <p className={storefrontBadgeClass} aria-hidden="true">
                Inbox
              </p>
              <div
                className="h-9 w-64 animate-pulse rounded-2xl bg-white/20"
                aria-hidden="true"
              />
              <div
                className="h-4 w-full max-w-2xl animate-pulse rounded-full bg-white/15"
                aria-hidden="true"
              />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-[24px] border border-white/10 bg-[rgba(255,255,255,0.03)] p-4 shadow-[0_18px_44px_rgba(8,6,20,0.22)]"
                  aria-hidden="true"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="h-5 w-1/2 animate-pulse rounded-2xl bg-white/20" />
                      <div className="h-4 w-full animate-pulse rounded-full bg-white/15" />
                      <div className="h-4 w-2/3 animate-pulse rounded-full bg-white/15" />
                    </div>
                    <div className="h-9 w-24 animate-pulse rounded-full bg-white/20" />
                  </div>
                </div>
              ))}
            </div>
          </SurfacePanel>
        ) : error ? (
          <SurfacePanel
            className="text-white"
            appearance="dark"
            tone="danger"
            accent="rose"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-base font-semibold tracking-[-0.03em] text-white">
                  Couldn't load notifications.
                </p>
                <p className="mt-2 text-sm leading-6 text-white/68">
                  Pull the inbox again and we&apos;ll reload new episode drops,
                  promo alerts, and unlock reminders.
                </p>
              </div>
              <button
                type="button"
                onClick={loadInbox}
                className={`${storefrontSecondaryButtonClass} text-xs`}
              >
                Retry
              </button>
            </div>
          </SurfacePanel>
        ) : (
          <SurfacePanel className="space-y-5" appearance="dark" accent="blue">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <StorefrontSectionHeading eyebrow="Inbox" title="Latest" />
              <p className={storefrontBadgeClass}>
                {notifications.length} updates
              </p>
            </div>
            {workingId === "__all__" ? (
              <div className={storefrontNoticeClass}>
                Marking every unread notification as read.
              </div>
            ) : null}
            <NotificationList
              notifications={notifications}
              onMarkRead={handleMarkRead}
              onNavigate={handleNavigate}
              workingId={workingId}
              appearance="dark"
            />
          </SurfacePanel>
        )}
      </main>
    </div>
  );
}
