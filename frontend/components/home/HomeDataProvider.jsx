/**
 * HomeDataProvider - home page data orchestration.
 */

"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { apiGet } from "../../lib/apiClient";
import { getContentModeQueryParam } from "../../lib/contentFilters";
import { parallelRequests3 } from "../../lib/parallelRequests";
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

export function HomeDataProvider({ children, initialData = null }) {
  const { shouldRetry } = useRetryPolicy();
  const { contentMode } = useAdultGateStore();
  const requestRef = useRef(0);
  const initialSeriesList = Array.isArray(initialData?.seriesList)
    ? initialData.seriesList
    : [];
  const initialHotKeywords = Array.isArray(initialData?.hotKeywords)
    ? initialData.hotKeywords
    : [];
  const initialHomepageSlots = Array.isArray(initialData?.homepageSlots)
    ? initialData.homepageSlots
    : [];
  const hasInitialData = Boolean(initialData?.ready);

  const [seriesList, setSeriesList] = useState(initialSeriesList);
  const [seriesResponse, setSeriesResponse] = useState(null);
  const [hotKeywords, setHotKeywords] = useState(initialHotKeywords);
  const [homepageSlots, setHomepageSlots] = useState(initialHomepageSlots);
  const [hotWindow, setHotWindow] = useState("day");
  const [loading, setLoading] = useState(!hasInitialData);

  const showStale = useStaleNotice(seriesResponse);

  useEffect(() => {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    const adultFlag = getContentModeQueryParam(contentMode);
    if (!hasInitialData) {
      setLoading(true);
    }

    const isCurrentRequest = () => requestRef.current === requestId;

    parallelRequests3(
      () => apiGet(`/api/series?adult=${adultFlag}`, { cacheMs: 30000 }),
      () =>
        apiGet(`/api/search/hot?adult=${adultFlag}&window=${hotWindow}`, {
          cacheMs: 60000,
        }),
      () =>
        apiGet(`/api/recommendations/homepage?adult=${adultFlag}`, {
          cacheMs: 60000,
        }),
    )
      .then(
        ([
          nextSeriesResponse,
          nextHotKeywordsResponse,
          nextHomepageSlotsResponse,
        ]) => {
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
          } else if (
            nextSeriesResponse.status === 0 ||
            nextSeriesResponse.status >= 500
          ) {
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
          }

          if (nextHomepageSlotsResponse.ok) {
            setHomepageSlots(nextHomepageSlotsResponse.data?.slots || []);
            if (nextHomepageSlotsResponse.stale) {
              apiGet(`/api/recommendations/homepage?adult=${adultFlag}`, {
                cacheMs: 60000,
                bust: true,
                dedupeMs: 0,
              }).then((freshResponse) => {
                if (!isCurrentRequest() || !freshResponse.ok) {
                  return;
                }
                setHomepageSlots(freshResponse.data?.slots || []);
              });
            }
          } else {
            setHomepageSlots([]);
          }
        },
      )
      .finally(() => {
        if (isCurrentRequest()) {
          setLoading(false);
        }
      });
  }, [contentMode, hasInitialData, hotWindow, shouldRetry]);

  return (
    <HomeDataContext.Provider
      value={{
        seriesList,
        hotKeywords,
        homepageSlots,
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
