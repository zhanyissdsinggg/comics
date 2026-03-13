"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiGet } from "../lib/apiClient";

function extractList(payload, key) {
  if (!payload || typeof payload !== "object") {
    return [];
  }
  const value = payload[key];
  return Array.isArray(value) ? value : [];
}

function useRecommendationQuery({
  enabled = true,
  path,
  cacheMs,
  resultKey,
  fallbackError,
}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(Boolean(enabled && path));
  const [error, setError] = useState(null);
  const requestRef = useRef(0);

  const fetchData = useCallback(
    async ({ bust = false, showLoading = true } = {}) => {
      if (!enabled || !path) {
        requestRef.current += 1;
        setData([]);
        setError(null);
        setLoading(false);
        return null;
      }

      const requestId = requestRef.current + 1;
      requestRef.current = requestId;

      if (showLoading) {
        setLoading(true);
      }
      setError(null);

      const options = bust
        ? {
            cacheMs,
            bust: true,
            dedupeMs: 0,
          }
        : { cacheMs };
      const response = await apiGet(path, options);
      if (requestRef.current !== requestId) {
        return response;
      }

      if (response.ok && response.data) {
        setData(extractList(response.data, resultKey));
        if (showLoading) {
          setLoading(false);
        }

        if (!bust && response.stale) {
          apiGet(path, {
            cacheMs,
            bust: true,
            dedupeMs: 0,
          }).then((freshResponse) => {
            if (requestRef.current !== requestId || !freshResponse.ok || !freshResponse.data) {
              return;
            }
            setData(extractList(freshResponse.data, resultKey));
            setError(null);
          });
        }

        return response;
      }

      setData([]);
      setError(response.error || fallbackError);
      if (showLoading) {
        setLoading(false);
      }
      return response;
    },
    [cacheMs, enabled, fallbackError, path, resultKey]
  );

  useEffect(() => {
    if (!enabled || !path) {
      requestRef.current += 1;
      setData([]);
      setError(null);
      setLoading(false);
      return;
    }

    fetchData();
  }, [enabled, fetchData, path]);

  const refetch = useCallback(() => fetchData({ bust: true }), [fetchData]);

  return { data, loading, error, refetch };
}

export function usePopularRecommendations(limit = 10) {
  return useRecommendationQuery({
    path: `/api/recommendations/popular?limit=${limit}`,
    cacheMs: 60_000,
    resultKey: "series",
    fallbackError: "Failed to load popular recommendations",
  });
}

export function usePersonalizedRecommendations(userId, limit = 10) {
  return useRecommendationQuery({
    enabled: Boolean(userId),
    path: userId ? `/api/recommendations/personalized?limit=${limit}` : "",
    cacheMs: 30_000,
    resultKey: "recommendations",
    fallbackError: "Failed to load personalized recommendations",
  });
}

export function useSimilarRecommendations(seriesId, limit = 10) {
  return useRecommendationQuery({
    enabled: Boolean(seriesId),
    path: seriesId ? `/api/recommendations/similar/${seriesId}?limit=${limit}` : "",
    cacheMs: 120_000,
    resultKey: "recommendations",
    fallbackError: "Failed to load similar recommendations",
  });
}
