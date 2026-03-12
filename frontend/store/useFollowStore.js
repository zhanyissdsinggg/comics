"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useEffect,
} from "react";
import { apiGet, apiPost } from "../lib/apiClient";
import { emitAuthRequired } from "../lib/authBus";

const FollowContext = createContext(null);

// 閼颁胶甯囧▔銊╁櫞閿涙岸绮拋銈嗘暪閽樺繐銇?
const DEFAULT_COLLECTIONS = [
  { id: "default", name: "Default", seriesIds: [] },
  { id: "reading", name: "Reading", seriesIds: [] },
  { id: "completed", name: "Completed", seriesIds: [] },
  { id: "wishlist", name: "Wishlist", seriesIds: [] },
];

export function FollowProvider({ children }) {
  const [followedSeriesIds, setFollowedSeriesIds] = useState([]);
  // NOTE: cleaned corrupted comment.
  const [collections, setCollections] = useState(DEFAULT_COLLECTIONS);

  // NOTE: cleaned corrupted comment.
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const stored = window.localStorage.getItem("mn_collections");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setCollections(parsed);
      } catch (err) {
        console.error("Failed to parse collections:", err);
      }
    }
  }, []);

  // 閼颁胶甯囧▔銊╁櫞閿涙矮绻氱€涙ɑ鏁归挊蹇撱仚閸掔櫦ocalStorage
  const saveCollections = useCallback((newCollections) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("mn_collections", JSON.stringify(newCollections));
    }
    setCollections(newCollections);
  }, []);

  const loadFollowed = useCallback(async () => {
    const response = await apiGet("/api/follow");
    if (response.ok) {
      setFollowedSeriesIds(response.data?.followedSeriesIds || []);
    }
    return response;
  }, []);

  const updateFollow = useCallback(async (seriesId, action) => {
    const response = await apiPost("/api/follow", { seriesId, action });
    if (response.ok) {
      setFollowedSeriesIds(response.data?.followedSeriesIds || []);
      return response;
    }
    if (response.status === 401) {
      emitAuthRequired({ source: "event" });
    }
    return response;
  }, []);

  const follow = useCallback(
    (seriesId) => updateFollow(seriesId, "FOLLOW"),
    [updateFollow]
  );

  const unfollow = useCallback(
    (seriesId) => updateFollow(seriesId, "UNFOLLOW"),
    [updateFollow]
  );

  // NOTE: cleaned corrupted comment.
  const createCollection = useCallback(
    (name) => {
      const newCollection = {
        id: `collection_${Date.now()}`,
        name,
        seriesIds: [],
        createdAt: Date.now(),
      };
      const newCollections = [...collections, newCollection];
      saveCollections(newCollections);
      return newCollection;
    },
    [collections, saveCollections]
  );

  // 閼颁胶甯囧▔銊╁櫞閿涙艾鍨归梽銈嗘暪閽樺繐銇?
  const deleteCollection = useCallback(
    (collectionId) => {
      // NOTE: cleaned corrupted comment.
      if (["default", "reading", "completed", "wishlist"].includes(collectionId)) {
        return { ok: false, error: "Cannot delete default collection" };
      }
      const newCollections = collections.filter((c) => c.id !== collectionId);
      saveCollections(newCollections);
      return { ok: true };
    },
    [collections, saveCollections]
  );

  // NOTE: cleaned corrupted comment.
  const renameCollection = useCallback(
    (collectionId, newName) => {
      const newCollections = collections.map((c) =>
        c.id === collectionId ? { ...c, name: newName } : c
      );
      saveCollections(newCollections);
      return { ok: true };
    },
    [collections, saveCollections]
  );

  // 閼颁胶甯囧▔銊╁櫞閿涙碍鍧婇崝鐘辩稊閸濅礁鍩岄弨鎯版婢?
  const addToCollection = useCallback(
    (collectionId, seriesId) => {
      const newCollections = collections.map((c) => {
        if (c.id === collectionId) {
          // 闁灝鍘ら柌宥咁槻濞ｈ濮?
          if (c.seriesIds.includes(seriesId)) {
            return c;
          }
          return { ...c, seriesIds: [...c.seriesIds, seriesId] };
        }
        return c;
      });
      saveCollections(newCollections);
      return { ok: true };
    },
    [collections, saveCollections]
  );

  // NOTE: cleaned corrupted comment.
  const removeFromCollection = useCallback(
    (collectionId, seriesId) => {
      const newCollections = collections.map((c) => {
        if (c.id === collectionId) {
          return { ...c, seriesIds: c.seriesIds.filter((id) => id !== seriesId) };
        }
        return c;
      });
      saveCollections(newCollections);
      return { ok: true };
    },
    [collections, saveCollections]
  );

  // NOTE: cleaned corrupted comment.
  const getCollectionsForSeries = useCallback(
    (seriesId) => {
      return collections.filter((c) => c.seriesIds.includes(seriesId));
    },
    [collections]
  );

  const value = useMemo(
    () => ({
      followedSeriesIds,
      loadFollowed,
      follow,
      unfollow,
      collections,
      createCollection,
      deleteCollection,
      renameCollection,
      addToCollection,
      removeFromCollection,
      getCollectionsForSeries,
    }),
    [
      followedSeriesIds,
      loadFollowed,
      follow,
      unfollow,
      collections,
      createCollection,
      deleteCollection,
      renameCollection,
      addToCollection,
      removeFromCollection,
      getCollectionsForSeries,
    ]
  );

  return <FollowContext.Provider value={value}>{children}</FollowContext.Provider>;
}

export function useFollowStore() {
  const context = useContext(FollowContext);
  if (!context) {
    throw new Error("useFollowStore must be used within FollowProvider");
  }
  return context;
}