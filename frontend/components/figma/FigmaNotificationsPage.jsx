"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  Gift,
  LoaderCircle,
  Sparkles,
} from "lucide-react";
import { useAdultGateStore } from "../../store/useAdultGateStore";
import { useNotificationsStore } from "../../store/useNotificationsStore";
import { buildPathWithAttribution } from "../../lib/paymentAttribution";
import FigmaChrome from "./FigmaChrome";
import { FigmaSiteProvider, useFigmaSite } from "./FigmaSiteContext";
import { buildNotificationCards, cn } from "./figma-utils";

function resolveNotificationHref(item) {
  if (item?.seriesId && item?.episodeId) {
    return buildPathWithAttribution(
      `/read/${encodeURIComponent(item.seriesId)}/${encodeURIComponent(item.episodeId)}`,
      {
        entryPoint:
          item.type === "TTF_READY" ? "FIGMA_NOTIFICATION_TTF" : "FIGMA_NOTIFICATION_EPISODE",
        sourcePath: "/notifications",
        sourceSeriesId: item.seriesId,
        sourceEpisodeId: item.episodeId,
        returnTo: "/notifications",
      },
    );
  }

  if (item?.seriesId) {
    return buildPathWithAttribution(`/series/${encodeURIComponent(item.seriesId)}`, {
      entryPoint: "FIGMA_NOTIFICATION_SERIES",
      sourcePath: "/notifications",
      sourceSeriesId: item.seriesId,
      returnTo: "/notifications",
    });
  }

  if (item?.type === "PROMO" || item?.type === "SUB_VOUCHER") {
    return buildPathWithAttribution("/store", {
      entryPoint: item.type === "PROMO" ? "FIGMA_NOTIFICATION_PROMO" : "FIGMA_NOTIFICATION_VOUCHER",
      sourcePath: "/notifications",
      returnTo: "/notifications",
    });
  }

  return "/notifications";
}

function NotificationCard({ card, workingId, onOpen }) {
  const { palette } = useFigmaSite();
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
        "group flex w-full items-start gap-4 rounded-[26px] border p-5 text-left shadow-xl transition-all hover:-translate-y-0.5 active:scale-[0.99]",
        card.read ? cn(palette.surface, palette.border) : "border-indigo-500/25 bg-indigo-500/8",
      )}
    >
      <div
        className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
          card.kind === "PROMO" || card.kind === "SUB_VOUCHER"
            ? "bg-yellow-500/12 text-yellow-400"
            : card.kind === "TTF_READY"
              ? "bg-emerald-500/12 text-emerald-400"
              : "bg-indigo-500/12 text-indigo-400",
        )}
      >
        <Icon className="h-6 w-6" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-black text-white">{card.title}</h3>
          {!card.read ? (
            <span className="rounded-full bg-red-500/12 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-red-400">
              New
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-sm leading-6 text-gray-400">{card.body}</p>
      </div>

      <div className="shrink-0 text-xs font-black uppercase tracking-[0.18em] text-gray-500">
        {isBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : card.cta}
      </div>
    </button>
  );
}

function NotificationsContent() {
  const router = useRouter();
  const { palette } = useFigmaSite();
  const { isAdultMode } = useAdultGateStore();
  const { notifications, unreadCount, loadNotifications, markRead } = useNotificationsStore();
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState("");
  const [error, setError] = useState("");

  const cards = useMemo(
    () => buildNotificationCards(notifications),
    [notifications],
  );

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
    const unreadIds = notifications.filter((item) => !item.read).map((item) => item.id);
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
    <div className={cn("min-h-screen pt-24 pb-20", palette.rootBg)}>
      <FigmaChrome>
        <div className="mx-auto max-w-5xl px-4 md:px-8">
          <section
            className={cn(
              "mb-8 overflow-hidden rounded-[32px] border p-8 shadow-2xl",
              palette.surface,
              palette.border,
            )}
          >
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-gray-500">
                  Inbox
                </p>
                <h1 className="mt-2 text-4xl font-black tracking-tight text-white">
                  Everything worth opening lives here.
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-400">
                  Episode drops, promo pushes, and time-to-free unlocks are all wired to the same notification feed.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void refreshInbox()}
                  className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10"
                >
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={() => void handleMarkAll()}
                  disabled={workingId === "__all__" || unreadCount === 0}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-white transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60",
                    palette.primaryBg,
                  )}
                >
                  {workingId === "__all__" ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCheck className="h-4 w-4" />
                  )}
                  Mark all read
                </button>
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-500">
                  Unread
                </p>
                <div className="mt-3 text-3xl font-black text-white">{unreadCount}</div>
              </div>
              <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-500">
                  Total
                </p>
                <div className="mt-3 text-3xl font-black text-white">{notifications.length}</div>
              </div>
              <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-500">
                  State
                </p>
                <div className="mt-3 text-lg font-black text-white">
                  {isAdultMode ? "Mature mode on" : "Core mode"}
                </div>
              </div>
            </div>
          </section>

          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`notification-skeleton-${index}`}
                  className={cn(
                    "h-32 animate-pulse rounded-[26px] border shadow-xl",
                    palette.surface,
                    palette.border,
                  )}
                />
              ))}
            </div>
          ) : error ? (
            <div
              className={cn(
                "rounded-[26px] border p-6 text-white shadow-xl",
                palette.surface,
                palette.border,
              )}
            >
              <p className="text-lg font-black">{error}</p>
              <p className="mt-2 text-sm text-gray-400">
                Reload the inbox and try again.
              </p>
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
            <div
              className={cn(
                "rounded-[26px] border p-10 text-center shadow-xl",
                palette.surface,
                palette.border,
              )}
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
                <Bell className="h-8 w-8 text-gray-500" />
              </div>
              <h2 className="mt-5 text-2xl font-black text-white">Inbox cleared</h2>
              <p className="mt-3 text-sm leading-6 text-gray-400">
                No new alerts right now. When the backend drops another update, it will show here.
              </p>
            </div>
          )}
        </div>
      </FigmaChrome>
    </div>
  );
}

export default function FigmaNotificationsPage() {
  return (
    <FigmaSiteProvider>
      <NotificationsContent />
    </FigmaSiteProvider>
  );
}
