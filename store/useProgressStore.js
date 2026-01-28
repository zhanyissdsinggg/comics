"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

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
  }, []);

  const getProgress = useCallback(
    (seriesId) => bySeriesId[seriesId] || null,
    [bySeriesId]
  );

  const value = useMemo(
    () => ({ bySeriesId, setProgress, getProgress }),
    [bySeriesId, getProgress, setProgress]
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
