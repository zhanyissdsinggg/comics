"use client";

import { useEffect, useState, useMemo } from "react";
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
  const { notifications, loadNotifications, markRead } = useNotificationsStore();
  const { isAdultMode } = useAdultGateStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [workingId, setWorkingId] = useState(null);

  useEffect(() => {
    trackEvent("view_notifications", {});
    loadNotifications(isAdultMode ? "1" : "0")
      .then((response) => {
        if (!response.ok) {
          setError("LOAD_ERROR");
        }
      })
      .finally(() => setLoading(false));
  }, [loadNotifications, isAdultMode]);

  const handleMarkRead = async (notificationId) => {
    setWorkingId(notificationId);
    const response = await markRead([notificationId]);
    if (!response.ok) {
      setError("MARK_ERROR");
    }
    setWorkingId(null);
  };

  const notificationStats = useMemo(() => {
    const total = notifications.length;
    const unread = notifications.filter((item) => !item.read).length;
    const promo = notifications.filter((item) => item.type === "PROMO" || item.type === "SUB_VOUCHER").length;
    const episodes = notifications.filter((item) => item.type === "NEW_EPISODE" || item.type === "TTF_READY").length;

    return [
      {
        label: "Unread",
        value: loading ? "..." : unread.toLocaleString(),
        hint: "Unread messages waiting in the current inbox.",
      },
      {
        label: "Total",
        value: loading ? "..." : total.toLocaleString(),
        hint: "All loaded notifications in this session.",
      },
      {
        label: "Offers",
        value: loading ? "..." : promo.toLocaleString(),
        hint: "Promotion and subscription voucher messages.",
      },
      {
        label: "Episode",
        value: loading ? "..." : episodes.toLocaleString(),
        hint: isAdultMode ? "18+ catalog filtering is active." : "Standard catalog filtering is active.",
      },
    ];
  }, [isAdultMode, loading, notifications]);

  return (
    <main className="min-h-screen bg-transparent text-neutral-100">
      <SiteHeader />
      <div className="mx-auto max-w-[1280px] space-y-6 px-4 pb-14 pt-8 sm:px-6 lg:px-8">
        <EditorialHero
          eyebrow="Inbox desk"
          title="Keep episode updates, promos, and voucher alerts in one clean queue."
          description="Notification routing still works the same, but the page now reads like a usable inbox instead of a loose stack of system messages."
          secondary="Open a title, jump to an offer, or mark items read without losing scan speed."
          stats={notificationStats}
          actions={
            <>
              <button
                type="button"
                onClick={() => router.push("/library")}
                className="rounded-full bg-white px-5 py-2.5 text-xs font-semibold text-neutral-950 transition hover:bg-neutral-200"
              >
                Open Library
              </button>
              <button
                type="button"
                onClick={() => router.push("/rankings")}
                className="rounded-full border border-white/10 bg-black/10 px-4 py-2 text-xs font-semibold text-neutral-200 transition hover:border-white/20 hover:bg-white/10"
              >
                View Rankings
              </button>
            </>
          }
        />

        {loading ? (
          <SurfacePanel>
            <p className="text-sm text-neutral-400">Loading notifications...</p>
          </SurfacePanel>
        ) : error ? (
          <SurfacePanel className="border border-red-500/40 bg-red-500/10 text-red-100">
            <p className="text-sm">Failed to load notifications.</p>
          </SurfacePanel>
        ) : (
          <SurfacePanel className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">
                  Feed
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white">
                  Notification queue
                </h2>
              </div>
              <p className="text-xs text-neutral-500">{notifications.length} items loaded</p>
            </div>
            <NotificationList
              notifications={notifications}
              onMarkRead={handleMarkRead}
              onNavigate={(item) => {
                if (item.seriesId && item.episodeId) {
                  router.push(`/read/${item.seriesId}/${item.episodeId}`);
                  return;
                }
                if (item.seriesId) {
                  router.push(`/series/${item.seriesId}`);
                  return;
                }
                if (item.type === "PROMO" || item.type === "SUB_VOUCHER") {
                  const ctaType = item.ctaType || "STORE";
                  const target = item.ctaTarget || "";
                  const promotionId =
                    item.type === "PROMO" && typeof item.id === "string" && item.id.startsWith("PROMO_")
                      ? item.id.replace(/^PROMO_/, "")
                      : undefined;
                  const attribution = {
                    promotionId,
                    entryPoint: item.type === "PROMO" ? "NOTIFICATION_PROMO" : "NOTIFICATION_SUB_VOUCHER",
                    sourcePath: "/notifications",
                    returnTo: "/notifications",
                  };
                  if (ctaType === "SUBSCRIBE") {
                    router.push(buildPathWithAttribution("/subscribe", attribution));
                    return;
                  }
                  if (ctaType === "SERIES" && target) {
                    router.push(`/series/${target}`);
                    return;
                  }
                  if (ctaType === "READ" && target) {
                    const [seriesId, episodeId] = target.split("/");
                    if (seriesId && episodeId) {
                      router.push(`/read/${seriesId}/${episodeId}`);
                      return;
                    }
                  }
                  if (ctaType === "URL" && target) {
                    window.location.href = target;
                    return;
                  }
                  router.push(buildPathWithAttribution("/store", attribution, { focus: "auto" }));
                }
              }}
              workingId={workingId}
            />
          </SurfacePanel>
        )}
      </div>
    </main>
  );
}
