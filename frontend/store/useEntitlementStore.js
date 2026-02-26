"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { apiGet, apiPost } from "../lib/apiClient";
import { useWalletStore } from "./useWalletStore";
import { useRewardsStore } from "./useRewardsStore";

const EntitlementContext = createContext(null);

export function EntitlementProvider({ children }) {
  const [bySeriesId, setBySeriesId] = useState({});
  const inflightRef = useRef(new Map());
  const { setWallet } = useWalletStore();
  const { report } = useRewardsStore();

  const withInflight = useCallback(async (key, handler) => {
    if (inflightRef.current.has(key)) {
      return inflightRef.current.get(key);
    }
    const requestPromise = handler();
    inflightRef.current.set(key, requestPromise);
    try {
      return await requestPromise;
    } finally {
      inflightRef.current.delete(key);
    }
  }, []);

  const loadEntitlement = useCallback(async (seriesId) => {
    const response = await apiGet(`/api/entitlements?seriesId=${seriesId}`);
    if (!response.ok) {
      return response;
    }
    const entitlement = response.data?.entitlement;
    if (entitlement?.seriesId) {
      setBySeriesId((prev) => ({ ...prev, [entitlement.seriesId]: entitlement }));
    }
    return response;
  }, []);

  const unlockEpisode = useCallback(
    async (seriesId, episodeId, idempotencyKey) =>
      withInflight(`unlock:${seriesId}:${episodeId}`, async () => {
        const response = await apiPost("/api/entitlements", {
          seriesId,
          episodeId,
          method: "WALLET",
          idempotencyKey,
        });
        if (!response.ok) {
          return response;
        }
        const entitlement = response.data?.entitlement;
        if (entitlement?.seriesId) {
          setBySeriesId((prev) => ({ ...prev, [entitlement.seriesId]: entitlement }));
        }
        if (response.data?.wallet) {
          setWallet(response.data.wallet);
        }
        report("UNLOCK_EPISODE");
        return response;
      }),
    [report, setWallet, withInflight]
  );

  const unlockPack = useCallback(
    async (seriesId, episodeIds, offerId) =>
      withInflight(`pack:${seriesId}:${offerId}`, async () => {
        const response = await apiPost("/api/entitlements", {
          seriesId,
          episodeIds,
          offerId,
          method: "PACK",
        });
        if (!response.ok) {
          return response;
        }
        const entitlement = response.data?.entitlement;
        if (entitlement?.seriesId) {
          setBySeriesId((prev) => ({ ...prev, [entitlement.seriesId]: entitlement }));
        }
        if (response.data?.wallet) {
          setWallet(response.data.wallet);
        }
        report("UNLOCK_EPISODE");
        return response;
      }),
    [report, setWallet, withInflight]
  );

  const claimTTF = useCallback(
    async (seriesId, episodeId) =>
      withInflight(`ttf:${seriesId}:${episodeId}`, async () => {
        const response = await apiPost("/api/entitlements", {
          seriesId,
          episodeId,
          method: "TTF",
        });
        if (!response.ok) {
          return response;
        }
        const entitlement = response.data?.entitlement;
        if (entitlement?.seriesId) {
          setBySeriesId((prev) => ({ ...prev, [entitlement.seriesId]: entitlement }));
        }
        if (response.data?.wallet) {
          setWallet(response.data.wallet);
        }
        report("UNLOCK_EPISODE");
        return response;
      }),
    [report, setWallet, withInflight]
  );

  const value = useMemo(
    () => ({ bySeriesId, loadEntitlement, unlockEpisode, unlockPack, claimTTF }),
    [bySeriesId, loadEntitlement, unlockEpisode, unlockPack, claimTTF]
  );

  return (
    <EntitlementContext.Provider value={value}>
      {children}
    </EntitlementContext.Provider>
  );
}

export function useEntitlementStore() {
  const context = useContext(EntitlementContext);
  if (!context) {
    throw new Error("useEntitlementStore must be used within EntitlementProvider");
  }
  return context;
}
