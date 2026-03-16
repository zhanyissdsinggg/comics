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

  if (!notifications) {
    return (
      <section className="rounded-[24px] border border-white/10 bg-black/10 p-6">
        <p className="text-sm text-neutral-400">Checking your inbox...</p>
      </section>
    );
  }

  if (notifications.length === 0) {
    return (
      <section className="rounded-[24px] border border-white/10 bg-black/10 p-6">
        <p className="text-sm text-neutral-400">No notifications yet.</p>
        <p className="mt-2 text-xs text-neutral-500">
          Follow series and keep alerts enabled so this inbox can actually help you get back to reading.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      {notifications.map((item) => (
        <div
          key={item.id}
          className={[
            "rounded-[24px] border p-4 transition",
            item.read
              ? "border-white/10 bg-black/10"
              : "border-emerald-400/20 bg-emerald-500/[0.06]",
          ].join(" ")}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-white">{item.title}</p>
                {!item.read ? (
                  <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-300">
                    New
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-sm leading-6 text-neutral-300">{item.message}</p>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-neutral-500">
                <span>{getMeta(item)}</span>
                <span>{formatTimestamp(item.createdAt)}</span>
                {item.expiresAt ? <span>Expires {formatTimestamp(item.expiresAt)}</span> : null}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onMarkRead(item.id)}
                disabled={item.read || workingId === item.id}
                className="rounded-full border border-white/10 bg-black/10 px-3 py-1.5 text-xs font-semibold text-neutral-200 transition hover:border-white/20 hover:bg-white/10 disabled:opacity-50"
              >
                {item.read ? "Read" : workingId === item.id ? "Saving..." : "Mark read"}
              </button>
              {item.seriesId || item.type === "PROMO" || item.type === "SUB_VOUCHER" ? (
                <button
                  type="button"
                  onClick={() => onNavigate?.(item)}
                  className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-neutral-950 transition hover:bg-neutral-200"
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
