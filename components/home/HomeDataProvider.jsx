/**
 * HomeDataProvider - 负责获取首页所需的所有数据
 *
 * 职责：
 * - 获取series列表
 * - 获取热门关键词
 * - 处理API错误和重试
 * - 提供数据给子组件
 */

"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { apiGet } from "../../lib/apiClient";
import { useAdultGateStore } from "../../store/useAdultGateStore";
import { useRetryPolicy } from "../../hooks/useRetryPolicy";
import { useStaleNotice } from "../../hooks/useStaleNotice";

const HomeDataContext = createContext(null);

export function useHomeData() {
  const context = useContext(HomeDataContext);
  if (!context) {
    throw new Error("useHomeData must be used within HomeDataProvider");
  }
  return context;
}

export function HomeDataProvider({ children }) {
  const { isAdultMode } = useAdultGateStore();
  const { shouldRetry } = useRetryPolicy();

  const [seriesList, setSeriesList] = useState([]);
  const [seriesResponse, setSeriesResponse] = useState(null);
  const [hotKeywords, setHotKeywords] = useState([]);
  const [hotWindow, setHotWindow] = useState("today");
  const [loading, setLoading] = useState(true);

  const showStale = useStaleNotice(seriesResponse);

  // Fetch series list
  useEffect(() => {
    const adultFlag = isAdultMode ? "1" : "0";
    setLoading(true);

    apiGet(`/api/series?adult=${adultFlag}`, { cacheMs: 30000 })
      .then((response) => {
        setSeriesResponse(response);
        if (response.ok) {
          setSeriesList(response.data?.series || []);
        } else if (response.status === 0 || response.status >= 500) {
          // Retry on network or server errors
          if (shouldRetry(`home_series_${adultFlag}`)) {
            setTimeout(() => {
              apiGet(`/api/series?adult=${adultFlag}`, {
                cacheMs: 30000,
                bust: true
              }).then((retryResponse) => {
                setSeriesResponse(retryResponse);
                if (retryResponse.ok) {
                  setSeriesList(retryResponse.data?.series || []);
                }
              });
            }, 600);
          }
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isAdultMode, shouldRetry]);

  // Fetch hot keywords
  useEffect(() => {
    const adultFlag = isAdultMode ? "1" : "0";
    apiGet(`/api/search/hot?adult=${adultFlag}&window=${hotWindow}`)
      .then((response) => {
        if (response.ok) {
          setHotKeywords(response.data?.keywords || []);
        }
      });
  }, [isAdultMode, hotWindow]);

  const value = {
    seriesList,
    hotKeywords,
    hotWindow,
    setHotWindow,
    loading,
    showStale,
  };

  return (
    <HomeDataContext.Provider value={value}>
      {children}
    </HomeDataContext.Provider>
  );
}
