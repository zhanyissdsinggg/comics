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

export function HistoryProvider({ children }) {
  const { isSignedIn } = useAuthStore();
  const [items, setItems] = useState([]);

  const loadHistory = useCallback(async () => {
    if (!isSignedIn) {
      return { ok: false, status: 401, error: "UNAUTHENTICATED" };
    }
    const response = await apiGet("/api/history");
    if (response.ok && response.data?.history) {
      setItems(response.data.history);
    }
    return response;
  }, [isSignedIn]);

  // 老王修复：只有登录用户才加载历史记录，避免401错误
  useEffect(() => {
    if (isSignedIn) {
      loadHistory();
    }
  }, [isSignedIn, loadHistory]);

  const addHistory = useCallback(
    async (payload) => {
      if (!isSignedIn) {
        return { ok: false, status: 401, error: "UNAUTHENTICATED" };
      }
      const response = await apiPost("/api/history", payload);
      if (response.ok && response.data?.history) {
        setItems(response.data.history);
      }
      return response;
    },
    [isSignedIn]
  );

  const value = useMemo(
    () => ({ items, loadHistory, addHistory }),
    [items, loadHistory, addHistory]
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
