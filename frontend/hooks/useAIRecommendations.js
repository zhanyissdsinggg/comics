/**
 * useAIRecommendations - AI推荐系统Hook
 *
 * 老王说：这个hook调用后端的AI推荐API，提供三种推荐：
 * 1. 热门作品推荐
 * 2. 个性化推荐（基于用户历史）
 * 3. 相似作品推荐（基于内容相似度）
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { apiGet } from "../lib/apiClient";

/**
 * 获取热门作品推荐
 */
export function usePopularRecommendations(limit = 10) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function fetchPopular() {
      setLoading(true);
      setError(null);

      const response = await apiGet(`/api/recommendations/popular?limit=${limit}`, {
        cacheMs: 60000, // 缓存1分钟
      });

      if (!mounted) return;

      if (response.ok && response.data) {
        // 老王修复：后端返回的是 {series: [...]}，需要提取数组
        setData(response.data.series || []);
      } else {
        setError(response.error || "Failed to load popular recommendations");
      }

      setLoading(false);
    }

    fetchPopular();

    return () => {
      mounted = false;
    };
  }, [limit]);

  return { data, loading, error };
}

/**
 * 获取个性化推荐
 */
export function usePersonalizedRecommendations(userId, limit = 10) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) {
      setData([]);
      setLoading(false);
      return;
    }

    let mounted = true;

    async function fetchPersonalized() {
      setLoading(true);
      setError(null);

      const response = await apiGet(`/api/recommendations/personalized?limit=${limit}`, {
        cacheMs: 30000, // 缓存30秒
      });

      if (!mounted) return;

      if (response.ok && response.data) {
        // 老王修复：后端返回的是 {recommendations: [...]}，需要提取数组
        setData(response.data.recommendations || []);
      } else {
        setError(response.error || "Failed to load personalized recommendations");
      }

      setLoading(false);
    }

    fetchPersonalized();

    return () => {
      mounted = false;
    };
  }, [userId, limit]);

  return { data, loading, error };
}

/**
 * 获取相似作品推荐
 */
export function useSimilarRecommendations(seriesId, limit = 10) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSimilar = useCallback(async () => {
    if (!seriesId) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const response = await apiGet(`/api/recommendations/similar/${seriesId}?limit=${limit}`, {
      cacheMs: 120000, // 缓存2分钟
    });

    if (response.ok && response.data) {
      // 老王修复：后端返回的是 {recommendations: [...]}，需要提取数组
      setData(response.data.recommendations || []);
    } else {
      setError(response.error || "Failed to load similar recommendations");
    }

    setLoading(false);
  }, [seriesId, limit]);

  useEffect(() => {
    fetchSimilar();
  }, [fetchSimilar]);

  return { data, loading, error, refetch: fetchSimilar };
}
