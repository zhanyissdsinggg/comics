"use client";

export default function NotificationList({ notifications, onMarkRead, workingId }) {
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
      </section>
    );
  }

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
            <p className="text-sm font-semibold">{item.title}</p>
            <p className="text-xs text-neutral-400">{item.message}</p>
            <p className="mt-1 text-[11px] text-neutral-500">
              {item.type} - {item.createdAt}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onMarkRead(item.id)}
            disabled={item.read || workingId === item.id}
            className="rounded-full border border-neutral-700 px-3 py-1 text-xs text-neutral-200 disabled:opacity-50"
          >
            {item.read ? "Read" : "Mark read"}
          </button>
        </div>
      ))}
    </section>
  );
}
