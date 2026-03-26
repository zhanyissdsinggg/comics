"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { apiGet, apiPost } from "../lib/apiClient";
import { useAuthStore } from "./useAuthStore";

const HistoryContext = createContext(null);

function toTimestamp(value) {
  const parsed = Date.parse(value || "");
  return Number.isNaN(parsed) ? 0 : parsed;
}

function normalizeHistoryEntries(entries) {
  if (!Array.isArray(entries)) {
    return [];
  }

  const deduped = new Map();

  entries.forEach((entry) => {
    if (!entry?.seriesId || !entry?.episodeId) {
      return;
    }

    const key = `${entry.seriesId}:${entry.episodeId}`;
    const current = deduped.get(key);
    const nextTimestamp = toTimestamp(entry.createdAt);

    if (!current || nextTimestamp >= toTimestamp(current.createdAt)) {
      deduped.set(key, entry);
    }
  });

  return Array.from(deduped.values()).sort(
    (left, right) => toTimestamp(right.createdAt) - toTimestamp(left.createdAt),
  );
}

function createOptimisticHistoryEntry(payload) {
  return {
    id: payload?.id || `history_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    seriesId: payload?.seriesId,
    episodeId: payload?.episodeId,
    title: payload?.title || "",
    percent: payload?.percent || 0,
    createdAt: payload?.createdAt || new Date().toISOString(),
  };
}

export function HistoryProvider({ children }) {
  const { isSignedIn } = useAuthStore();
  const [items, setItems] = useState([]);

  const loadHistory = useCallback(async () => {
    if (!isSignedIn) {
      return { ok: false, status: 401, error: "UNAUTHENTICATED" };
    }

    const response = await apiGet("/api/history");
    if (response.ok && response.data?.history) {
      setItems(normalizeHistoryEntries(response.data.history).slice(0, 100));
    }
    return response;
  }, [isSignedIn]);

  useEffect(() => {
    if (isSignedIn) {
      loadHistory();
      return;
    }

    setItems([]);
  }, [isSignedIn, loadHistory]);

  const addHistory = useCallback(
    async (payload) => {
      if (!isSignedIn) {
        return { ok: false, status: 401, error: "UNAUTHENTICATED" };
      }

      const optimisticEntry = createOptimisticHistoryEntry(payload);
      setItems((currentItems) =>
        normalizeHistoryEntries([optimisticEntry, ...currentItems]).slice(0, 100),
      );

      const response = await apiPost("/api/history", optimisticEntry);
      if (response.ok && response.data?.history) {
        setItems(normalizeHistoryEntries(response.data.history).slice(0, 100));
      }
      return response;
    },
    [isSignedIn],
  );

  const value = useMemo(
    () => ({ items, loadHistory, addHistory }),
    [items, loadHistory, addHistory],
  );

  return <HistoryContext.Provider value={value}>{children}</HistoryContext.Provider>;
}

export function useHistoryStore() {
  const context = useContext(HistoryContext);
  if (!context) {
    throw new Error("useHistoryStore must be used within HistoryProvider");
  }
  return context;
}
