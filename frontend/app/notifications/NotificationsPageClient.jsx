"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import SiteHeader from "../../components/layout/SiteHeader";
import EditorialHero from "../../components/common/EditorialHero";
import SurfacePanel from "../../components/common/SurfacePanel";
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

  const primaryButtonClass =
    "rounded-full bg-[color:var(--gush-ink-strong)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(15,23,42,0.08)] transition hover:bg-black/82 disabled:cursor-not-allowed disabled:opacity-50";
  const secondaryButtonClass =
    "rounded-full border border-[color:var(--gush-border)] bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)] disabled:cursor-not-allowed disabled:opacity-50";
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
                  className={primaryButtonClass}
                >
                  Library
                </button>
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  disabled={
                    loading || unreadCount === 0 || workingId === "__all__"
                  }
                  className={secondaryButtonClass}
                >
                  {workingId === "__all__" ? "Saving..." : "Mark all read"}
                </button>
              </>
            }
          />

          <SurfacePanel
            tone="muted"
            accent="blue"
            appearance="light"
            className="flex h-full flex-col justify-between space-y-6"
          >
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                Inbox desk
              </p>
              <div>
                <h2 className="font-display text-[1.7rem] font-semibold tracking-tight text-slate-950">
                  {inboxDeskTitle}
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {inboxDeskCopy}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => router.push("/library")}
                className={primaryButtonClass}
              >
                Library
              </button>
              <button
                type="button"
                onClick={() => router.push("/search")}
                className={secondaryButtonClass}
              >
                Browse titles
              </button>
            </div>
          </SurfacePanel>
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
                  className="rounded-[24px] border border-[color:var(--gush-border)] bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]"
                  aria-hidden="true"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="h-5 w-1/2 animate-pulse rounded-2xl bg-slate-200" />
                      <div className="h-4 w-full animate-pulse rounded-full bg-slate-100" />
                      <div className="h-4 w-2/3 animate-pulse rounded-full bg-slate-100" />
                    </div>
                    <div className="h-9 w-24 animate-pulse rounded-full bg-slate-200" />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-sm text-slate-500">Loading inbox.</p>
          </SurfacePanel>
        ) : error ? (
          <SurfacePanel
            className="border border-red-200 bg-red-50 text-red-600"
            appearance="light"
            tone="danger"
            accent="rose"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-red-600">
                  Couldn't load notifications.
                </p>
                <p className="mt-1 text-sm text-red-500">
                  Try again to refresh your inbox.
                </p>
              </div>
              <button
                type="button"
                onClick={loadInbox}
                className="rounded-full border border-red-200 bg-white px-4 py-2 text-xs font-semibold text-red-600 transition hover:border-red-300 hover:bg-red-50"
              >
                Try again
              </button>
            </div>
          </SurfacePanel>
        ) : (
          <SurfacePanel className="space-y-5" appearance="light" accent="blue">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                  Inbox
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                  Latest
                </h2>
              </div>
              <p className="text-xs text-slate-500">
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
