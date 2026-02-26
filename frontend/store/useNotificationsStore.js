"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { apiGet, apiPost } from "../lib/apiClient";
import { applyPreferencesToStorage, readPreferenceFlag } from "../lib/preferencesClient";

const NotificationsContext = createContext(null);
const PREF_KEYS = {
  newEpisode: "mn_notify_new_episode",
  ttfReady: "mn_notify_ttf_ready",
  promo: "mn_notify_promo",
};

export function NotificationsProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const syncList = useCallback((response) => {
    if (response.ok && Array.isArray(response.data?.notifications)) {
      setNotifications(response.data.notifications);
      setLoaded(true);
    }
  }, []);

  const loadNotifications = useCallback(async (adultFlag) => {
    const suffix = adultFlag ? `?adult=${adultFlag}` : "";
    apiGet("/api/preferences").then((prefResponse) => {
      if (prefResponse.ok && prefResponse.data?.preferences) {
        applyPreferencesToStorage(prefResponse.data.preferences);
      }
    });
    const response = await apiGet(`/api/notifications${suffix}`, { cacheMs: 5000 });
    if (response.ok && Array.isArray(response.data?.notifications)) {
      const prefs = readPreferences();
      const filtered = response.data.notifications.filter((item) => {
        if (item.type === "NEW_EPISODE") {
          return prefs.newEpisode;
        }
        if (item.type === "TTF_READY") {
          return prefs.ttfReady;
        }
        if (item.type === "PROMO" || item.type === "SUB_VOUCHER") {
          return prefs.promo;
        }
        return true;
      });
      syncList({ ...response, data: { ...response.data, notifications: filtered } });
    } else {
      syncList(response);
    }
    return response;
  }, [syncList]);

  const markRead = useCallback(
    async (notificationIds) => {
      const response = await apiPost("/api/notifications/read", { notificationIds });
      if (response.ok) {
        setNotifications((prev) =>
          prev.map((item) =>
            notificationIds.includes(item.id) ? { ...item, read: true } : item
          )
        );
      } else {
        syncList(response);
      }
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

function readPreferences() {
  if (typeof window === "undefined") {
    return { newEpisode: true, ttfReady: true, promo: true };
  }
  return {
    newEpisode: readPreferenceFlag(PREF_KEYS.newEpisode, true),
    ttfReady: readPreferenceFlag(PREF_KEYS.ttfReady, true),
    promo: readPreferenceFlag(PREF_KEYS.promo, true),
  };
}
