"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import SiteHeader from "../../components/layout/SiteHeader";
import EditorialHero from "../../components/common/EditorialHero";
import SurfacePanel from "../../components/common/SurfacePanel";
import {
  StorefrontDesk,
  StorefrontSectionHeading,
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
        hint: "Messages still waiting for you.",
      },
      {
        label: "Episodes",
        value: loading ? "--" : episodes.toLocaleString(),
        hint: "Chapter and free unlock updates.",
      },
      {
        label: "Offers",
        value: loading ? "--" : promo.toLocaleString(),
        hint: "Promos and member offers in this inbox.",
      },
      {
        label: "Total",
        value: loading ? "--" : total.toLocaleString(),
        hint: isAdultMode
          ? "18+ filtering is on."
          : "Standard catalog is showing.",
      },
    ];
  }, [isAdultMode, loading, notifications, unreadCount]);

  const inboxDeskTitle = loading
    ? "Inbox is loading."
    : unreadCount > 0
      ? "Unread updates are waiting."
      : "You're caught up.";
  const inboxDeskCopy = loading
    ? "Recent updates are loading."
    : unreadCount > 0
      ? "Clear a few, then jump back in."
      : "New chapters and offers land here.";

  return (
    <div className="gush-home-shell overflow-hidden">
      <div className="gush-page-ambient" />
      <SiteHeader variant="home" />
      <main className="gush-page-main gush-section-stack">
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <EditorialHero
            appearance="light"
            accent="blue"
            eyebrow="Notifications"
            title="Inbox."
            description="Chapter alerts, offers, and free unlocks."
            secondary=""
            stats={notificationStats}
            actions={
              <>
                <button
                  type="button"
                  onClick={() => router.push("/library")}
                  className={`${storefrontPrimaryButtonClass} bg-[#00e5ff] text-black hover:bg-[#00d2ea]`}
                >
                  Library
                </button>
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  disabled={
                    loading || unreadCount === 0 || workingId === "__all__"
                  }
                  className={`${storefrontSecondaryButtonClass} disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {workingId === "__all__" ? "Saving..." : "Mark all read"}
                </button>
              </>
            }
          />

          <StorefrontDesk
            eyebrow="Inbox desk"
            title={inboxDeskTitle}
            description={inboxDeskCopy}
            actions={
              <>
              <button
                type="button"
                onClick={() => router.push("/library")}
                className={`${storefrontPrimaryButtonClass} bg-[#00e5ff] text-black hover:bg-[#00d2ea]`}
              >
                Library
              </button>
              <button
                type="button"
                onClick={() => router.push("/search")}
                className={storefrontSecondaryButtonClass}
              >
                Browse titles
              </button>
              </>
            }
          />
        </section>

        {loading ? (
          <SurfacePanel className="space-y-5" appearance="light" accent="blue">
            <div className="space-y-2">
              <div
                className="h-4 w-28 animate-pulse rounded-full bg-slate-200"
                aria-hidden="true"
              />
              <div
                className="h-9 w-64 animate-pulse rounded-2xl bg-slate-200"
                aria-hidden="true"
              />
              <div
                className="h-4 w-full max-w-2xl animate-pulse rounded-full bg-slate-200"
                aria-hidden="true"
              />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="border-[3px] border-black bg-white p-4 shadow-[8px_8px_0_0_rgba(0,0,0,1)]"
                  aria-hidden="true"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="h-5 w-1/2 animate-pulse rounded-2xl bg-slate-200" />
                      <div className="h-4 w-full animate-pulse rounded-full bg-slate-100" />
                      <div className="h-4 w-2/3 animate-pulse rounded-full bg-slate-100" />
                    </div>
                    <div className="h-9 w-24 animate-pulse bg-slate-200" />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-sm font-semibold text-black/60">Loading inbox.</p>
          </SurfacePanel>
        ) : error ? (
          <SurfacePanel
            className="border-[3px] border-black bg-[#ffe7ec] text-red-600 shadow-[8px_8px_0_0_rgba(0,0,0,1)]"
            appearance="light"
            tone="danger"
            accent="rose"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-red-600">
                  Couldn't load notifications.
                </p>
                <p className="mt-1 text-sm font-semibold text-red-500">
                  Try again to refresh your inbox.
                </p>
              </div>
              <button
                type="button"
                onClick={loadInbox}
                className={`${storefrontSecondaryButtonClass} text-xs text-red-600`}
              >
                Try again
              </button>
            </div>
          </SurfacePanel>
        ) : (
          <SurfacePanel className="space-y-5" appearance="light" accent="blue">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <StorefrontSectionHeading eyebrow="Inbox" title="Latest" />
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-black/55">
                {notifications.length} updates loaded
              </p>
            </div>
            <NotificationList
              notifications={notifications}
              onMarkRead={handleMarkRead}
              onNavigate={handleNavigate}
              workingId={workingId}
              appearance="light"
            />
          </SurfacePanel>
        )}
      </main>
    </div>
  );
}
