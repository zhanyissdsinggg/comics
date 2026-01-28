"use client";

import { useEffect, useState } from "react";
import SiteHeader from "../../components/layout/SiteHeader";
import NotificationList from "../../components/notifications/NotificationList";
import { useNotificationsStore } from "../../store/useNotificationsStore";
import { track } from "../../lib/analytics";

export default function NotificationsPage() {
  const { notifications, loadNotifications, markRead } = useNotificationsStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [workingId, setWorkingId] = useState(null);

  useEffect(() => {
    track("view_notifications", {});
    loadNotifications()
      .then((response) => {
        if (!response.ok) {
          setError("LOAD_ERROR");
        }
      })
      .finally(() => setLoading(false));
  }, [loadNotifications]);

  const handleMarkRead = async (notificationId) => {
    setWorkingId(notificationId);
    const response = await markRead([notificationId]);
    if (!response.ok) {
      setError("MARK_ERROR");
    }
    setWorkingId(null);
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <div className="mt-6">
          {loading ? (
            <div className="rounded-2xl border border-neutral-900 bg-neutral-900/50 p-6 text-sm text-neutral-400">
              Loading...
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-200">
              Failed to load notifications.
            </div>
          ) : (
            <NotificationList
              notifications={notifications}
              onMarkRead={handleMarkRead}
              workingId={workingId}
            />
          )}
        </div>
      </div>
    </main>
  );
}
