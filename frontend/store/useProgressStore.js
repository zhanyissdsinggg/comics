"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { apiGet, apiPost } from "../lib/apiClient";

const ProgressContext = createContext(null);

function getProgressKey(seriesId) {
  return `mn_progress_${seriesId}`;
}

function readProgress(seriesId) {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = window.localStorage.getItem(getProgressKey(seriesId));
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

export function ProgressProvider({ children }) {
  const [bySeriesId, setBySeriesId] = useState({});
  const [loaded, setLoaded] = useState(false);
  const pendingRef = useRef({});
  const timerRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const keys = Object.keys(window.localStorage).filter((key) =>
      key.startsWith("mn_progress_")
    );
    const next = {};
    keys.forEach((key) => {
      const seriesId = key.replace("mn_progress_", "");
      const value = readProgress(seriesId);
      if (value) {
        next[seriesId] = value;
      }
    });
    setBySeriesId(next);
  }, []);

  useEffect(() => {
    apiGet("/api/progress").then((response) => {
      if (response.ok && response.data?.progress) {
        setBySeriesId(response.data.progress);
        if (typeof window !== "undefined") {
          Object.entries(response.data.progress).forEach(([seriesId, value]) => {
            window.localStorage.setItem(getProgressKey(seriesId), JSON.stringify(value));
          });
        }
      }
      setLoaded(true);
    });
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const setProgress = useCallback((seriesId, episodeId, percent) => {
    const payload = {
      lastEpisodeId: episodeId,
      percent,
      updatedAt: Date.now(),
    };
    if (typeof window !== "undefined") {
      window.localStorage.setItem(getProgressKey(seriesId), JSON.stringify(payload));
    }
    setBySeriesId((prev) => ({ ...prev, [seriesId]: payload }));
    pendingRef.current[seriesId] = payload;
    if (timerRef.current) {
      return;
    }
    timerRef.current = setTimeout(() => {
      const batch = pendingRef.current;
      pendingRef.current = {};
      Object.entries(batch).forEach(([id, entry]) => {
        apiPost("/api/progress/update", {
          seriesId: id,
          lastEpisodeId: entry.lastEpisodeId,
          percent: entry.percent,
        });
      });
      timerRef.current = null;
    }, 2000);
  }, []);

  const loadProgress = useCallback(async () => {
    const response = await apiGet("/api/progress");
    if (response.ok && response.data?.progress) {
      setBySeriesId(response.data.progress);
    }
    setLoaded(true);
    return response;
  }, []);

  const getProgress = useCallback(
    (seriesId) => bySeriesId[seriesId] || null,
    [bySeriesId]
  );

  const value = useMemo(
    () => ({ bySeriesId, setProgress, getProgress, loadProgress, loaded }),
    [bySeriesId, getProgress, setProgress, loadProgress, loaded]
  );

  return (
    <ProgressContext.Provider value={value}>
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgressStore() {
  const context = useContext(ProgressContext);
  if (!context) {
    throw new Error("useProgressStore must be used within ProgressProvider");
  }
  return context;
}
