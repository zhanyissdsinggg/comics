"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const BehaviorContext = createContext(null);
const STORAGE_KEY = "mn_behavior_v1";
const MAX_EVENTS = 200;

function readBehavior() {
  if (typeof window === "undefined") {
    return { events: [] };
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return { events: [] };
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    return { events: [] };
  }
}

function writeBehavior(payload) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function BehaviorProvider({ children }) {
  const [behavior, setBehavior] = useState({ events: [] });

  useEffect(() => {
    setBehavior(readBehavior());
  }, []);

  const pushEvent = useCallback((event) => {
    setBehavior((prev) => {
      const nextEvents = [event, ...(prev.events || [])].slice(0, MAX_EVENTS);
      const next = { ...prev, events: nextEvents };
      writeBehavior(next);
      return next;
    });
  }, []);

  const viewSeries = useCallback(
    (seriesId) =>
      pushEvent({ type: "view_series", seriesId, ts: Date.now() }),
    [pushEvent]
  );

  const readEpisode = useCallback(
    (seriesId, episodeId) =>
      pushEvent({ type: "read_episode", seriesId, episodeId, ts: Date.now() }),
    [pushEvent]
  );

  const unlockEpisode = useCallback(
    (seriesId, episodeId) =>
      pushEvent({ type: "unlock_episode", seriesId, episodeId, ts: Date.now() }),
    [pushEvent]
  );

  const followSeries = useCallback(
    (seriesId) =>
      pushEvent({ type: "follow_series", seriesId, ts: Date.now() }),
    [pushEvent]
  );

  const value = useMemo(
    () => ({
      behavior,
      viewSeries,
      readEpisode,
      unlockEpisode,
      followSeries,
    }),
    [behavior, viewSeries, readEpisode, unlockEpisode, followSeries]
  );

  return (
    <BehaviorContext.Provider value={value}>
      {children}
    </BehaviorContext.Provider>
  );
}

export function useBehaviorStore() {
  const context = useContext(BehaviorContext);
  if (!context) {
    throw new Error("useBehaviorStore must be used within BehaviorProvider");
  }
  return context;
}
