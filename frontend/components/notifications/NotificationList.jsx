"use client";

import {
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
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
      return "Start Reading";
    }
    if (item.type === "PROMO" || item.type === "SUB_VOUCHER") {
      return "See offer";
    }
    return "Read More";
  };

  if (!notifications) {
    return (
      <SurfacePanel tone="muted" accent="cyan" appearance="dark">
        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/70">
          Inbox
        </p>
      </SurfacePanel>
    );
  }

  if (notifications.length === 0) {
    return (
      <SurfacePanel tone="muted" accent="cyan" appearance="dark">
        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/70">
          Inbox
        </p>
        <p className="mt-2 text-sm font-black uppercase tracking-[0.04em] text-white">
          You're caught up.
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
            "rounded-[26px] border-2 border-black bg-[#0b0b0b] p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-transform duration-150 ease-out hover:translate-x-0.5 hover:translate-y-0.5",
            item.read
              ? "text-white/85"
              : "text-white",
          ].join(" ")}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-black uppercase tracking-[0.03em] text-white">
                  {item.title}
                </p>
                {!item.read ? (
                  <span
                    className="rounded-full border-2 border-black bg-[#FFE500] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  >
                    Unread
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-sm font-semibold leading-6 text-white/80">
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
