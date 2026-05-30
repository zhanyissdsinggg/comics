"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Gift, LoaderCircle, Sparkles } from "lucide-react";
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
        "group flex w-full items-start gap-3 rounded-[24px] border p-4 text-left shadow-xl transition-all hover:-translate-y-0.5 hover:bg-white/[0.03] active:scale-[0.99] md:gap-4 md:rounded-[26px] md:p-5",
        card.read
          ? cn(palette.surface, palette.border)
          : "border-indigo-500/25 bg-indigo-500/8",
      )}
    >
      <div
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl md:h-12 md:w-12 md:rounded-2xl",
          card.kind === "PROMO" || card.kind === "SUB_VOUCHER"
            ? "bg-yellow-500/12 text-yellow-400"
            : card.kind === "TTF_READY"
              ? "bg-emerald-500/12 text-emerald-400"
              : "bg-indigo-500/12 text-indigo-400",
        )}
      >
        <Icon className="h-5 w-5 md:h-6 md:w-6" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-[1.1rem] font-semibold leading-tight tracking-[-0.04em] text-white md:text-[1.25rem]">
            {card.title}
          </h3>
          {!card.read ? (
            <span className="rounded-full border border-[rgba(255,143,195,0.28)] bg-[linear-gradient(135deg,rgba(255,79,154,0.24)_0%,rgba(125,244,255,0.16)_100%)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white shadow-[0_10px_22px_rgba(255,79,154,0.16)]">
              New
            </span>
          ) : null}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-gray-300">
            {card.kind.replaceAll("_", " ")}
          </span>
          <span>{card.dateLabel || "Recent"}</span>
        </div>
        <p className="mt-1.5 text-sm leading-6 text-gray-400">{card.body}</p>
      </div>

      <div className="max-w-[76px] shrink-0 text-right text-[11px] font-semibold uppercase leading-4 tracking-[0.14em] text-gray-500 md:text-xs md:tracking-[0.16em]">
        {isBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : card.cta}
      </div>
    </button>
  );
}

function NotificationsContent() {
  const router = useRouter();
  const { palette } = useFigmaSite();
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
    <div className={cn("min-h-screen pb-20", palette.rootBg)}>
      <FigmaChrome>
        <div className="mx-auto max-w-5xl px-4 md:px-8">
          <section
            className={cn(
              "mb-6 overflow-hidden rounded-[28px] border p-5 shadow-2xl md:rounded-[32px] md:p-8",
              palette.surface,
              palette.border,
            )}
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gray-500">
                  Inbox
                </p>
                <h1 className="mt-2 font-display text-[2.15rem] font-semibold leading-[0.92] tracking-[-0.06em] text-white md:text-[2.8rem]">
                  Everything worth opening lives here.
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-gray-400 md:mt-4 md:max-w-2xl md:leading-7">
                  Episode drops, promo pushes, and time-to-free unlocks are all
                  wired to the same notification feed.
                </p>
              </div>

              <div className="flex flex-wrap gap-2.5 md:gap-3">
                <button
                  type="button"
                  onClick={() => void refreshInbox()}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-white/10 md:rounded-2xl md:px-5 md:py-3"
                >
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={() => void handleMarkAll()}
                  disabled={workingId === "__all__" || unreadCount === 0}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-white transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 md:rounded-2xl md:px-5 md:py-3 md:text-sm",
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
          </section>

          <div className="mb-8 grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
            <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.055)_0%,rgba(255,255,255,0.03)_100%)] p-4 shadow-[0_18px_34px_rgba(8,6,20,0.22)] md:p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                Unread
              </p>
              <div className="mt-2 font-display text-2xl font-semibold tracking-[-0.04em] text-white md:mt-3 md:text-3xl">
                {unreadCount}
              </div>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.055)_0%,rgba(255,255,255,0.03)_100%)] p-4 shadow-[0_18px_34px_rgba(8,6,20,0.22)] md:p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                Total
              </p>
              <div className="mt-2 font-display text-2xl font-semibold tracking-[-0.04em] text-white md:mt-3 md:text-3xl">
                {notifications.length}
              </div>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.055)_0%,rgba(255,255,255,0.03)_100%)] p-4 shadow-[0_18px_34px_rgba(8,6,20,0.22)] md:p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                State
              </p>
              <div className="mt-2 text-base font-semibold tracking-[-0.02em] text-white md:mt-3 md:text-lg">
                {isAdultMode ? "Mature mode on" : "Core mode"}
              </div>
            </div>
          </div>

          <section className="mb-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div
              className={cn(
                "rounded-[28px] border p-4 shadow-xl md:p-5",
                palette.surface,
                palette.border,
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500 md:text-xs">
                    Feed Status
                  </p>
                  <h2 className="mt-2 font-display text-[1.45rem] font-semibold tracking-[-0.04em] text-white md:text-[1.6rem]">
                    Notifications are grouped into one reading lane.
                  </h2>
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-300">
                  Live
                </div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.055)_0%,rgba(255,255,255,0.03)_100%)] px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                    Episode drops
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    Chapter and route alerts
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.055)_0%,rgba(255,255,255,0.03)_100%)] px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                    Store prompts
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    Promo and voucher notices
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.055)_0%,rgba(255,255,255,0.03)_100%)] px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                    Return path
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    One tap back into reading
                  </p>
                </div>
              </div>
            </div>

            <div
              className={cn(
                "rounded-[28px] border p-4 shadow-xl md:p-5",
                palette.surface,
                palette.border,
              )}
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500 md:text-xs">
                Queue Health
              </p>
              <div className="mt-3 font-display text-3xl font-semibold tracking-[-0.04em] text-white">
                {notifications.length}
              </div>
              <p className="mt-2 text-sm leading-6 text-gray-400">
                Alerts are balanced between release drops, promotional nudges,
                and entitlement updates.
              </p>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.055)_0%,rgba(255,255,255,0.03)_100%)] px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                    Priority
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {unreadCount > 0
                      ? "Unread items waiting"
                      : "Inbox under control"}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.055)_0%,rgba(255,255,255,0.03)_100%)] px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                    Current tab
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {isAdultMode ? "Mature feed context" : "Core feed context"}
                  </p>
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
                    "h-28 animate-pulse rounded-[24px] border shadow-xl md:h-32 md:rounded-[26px]",
                    palette.surface,
                    palette.border,
                  )}
                />
              ))}
            </div>
          ) : error ? (
            <div
              className={cn(
                "rounded-[24px] border p-5 text-white shadow-xl md:rounded-[26px] md:p-6",
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
                "rounded-[24px] border p-8 text-center shadow-xl md:rounded-[26px] md:p-10",
                palette.surface,
                palette.border,
              )}
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
                <Bell className="h-8 w-8 text-gray-500" />
              </div>
              <h2 className="mt-5 text-2xl font-black text-white">
                Inbox cleared
              </h2>
              <p className="mt-3 text-sm leading-6 text-gray-400">
                No new alerts right now. When the backend drops another update,
                it will show here.
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
