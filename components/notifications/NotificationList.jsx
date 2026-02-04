"use client";

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
  if (!notifications) {
    return (
      <section className="rounded-2xl border border-neutral-900 bg-neutral-900/50 p-6">
        <p className="text-sm text-neutral-400">Loading notifications...</p>
      </section>
    );
  }

  if (notifications.length === 0) {
    return (
      <section className="rounded-2xl border border-neutral-900 bg-neutral-900/50 p-6">
        <p className="text-sm text-neutral-400">No notifications yet.</p>
        <p className="mt-2 text-xs text-neutral-500">
          Follow series to receive update alerts here.
        </p>
      </section>
    );
  }

  const getMeta = (item) => {
    if (item.type === "NEW_EPISODE") {
      return "New episode";
    }
    if (item.type === "TTF_READY") {
      return "TTF ready";
    }
    if (item.type === "SUB_VOUCHER") {
      return "Subscription voucher";
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
    if (item.type === "PROMO" || item.type === "SUB_VOUCHER") {
      return "View offer";
    }
    return "Open";
  };

  return (
    <section className="space-y-3">
      {notifications.map((item) => (
        <div
          key={item.id}
          className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 ${
            item.read
              ? "border-neutral-900 bg-neutral-900/40"
              : "border-neutral-700 bg-neutral-900/70"
          }`}
        >
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold">{item.title}</p>
              {!item.read ? (
                <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-200">
                  New
                </span>
              ) : null}
            </div>
            <p className="text-xs text-neutral-400">{item.message}</p>
            <p className="mt-1 text-[11px] text-neutral-500">
              {getMeta(item)} - {formatTimestamp(item.createdAt)}
            </p>
            {item.expiresAt ? (
              <p className="text-[11px] text-neutral-500">
                Expires: {formatTimestamp(item.expiresAt)}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onMarkRead(item.id)}
              disabled={item.read || workingId === item.id}
              className="rounded-full border border-neutral-700 px-3 py-1 text-xs text-neutral-200 disabled:opacity-50"
            >
              {item.read ? "Read" : "Mark read"}
            </button>
            {item.seriesId || item.type === "PROMO" || item.type === "SUB_VOUCHER" ? (
              <button
                type="button"
                onClick={() => onNavigate?.(item)}
                className="rounded-full border border-neutral-700 px-3 py-1 text-xs text-neutral-200"
              >
                {getCtaLabel(item)}
              </button>
            ) : null}
          </div>
        </div>
      ))}
    </section>
  );
}
