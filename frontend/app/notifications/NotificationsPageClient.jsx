"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import SiteHeader from "../../components/layout/SiteHeader";
import EditorialHero from "../../components/common/EditorialHero";
import StorefrontEventHub from "../../components/common/StorefrontEventHub";
import SurfacePanel from "../../components/common/SurfacePanel";
import NotificationList from "../../components/notifications/NotificationList";
import { useNotificationsStore } from "../../store/useNotificationsStore";
import { useAdultGateStore } from "../../store/useAdultGateStore";
import { trackEvent } from "../../lib/trackEvent";
import { buildPathWithAttribution } from "../../lib/paymentAttribution";

export default function NotificationsPage() {
  const router = useRouter();
  const { notifications, unreadCount, loadNotifications, markRead } = useNotificationsStore();
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
    const unreadIds = notifications.filter((item) => !item.read).map((item) => item.id);
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
            entryPoint: item.type === "TTF_READY" ? "NOTIFICATION_TTF_READY" : "NOTIFICATION_EPISODE",
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
        router.push(buildPathWithAttribution("/store", attribution, { focus: "auto" }));
      }
    },
    [router],
  );

  const notificationStats = useMemo(() => {
    const total = notifications.length;
    const promo = notifications.filter((item) => item.type === "PROMO" || item.type === "SUB_VOUCHER").length;
    const episodes = notifications.filter((item) => item.type === "NEW_EPISODE" || item.type === "TTF_READY").length;

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
        hint: isAdultMode ? "18+ filtering is on." : "Standard catalog is showing.",
      },
    ];
  }, [isAdultMode, loading, notifications, unreadCount]);

  const notificationEventCards = useMemo(() => {
    const unreadEpisode = notifications.find(
      (item) => !item.read && (item.type === "NEW_EPISODE" || item.type === "TTF_READY"),
    );
    const unreadOffer = notifications.find(
      (item) => !item.read && (item.type === "PROMO" || item.type === "SUB_VOUCHER"),
    );
    const unreadCount = notifications.filter((item) => !item.read).length;
    const episodeCount = notifications.filter(
      (item) => item.type === "NEW_EPISODE" || item.type === "TTF_READY",
    ).length;
    const offerCount = notifications.filter(
      (item) => item.type === "PROMO" || item.type === "SUB_VOUCHER",
    ).length;

    return [
      unreadEpisode
        ? {
            id: "episode-return",
            eyebrow: "Read next",
            title: `${unreadEpisode.title} is ready when you want to jump back in.`,
            description:
              "The best inbox makes the next chapter obvious instead of burying it in a stack of messages.",
            signalLabel: "Unread",
            signalValue: unreadCount.toLocaleString(),
            signalHint: "Messages still waiting",
            ctaLabel: unreadEpisode.ctaLabel || "Open episode",
            onClick: () => handleNavigate(unreadEpisode),
            accentClass:
              "group border-emerald-100 bg-emerald-50/80 text-slate-900 hover:border-emerald-200 hover:bg-emerald-50",
          }
        : {
            id: "library-return",
            eyebrow: "Back to reading",
            title: "Nothing urgent? Go back to your library.",
            description:
              "When the inbox is quiet, your saved and unfinished titles should be the next obvious stop.",
            signalLabel: "Episode alerts",
            signalValue: episodeCount.toLocaleString(),
            signalHint: "Episode updates loaded",
            ctaLabel: "Open library",
            onClick: () => router.push("/library"),
            accentClass:
              "group border-black/8 bg-white text-slate-900 hover:border-black/12 hover:bg-[#f8f9fc]",
          },
      {
        id: "offer-return",
        eyebrow: "Offers",
        title: unreadOffer
          ? `${unreadOffer.title} is the easiest offer to open next.`
          : "If offers are all that's left, keep the next top-up easy to reach.",
        description: unreadOffer
          ? "Offers only work when they send readers to the right plan or point pack without extra hunting."
          : "Even an offer-heavy inbox needs one clear next step so it does not feel like random mail.",
        signalLabel: "Offers",
        signalValue: offerCount.toLocaleString(),
        signalHint: "Offer messages loaded",
        ctaLabel: unreadOffer?.ctaLabel || "See point packs",
        onClick: () => {
          if (unreadOffer) {
            handleNavigate(unreadOffer);
            return;
          }
          router.push(buildPathWithAttribution("/store", { entryPoint: "NOTIFICATION_EVENT_HUB", sourcePath: "/notifications", returnTo: "/notifications" }, { focus: "auto" }));
        },
        accentClass:
          "group border-black/8 bg-white text-slate-900 hover:border-black/12 hover:bg-[#f8f9fc]",
      },
      {
        id: "chart-backup",
        eyebrow: "Keep browsing",
        title: "If the inbox is light, go straight to the charts.",
        description:
          "Notifications should help readers return, but charts should always be close when the inbox is quiet.",
        signalLabel: "Discovery",
        signalValue: "Charts",
        signalHint: "Weekly charts stay live",
        ctaLabel: "See charts",
        onClick: () => router.push("/rankings?type=popular&window=week"),
        accentClass:
          "group border-black/8 bg-white text-slate-900 hover:border-black/12 hover:bg-[#f8f9fc]",
      },
    ];
  }, [handleNavigate, notifications, router]);
  return (
    <main className="relative min-h-screen bg-[#f4f6fb] text-slate-900">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(circle_at_top_left,rgba(47,107,255,0.1),transparent_24%),linear-gradient(180deg,#eef2f9_0%,#f4f6fb_72%)]" />
      <SiteHeader variant="light" />
      <div className="relative mx-auto max-w-[1280px] space-y-6 px-4 pb-14 pt-8 sm:px-6 lg:px-8">
        <EditorialHero
          appearance="light"
          accent="blue"
          eyebrow="Notifications"
          title="Only the updates that matter."
          description="New chapters, offers, and unlocks without the clutter."
          secondary="Use this page to jump back into a title fast, then clear what you don't need."
          stats={notificationStats}
          actions={
            <>
              <button
                type="button"
                onClick={() => router.push("/library")}
                className="rounded-full bg-slate-950 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800"
              >
                Library
              </button>
              <button
                type="button"
                onClick={() => router.push("/rankings")}
                className="rounded-full border border-black/8 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[#f8f9fc]"
              >
                Charts
              </button>
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={loading || unreadCount === 0 || workingId === "__all__"}
                className="rounded-full border border-black/8 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[#f8f9fc] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {workingId === "__all__" ? "Saving..." : "Mark all read"}
              </button>
            </>
          }
        />

        {!loading && !error ? (
          <StorefrontEventHub
            eyebrow="From your inbox"
            title="The fastest way back in."
            description="Use the inbox to jump to the next chapter, catch an offer, or move on to something better."
            events={notificationEventCards}
            appearance="light"
          />
        ) : null}

        {loading ? (
          <SurfacePanel className="space-y-5" appearance="light" accent="blue">
            <div className="space-y-2">
              <div className="h-4 w-28 animate-pulse rounded-full bg-slate-200" aria-hidden="true" />
              <div className="h-9 w-64 animate-pulse rounded-2xl bg-slate-200" aria-hidden="true" />
              <div className="h-4 w-full max-w-2xl animate-pulse rounded-full bg-slate-200" aria-hidden="true" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-[24px] border border-black/8 bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]"
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
            <p className="text-sm text-slate-500">Your inbox is getting ready.</p>
          </SurfacePanel>
        ) : error ? (
          <SurfacePanel className="border border-red-200 bg-red-50 text-red-600" appearance="light" tone="danger" accent="rose">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-red-600">Couldn't load notifications.</p>
                <p className="mt-1 text-sm text-red-500">Try again to refresh your inbox and recent reading alerts.</p>
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
                  Latest activity
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                  Your notifications
                </h2>
              </div>
              <p className="text-xs text-slate-500">{notifications.length} messages loaded</p>
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
      </div>
    </main>
  );
}
