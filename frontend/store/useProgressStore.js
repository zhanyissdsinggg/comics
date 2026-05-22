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
import { emitAuthRequired } from "../lib/authBus";
import { normalizeReadingPercent } from "../lib/readingPercent";
import { useAuthStore } from "./useAuthStore";

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
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    return {
      ...parsed,
      percent: normalizeReadingPercent(parsed.percent),
    };
  } catch (err) {
    return null;
  }
}

function normalizeProgressMap(source) {
  if (!source || typeof source !== "object") {
    return {};
  }

  return Object.entries(source).reduce((acc, [seriesId, value]) => {
    if (!value || typeof value !== "object") {
      return acc;
    }

    acc[seriesId] = {
      ...value,
      percent: normalizeReadingPercent(value.percent),
    };
    return acc;
  }, {});
}

export function ProgressProvider({ children }) {
  const { isSignedIn } = useAuthStore();
  const [bySeriesId, setBySeriesId] = useState({});
  const [loaded, setLoaded] = useState(false);
  const pendingRef = useRef({});
  const timerRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (!isSignedIn) {
      setBySeriesId({});
      return;
    }
    const keys = Object.keys(window.localStorage).filter((key) =>
      key.startsWith("mn_progress_"),
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
  }, [isSignedIn]);

  useEffect(() => {
    if (!isSignedIn) {
      setLoaded(true);
      return undefined;
    }

    apiGet("/api/progress", { suppressAuthModal: true }).then((response) => {
      if (response.ok && response.data?.progress) {
        const normalizedProgress = normalizeProgressMap(response.data.progress);
        setBySeriesId(normalizedProgress);
        if (typeof window !== "undefined") {
          Object.entries(normalizedProgress).forEach(([seriesId, value]) => {
            window.localStorage.setItem(
              getProgressKey(seriesId),
              JSON.stringify(value),
            );
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
  }, [isSignedIn]);

  const setProgress = useCallback(
    (seriesId, episodeId, percent, options = {}) => {
      const normalizedPercent = normalizeReadingPercent(percent);
      const payload = {
        lastEpisodeId: episodeId,
        percent: normalizedPercent,
        updatedAt: Date.now(),
      };

      if (!isSignedIn) {
        if (options.requireAuth === true) {
          emitAuthRequired({ source: "progress" });
        }
        return;
      }

      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          getProgressKey(seriesId),
          JSON.stringify(payload),
        );
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
            percent: normalizeReadingPercent(entry.percent),
          });
        });
        timerRef.current = null;
      }, 2000);
    },
    [isSignedIn],
  );

  const loadProgress = useCallback(async () => {
    if (!isSignedIn) {
      setBySeriesId({});
      setLoaded(true);
      return { ok: false, status: 401, error: "UNAUTHENTICATED" };
    }

    const response = await apiGet("/api/progress", { suppressAuthModal: true });
    if (response.ok && response.data?.progress) {
      setBySeriesId(normalizeProgressMap(response.data.progress));
    }
    setLoaded(true);
    return response;
  }, [isSignedIn]);

  const getProgress = useCallback(
    (seriesId) => bySeriesId[seriesId] || null,
    [bySeriesId],
  );

  const value = useMemo(
    () => ({
      bySeriesId,
      progressMap: bySeriesId,
      setProgress,
      getProgress,
      loadProgress,
      loaded,
    }),
    [bySeriesId, getProgress, setProgress, loadProgress, loaded],
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
