"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { apiGet, apiPost } from "../lib/apiClient";

const NotificationsContext = createContext(null);

export function NotificationsProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const syncList = useCallback((response) => {
    if (response.ok && Array.isArray(response.data?.notifications)) {
      setNotifications(response.data.notifications);
      setLoaded(true);
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    const response = await apiGet("/api/notifications");
    syncList(response);
    return response;
  }, [syncList]);

  const markRead = useCallback(
    async (notificationIds) => {
      const response = await apiPost("/api/notifications/read", { notificationIds });
      syncList(response);
      return response;
    },
    [syncList]
  );

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications]
  );

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      loaded,
      loadNotifications,
      markRead,
    }),
    [notifications, unreadCount, loaded, loadNotifications, markRead]
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotificationsStore() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error("useNotificationsStore must be used within NotificationsProvider");
  }
  return context;
}
