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
      return "Open episode";
    }
    if (item.type === "PROMO" || item.type === "SUB_VOUCHER") {
      return "See offer";
    }
    return "Open series";
  };

  if (!notifications) {
    return (
      <section className="rounded-[24px] border border-[color:var(--gush-border)] bg-white p-6 text-slate-600">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
          Inbox
        </p>
        <p className="mt-2 text-sm font-semibold text-slate-900">Loading inbox.</p>
      </section>
    );
  }

  if (notifications.length === 0) {
    return (
      <section className="rounded-[24px] border border-[color:var(--gush-border)] bg-white p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
          Inbox
        </p>
        <p className="mt-2 text-sm font-semibold text-slate-900">
          You're caught up.
        </p>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          New chapters and offers land here.
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
            "rounded-[24px] border p-4 shadow-[0_8px_20px_rgba(15,23,42,0.03)] transition",
            item.read
              ? "border-[color:var(--gush-border)] bg-white"
              : "border-[color:var(--gush-border-strong)] bg-[color:var(--gush-page-bg-elevated)]",
          ].join(" ")}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-slate-950">{item.title}</p>
                {!item.read ? (
                  <span
                    className="rounded-full border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-700"
                  >
                    Unread
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.message}</p>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
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
                className="rounded-full border border-[color:var(--gush-border)] bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)] disabled:opacity-50"
                disabled={
                  item.read || workingId === item.id || workingId === "__all__"
                }
              >
                {item.read
                  ? "Read"
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
                  className="rounded-full bg-[color:var(--gush-ink-strong)] px-3 py-1.5 text-xs font-semibold text-white shadow-[0_10px_20px_rgba(15,23,42,0.08)] transition hover:bg-black/82"
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
