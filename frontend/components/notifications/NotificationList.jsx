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
      <section className="rounded-[30px] border-[3px] border-black bg-white p-6 text-black/68 shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/55">
          Inbox
        </p>
        <p className="mt-2 text-sm font-black uppercase tracking-[0.04em] text-black">
          Loading inbox.
        </p>
      </section>
    );
  }

  if (notifications.length === 0) {
    return (
      <section className="rounded-[30px] border-[3px] border-black bg-[#ffe500] p-6 shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
          Inbox
        </p>
        <p className="mt-2 text-sm font-black uppercase tracking-[0.04em] text-black">
          You're caught up.
        </p>
        <p className="mt-2 text-xs font-semibold leading-5 text-black/70">
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
            "rounded-[30px] border-[3px] p-4 shadow-[8px_8px_0_0_rgba(0,0,0,1)] transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)]",
            item.read
              ? "border-black bg-white"
              : "border-black bg-[#fff6cf]",
          ].join(" ")}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-black uppercase tracking-[0.03em] text-black">
                  {item.title}
                </p>
                {!item.read ? (
                  <span
                    className="border-2 border-black bg-[#ff007a] px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-white"
                  >
                    Unread
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-sm font-semibold leading-6 text-black/72">
                {item.message}
              </p>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-black/55">
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
                className="border-[3px] border-black bg-white px-3 py-2 text-[11px] font-black uppercase tracking-[0.08em] text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] disabled:opacity-50"
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
                  className="border-[3px] border-black bg-[#00e5ff] px-3 py-2 text-[11px] font-black uppercase tracking-[0.08em] text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
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
