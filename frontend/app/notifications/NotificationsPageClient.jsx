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
              "A strong inbox should make the clearest reading return obvious instead of hiding it in a long list.",
            signalLabel: "Unread",
            signalValue: unreadCount.toLocaleString(),
            signalHint: "Messages still waiting in this inbox",
            ctaLabel: unreadEpisode.ctaLabel || "Open episode",
            onClick: () => handleNavigate(unreadEpisode),
            accentClass:
              "group border-emerald-400/30 bg-emerald-400/10 text-emerald-200 hover:border-emerald-300/50 hover:bg-emerald-400/15",
          }
        : {
            id: "library-return",
            eyebrow: "Back to reading",
            title: "No urgent episode alert right now? Go back to your library.",
            description:
              "When the inbox is quiet, the easiest next step is your saved and unfinished series.",
            signalLabel: "Episode alerts",
            signalValue: episodeCount.toLocaleString(),
            signalHint: "Loaded episode-related messages",
            ctaLabel: "Open library",
            onClick: () => router.push("/library"),
            accentClass:
              "group border-white/10 bg-white/[0.04] text-neutral-100 hover:border-white/20 hover:bg-white/[0.08]",
          },
      {
        id: "offer-return",
        eyebrow: "Offers",
        title: unreadOffer
          ? `${unreadOffer.title} is the easiest offer to open next.`
          : "If promotions are all that's left, keep plans and point packs easy to reach.",
        description: unreadOffer
          ? "Offer messages only help when they send readers to the right plan or point pack without extra hunting."
          : "An offer-heavy inbox still needs one clear next step so it does not feel like random system mail.",
        signalLabel: "Offers",
        signalValue: offerCount.toLocaleString(),
        signalHint: "Promo and voucher messages loaded",
        ctaLabel: unreadOffer?.ctaLabel || "See point packs",
        onClick: () => {
          if (unreadOffer) {
            handleNavigate(unreadOffer);
            return;
          }
          router.push(buildPathWithAttribution("/store", { entryPoint: "NOTIFICATION_EVENT_HUB", sourcePath: "/notifications", returnTo: "/notifications" }, { focus: "auto" }));
        },
        accentClass:
          "group border-white/10 bg-white/[0.04] text-neutral-100 hover:border-white/20 hover:bg-white/[0.08]",
      },
      {
        id: "chart-backup",
        eyebrow: "Keep browsing",
        title: "If the inbox is light, go straight to the charts.",
        description:
          "Notifications should help readers return, but the charts should always be one tap away when the inbox is quiet.",
        signalLabel: "Discovery",
        signalValue: "Charts",
        signalHint: "Weekly and free unlock charts stay live",
        ctaLabel: "See charts",
        onClick: () => router.push("/rankings?type=popular&window=week"),
        accentClass:
          "group border-white/10 bg-white/[0.04] text-neutral-100 hover:border-white/20 hover:bg-white/[0.08]",
      },
    ];
  }, [handleNavigate, notifications, router]);
  return (
    <main className="min-h-screen bg-transparent text-neutral-100">
      <SiteHeader />
      <div className="mx-auto max-w-[1280px] space-y-6 px-4 pb-14 pt-8 sm:px-6 lg:px-8">
        <EditorialHero
          eyebrow="Inbox"
          title="Keep episode updates, promos, and vouchers in one place."
          description="Open a title, jump to an offer, or mark messages read without losing your place."
          secondary="Your inbox should help you get back to reading fast, not feel like a pile of system mail."
          stats={notificationStats}
          actions={
            <>
              <button
                type="button"
                onClick={() => router.push("/library")}
                className="rounded-full bg-white px-5 py-2.5 text-xs font-semibold text-neutral-950 transition hover:bg-neutral-200"
              >
                Library
              </button>
              <button
                type="button"
                onClick={() => router.push("/rankings")}
                className="rounded-full border border-white/10 bg-black/10 px-4 py-2 text-xs font-semibold text-neutral-200 transition hover:border-white/20 hover:bg-white/10"
              >
                Charts
              </button>
            </>
          }
        />

        {!loading && !error ? (
          <StorefrontEventHub
            eyebrow="From your inbox"
            title="Notifications should help you jump back in."
            description="A good comic inbox does more than list messages. It should point to the clearest reading return, the best offer, and one easy backup path."
            events={notificationEventCards}
          />
        ) : null}

        {loading ? (
          <SurfacePanel>
            <p className="text-sm text-neutral-400">Checking your inbox...</p>
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
                  All notifications
                </h2>
              </div>
              <p className="text-xs text-neutral-500">{notifications.length} items loaded</p>
            </div>
            <NotificationList
              notifications={notifications}
              onMarkRead={handleMarkRead}
              onNavigate={handleNavigate}
              workingId={workingId}
            />
          </SurfacePanel>
        )}
      </div>
    </main>
  );
}
