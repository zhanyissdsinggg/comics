"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { apiGet, apiPost } from "../lib/apiClient";

const FollowContext = createContext(null);

export function FollowProvider({ children }) {
  const [followedSeriesIds, setFollowedSeriesIds] = useState([]);

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

  const value = useMemo(
    () => ({
      followedSeriesIds,
      loadFollowed,
      follow,
      unfollow,
    }),
    [followedSeriesIds, loadFollowed, follow, unfollow]
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
