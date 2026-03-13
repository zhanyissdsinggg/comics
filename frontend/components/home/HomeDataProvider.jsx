/**
 * HomeDataProvider - home page data orchestration.
 */

"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { apiGet } from "../../lib/apiClient";
import { parallelRequests2 } from "../../lib/parallelRequests";
import { useRetryPolicy } from "../../hooks/useRetryPolicy";
import { useStaleNotice } from "../../hooks/useStaleNotice";
import { useAdultGateStore } from "../../store/useAdultGateStore";

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
  const requestRef = useRef(0);

  const [seriesList, setSeriesList] = useState([]);
  const [seriesResponse, setSeriesResponse] = useState(null);
  const [hotKeywords, setHotKeywords] = useState([]);
  const [hotWindow, setHotWindow] = useState("day");
  const [loading, setLoading] = useState(true);

  const showStale = useStaleNotice(seriesResponse);

  useEffect(() => {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    const adultFlag = isAdultMode ? "1" : "0";
    setLoading(true);

    const isCurrentRequest = () => requestRef.current === requestId;

    parallelRequests2(
      () => apiGet(`/api/series?adult=${adultFlag}`, { cacheMs: 30000 }),
      () => apiGet(`/api/search/hot?adult=${adultFlag}&window=${hotWindow}`, { cacheMs: 60000 }),
    )
      .then(([nextSeriesResponse, nextHotKeywordsResponse]) => {
        if (!isCurrentRequest()) {
          return;
        }

        setSeriesResponse(nextSeriesResponse);
        if (nextSeriesResponse.ok) {
          setSeriesList(nextSeriesResponse.data?.series || []);
          if (nextSeriesResponse.stale) {
            apiGet(`/api/series?adult=${adultFlag}`, {
              cacheMs: 30000,
              bust: true,
              dedupeMs: 0,
            }).then((freshResponse) => {
              if (!isCurrentRequest()) {
                return;
              }
              setSeriesResponse(freshResponse);
              if (freshResponse.ok) {
                setSeriesList(freshResponse.data?.series || []);
              }
            });
          }
        } else if (nextSeriesResponse.error === "ADULT_GATED") {
          forceDisableAdultMode();
          setSeriesList([]);
        } else if (nextSeriesResponse.status === 0 || nextSeriesResponse.status >= 500) {
          if (shouldRetry(`home_series_${adultFlag}`)) {
            setTimeout(() => {
              apiGet(`/api/series?adult=${adultFlag}`, {
                cacheMs: 30000,
                bust: true,
              }).then((retryResponse) => {
                if (!isCurrentRequest()) {
                  return;
                }
                setSeriesResponse(retryResponse);
                if (retryResponse.ok) {
                  setSeriesList(retryResponse.data?.series || []);
                }
              });
            }, 600);
          }
        }

        if (nextHotKeywordsResponse.ok) {
          setHotKeywords(nextHotKeywordsResponse.data?.keywords || []);
          if (nextHotKeywordsResponse.stale) {
            apiGet(`/api/search/hot?adult=${adultFlag}&window=${hotWindow}`, {
              cacheMs: 60000,
              bust: true,
              dedupeMs: 0,
            }).then((freshResponse) => {
              if (!isCurrentRequest() || !freshResponse.ok) {
                return;
              }
              setHotKeywords(freshResponse.data?.keywords || []);
            });
          }
        } else if (nextHotKeywordsResponse.error === "ADULT_GATED") {
          forceDisableAdultMode();
          setHotKeywords([]);
        }
      })
      .finally(() => {
        if (isCurrentRequest()) {
          setLoading(false);
        }
      });
  }, [forceDisableAdultMode, hotWindow, isAdultMode, shouldRetry]);

  return (
    <HomeDataContext.Provider
      value={{
        seriesList,
        hotKeywords,
        hotWindow,
        setHotWindow,
        loading,
        showStale,
      }}
    >
      {children}
    </HomeDataContext.Provider>
  );
}
