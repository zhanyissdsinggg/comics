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
import { parallelRequests2 } from "../../lib/parallelRequests";
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
  const { isAdultMode, forceDisableAdultMode } = useAdultGateStore();
  const { shouldRetry } = useRetryPolicy();

  const [seriesList, setSeriesList] = useState([]);
  const [seriesResponse, setSeriesResponse] = useState(null);
  const [hotKeywords, setHotKeywords] = useState([]);
  const [hotWindow, setHotWindow] = useState("today");
  const [loading, setLoading] = useState(true);

  const showStale = useStaleNotice(seriesResponse);

  // 老王说：并行加载series和hotKeywords，别tm一个一个地等
  // 这样可以显著提升首屏加载速度
  useEffect(() => {
    const adultFlag = isAdultMode ? "1" : "0";
    setLoading(true);

    // 并行执行两个请求
    parallelRequests2(
      () => apiGet(`/api/series?adult=${adultFlag}`, { cacheMs: 30000 }),
      () => apiGet(`/api/search/hot?adult=${adultFlag}&window=${hotWindow}`)
    )
      .then(([seriesResponse, hotKeywordsResponse]) => {
        // 处理series响应
        setSeriesResponse(seriesResponse);
        if (seriesResponse.ok) {
          setSeriesList(seriesResponse.data?.series || []);
        } else if (seriesResponse.error === "ADULT_GATED") {
          forceDisableAdultMode();
          setSeriesList([]);
        } else if (seriesResponse.status === 0 || seriesResponse.status >= 500) {
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

        // 处理hotKeywords响应
        if (hotKeywordsResponse.ok) {
          setHotKeywords(hotKeywordsResponse.data?.keywords || []);
        } else if (hotKeywordsResponse.error === "ADULT_GATED") {
          forceDisableAdultMode();
          setHotKeywords([]);
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [forceDisableAdultMode, isAdultMode, hotWindow, shouldRetry]);

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
