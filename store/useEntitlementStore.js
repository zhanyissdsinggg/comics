"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { apiGet, apiPost } from "../lib/apiClient";
import { useWalletStore } from "./useWalletStore";
import { useRewardsStore } from "./useRewardsStore";

const EntitlementContext = createContext(null);

export function EntitlementProvider({ children }) {
  const [bySeriesId, setBySeriesId] = useState({});
  const { setWallet } = useWalletStore();
  const { report } = useRewardsStore();

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
    async (seriesId, episodeId, idempotencyKey) => {
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
    },
    [report, setWallet]
  );

  const claimTTF = useCallback(
    async (seriesId, episodeId) => {
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
    },
    [report, setWallet]
  );

  const value = useMemo(
    () => ({ bySeriesId, loadEntitlement, unlockEpisode, claimTTF }),
    [bySeriesId, loadEntitlement, unlockEpisode, claimTTF]
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
