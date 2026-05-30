"use client";

import {
  storefrontBadgeClass,
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
  storefrontSoftCardClass,
} from "../common/StorefrontPagePrimitives";
import SurfacePanel from "../common/SurfacePanel";

export default function NotificationList({
  notifications,
  onMarkRead,
  onNavigate,
  workingId,
}) {
  const formatTimestamp = (value) => {
    if (!value) {
      return "Just now";
    }
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) {
      return value;
    }
    return new Date(parsed).toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  };

  const getMeta = (item) => {
    if (item.type === "NEW_EPISODE") {
      return "New chapter";
    }
    if (item.type === "TTF_READY") {
      return "Free unlock";
    }
    if (item.type === "SUB_VOUCHER") {
      return "Member perk";
    }
    if (item.type === "PROMO") {
      return "Promotion";
    }
    return item.type;
  };

  const getCtaLabel = (item) => {
    if (item.ctaLabel) {
      return item.ctaLabel;
    }
    if (item.type === "NEW_EPISODE" || item.type === "TTF_READY") {
      return "Start reading";
    }
    if (item.type === "PROMO" || item.type === "SUB_VOUCHER") {
      return "See offer";
    }
    return "View title";
  };

  if (!notifications) {
    return (
      <SurfacePanel tone="muted" accent="cyan" appearance="dark">
        <p className={storefrontBadgeClass}>
          Inbox
        </p>
      </SurfacePanel>
    );
  }

  if (notifications.length === 0) {
    return (
      <SurfacePanel tone="muted" accent="cyan" appearance="dark">
        <p className={storefrontBadgeClass}>
          Inbox
        </p>
        <p className="mt-3 font-display text-[1.65rem] font-semibold tracking-[-0.05em] text-white">
          You're caught up.
        </p>
        <p className="mt-2 text-sm leading-6 text-white/64">
          New chapter drops, member perks, and promo alerts will land here.
        </p>
      </SurfacePanel>
    );
  }

  return (
    <section className="space-y-3">
      {notifications.map((item) => (
        <div
          key={item.id}
          className={[
            `rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.055)_0%,rgba(255,255,255,0.03)_100%)] p-4 shadow-[0_20px_42px_rgba(8,6,20,0.28)] transition-all duration-150 ease-out hover:-translate-y-0.5 hover:border-white/16 sm:p-5 ${storefrontSoftCardClass}`,
            item.read ? "text-white/85" : "text-white",
          ].join(" ")}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-base font-semibold tracking-[-0.03em] text-white">
                  {item.title}
                </p>
                {!item.read ? (
                  <span className="inline-flex items-center rounded-full border border-[rgba(255,143,195,0.3)] bg-[linear-gradient(135deg,rgba(255,79,154,0.24)_0%,rgba(125,244,255,0.18)_100%)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white shadow-[0_10px_22px_rgba(255,79,154,0.16)]">
                    Unread
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-sm leading-7 text-white/74">
                {item.message}
              </p>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/60">
                <span>{getMeta(item)}</span>
                <span>{formatTimestamp(item.createdAt)}</span>
                {item.expiresAt ? (
                  <span>Expires {formatTimestamp(item.expiresAt)}</span>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onMarkRead(item.id)}
                className={`${storefrontSecondaryButtonClass} h-10 px-3 text-[11px] tracking-[0.08em] disabled:opacity-50`}
                disabled={
                  item.read || workingId === item.id || workingId === "__all__"
                }
              >
                {item.read
                  ? "Done"
                  : workingId === item.id
                    ? "Saving..."
                    : "Mark read"}
              </button>
              {item.seriesId ||
              item.type === "PROMO" ||
              item.type === "SUB_VOUCHER" ? (
                <button
                  type="button"
                  onClick={() => onNavigate?.(item)}
                  className={`${storefrontPrimaryButtonClass} h-10 px-3 text-[11px] tracking-[0.08em]`}
                >
                  {getCtaLabel(item)}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
