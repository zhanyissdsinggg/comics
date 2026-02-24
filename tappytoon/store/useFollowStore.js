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

const FollowContext = createContext(null);

// 老王注释：默认收藏夹
const DEFAULT_COLLECTIONS = [
  { id: "default", name: "默认收藏夹", seriesIds: [] },
  { id: "reading", name: "正在阅读", seriesIds: [] },
  { id: "completed", name: "已完成", seriesIds: [] },
  { id: "wishlist", name: "想看", seriesIds: [] },
];

export function FollowProvider({ children }) {
  const [followedSeriesIds, setFollowedSeriesIds] = useState([]);
  // 老王注释：收藏夹列表
  const [collections, setCollections] = useState(DEFAULT_COLLECTIONS);

  // 老王注释：从localStorage加载收藏夹
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

  // 老王注释：保存收藏夹到localStorage
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

  // 老王注释：创建新收藏夹
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

  // 老王注释：删除收藏夹
  const deleteCollection = useCallback(
    (collectionId) => {
      // 不允许删除默认收藏夹
      if (["default", "reading", "completed", "wishlist"].includes(collectionId)) {
        return { ok: false, error: "Cannot delete default collection" };
      }
      const newCollections = collections.filter((c) => c.id !== collectionId);
      saveCollections(newCollections);
      return { ok: true };
    },
    [collections, saveCollections]
  );

  // 老王注释：重命名收藏夹
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

  // 老王注释：添加作品到收藏夹
  const addToCollection = useCallback(
    (collectionId, seriesId) => {
      const newCollections = collections.map((c) => {
        if (c.id === collectionId) {
          // 避免重复添加
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

  // 老王注释：从收藏夹移除作品
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

  // 老王注释：获取作品所在的收藏夹
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
