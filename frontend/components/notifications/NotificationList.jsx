"use client";

export default function NotificationList({
  notifications,
  onMarkRead,
  onNavigate,
  workingId,
  appearance = "default",
}) {
  const isLight = appearance === "light";

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
    return "View Series";
  };

  if (!notifications) {
    return (
      <section
        className={`rounded-[24px] border p-6 ${
          isLight
            ? "border-black/8 bg-white text-slate-600"
            : "border-white/10 bg-black/10"
        }`}
      >
        <p
          className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${isLight ? "text-slate-500" : "text-neutral-500"}`}
        >
          Inbox
        </p>
        <p
          className={`mt-2 text-sm font-semibold ${isLight ? "text-slate-900" : "text-white"}`}
        >
          Loading your inbox.
        </p>
      </section>
    );
  }

  if (notifications.length === 0) {
    return (
      <section
        className={`rounded-[24px] border p-6 ${
          isLight ? "border-black/8 bg-white" : "border-white/10 bg-black/10"
        }`}
      >
        <p
          className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${isLight ? "text-slate-500" : "text-neutral-500"}`}
        >
          Inbox
        </p>
        <p
          className={`mt-2 text-sm font-semibold ${isLight ? "text-slate-900" : "text-white"}`}
        >
          You're caught up.
        </p>
        <p
          className={`mt-2 text-xs leading-5 ${isLight ? "text-slate-500" : "text-neutral-500"}`}
        >
          New chapters, offers, and free unlocks land here.
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
              ? isLight
                ? "border-black/8 bg-white"
                : "border-white/10 bg-black/10"
              : isLight
                ? "border-[rgba(0,113,227,0.14)] bg-[rgba(0,113,227,0.08)]"
                : "border-sky-400/20 bg-sky-500/[0.08]",
          ].join(" ")}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p
                  className={`text-sm font-semibold ${isLight ? "text-slate-950" : "text-white"}`}
                >
                  {item.title}
                </p>
                {!item.read ? (
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.24em] ${
                      isLight
                        ? "border-[rgba(0,113,227,0.14)] bg-white text-[var(--gush-accent-strong,#0058cc)]"
                        : "border-sky-400/30 bg-sky-400/10 text-sky-200"
                    }`}
                  >
                    Unread
                  </span>
                ) : null}
              </div>
              <p
                className={`mt-2 text-sm leading-6 ${isLight ? "text-slate-600" : "text-neutral-300"}`}
              >
                {item.message}
              </p>
              <div
                className={`mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] ${isLight ? "text-slate-500" : "text-neutral-500"}`}
              >
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
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                  isLight
                    ? "border-black/8 bg-white text-slate-700 hover:border-black/12 hover:bg-[#f8f9fc]"
                    : "border-white/10 bg-black/10 text-neutral-200 hover:border-white/20 hover:bg-white/10"
                }`}
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
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    isLight
                      ? "bg-slate-950 text-white hover:bg-slate-800"
                      : "bg-white text-neutral-950 hover:bg-neutral-200"
                  }`}
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
