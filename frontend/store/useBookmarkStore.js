"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { apiDelete, apiGet, apiPost } from "../lib/apiClient";
import { normalizeReadingPercent } from "../lib/readingPercent";
import { useAuthStore } from "./useAuthStore";

const BookmarkContext = createContext(null);
const STORAGE_KEY = "mn_bookmarks_v1";

function readBookmarks() {
  if (typeof window === "undefined") {
    return {};
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return {};
  }
  try {
    return normalizeBookmarks(JSON.parse(raw) || {});
  } catch (err) {
    return {};
  }
}

function writeBookmarks(next) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

function createBookmarkId() {
  return `bm_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

function normalizeBookmarks(source) {
  if (!source || typeof source !== "object") {
    return {};
  }

  return Object.entries(source).reduce((acc, [seriesId, entries]) => {
    if (!Array.isArray(entries)) {
      return acc;
    }

    acc[seriesId] = entries.map((entry) => ({
      ...entry,
      percent: normalizeReadingPercent(entry?.percent),
    }));
    return acc;
  }, {});
}

export function BookmarkProvider({ children }) {
  const { isSignedIn } = useAuthStore();
  const [bookmarksBySeries, setBookmarksBySeries] = useState({});

  useEffect(() => {
    setBookmarksBySeries(readBookmarks());
  }, []);

  useEffect(() => {
    if (!isSignedIn) {
      return;
    }
    apiGet("/api/bookmarks").then((response) => {
      if (response.ok && response.data?.bookmarks) {
        const normalizedBookmarks = normalizeBookmarks(response.data.bookmarks);
        setBookmarksBySeries(normalizedBookmarks);
        writeBookmarks(normalizedBookmarks);
      }
    });
  }, [isSignedIn]);

  const addBookmark = useCallback(
    (seriesId, entry) => {
      const normalizedPercent = normalizeReadingPercent(entry.percent);
      const bookmark = {
        id: createBookmarkId(),
        seriesId,
        episodeId: entry.episodeId,
        percent: normalizedPercent,
        pageIndex: entry.pageIndex || 0,
        label: entry.label || "Bookmark",
        createdAt: new Date().toISOString(),
      };
      setBookmarksBySeries((prev) => {
        const list = Array.isArray(prev[seriesId]) ? prev[seriesId] : [];
        const next = { ...prev, [seriesId]: [bookmark, ...list].slice(0, 50) };
        writeBookmarks(next);
        return next;
      });
      if (isSignedIn) {
        apiPost("/api/bookmarks", { seriesId, bookmark });
      }
      return bookmark;
    },
    [isSignedIn],
  );

  const removeBookmark = useCallback(
    (seriesId, bookmarkId) => {
      setBookmarksBySeries((prev) => {
        const list = Array.isArray(prev[seriesId]) ? prev[seriesId] : [];
        const nextList = list.filter((item) => item.id !== bookmarkId);
        const next = { ...prev, [seriesId]: nextList };
        writeBookmarks(next);
        return next;
      });
      if (isSignedIn) {
        apiDelete("/api/bookmarks", { seriesId, bookmarkId });
      }
    },
    [isSignedIn],
  );

  const value = useMemo(
    () => ({ bookmarksBySeries, addBookmark, removeBookmark }),
    [bookmarksBySeries, addBookmark, removeBookmark],
  );

  return (
    <BookmarkContext.Provider value={value}>
      {children}
    </BookmarkContext.Provider>
  );
}

export function useBookmarkStore() {
  const context = useContext(BookmarkContext);
  if (!context) {
    throw new Error("useBookmarkStore must be used within BookmarkProvider");
  }
  return context;
}
