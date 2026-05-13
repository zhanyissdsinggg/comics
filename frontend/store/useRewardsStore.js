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
import { useAuthStore } from "./useAuthStore";
import { trackEvent } from "../lib/trackEvent";

const RewardsContext = createContext(null);
const MAKEUP_COST = 5;

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeRewards(state, rewardPts) {
  if (!state) {
    return null;
  }
  const todayKey = getTodayKey();
  const lastCheckInDate = state.lastCheckInDate || "";
  return {
    ...state,
    todayReward: rewardPts ?? state.rewardPts ?? 0,
    canCheckIn: lastCheckInDate !== todayKey,
    makeUpCost: MAKEUP_COST,
  };
}

function unauthenticatedResponse() {
  return { ok: false, status: 401, error: "UNAUTHENTICATED" };
}

export function RewardsProvider({ children }) {
  const [rewards, setRewards] = useState(null);
  const [missions, setMissions] = useState({ daily: [], weekly: [] });
  const { setWallet } = useWalletStore();
  const { isSignedIn } = useAuthStore();

  const loadRewards = useCallback(async () => {
    if (!isSignedIn) {
      return unauthenticatedResponse();
    }
    const response = await apiGet("/api/rewards");
    if (response.ok) {
      setRewards(normalizeRewards(response.data, response.data?.rewardPts));
    }
    return response;
  }, [isSignedIn]);

  const checkIn = useCallback(async () => {
    if (!isSignedIn) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("auth:open"));
      }
      return unauthenticatedResponse();
    }
    trackEvent("checkin_click", {});
    const response = await apiPost("/api/rewards/checkin");
    if (response.ok) {
      trackEvent("checkin_success", {});
      setRewards(
        normalizeRewards(response.data?.state, response.data?.rewardPts),
      );
      if (response.data?.wallet) {
        setWallet(response.data.wallet);
      }
    } else {
      trackEvent("checkin_fail", {
        status: response.status,
        errorCode: response.error,
      });
    }
    return response;
  }, [isSignedIn, setWallet]);

  const makeUp = useCallback(async () => {
    if (!isSignedIn) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("auth:open"));
      }
      return unauthenticatedResponse();
    }
    trackEvent("makeup_click", {});
    const response = await apiPost("/api/rewards/makeup");
    if (response.ok) {
      trackEvent("makeup_success", {});
      setRewards(
        normalizeRewards(response.data?.state, response.data?.rewardPts),
      );
      if (response.data?.wallet) {
        setWallet(response.data.wallet);
      }
    } else {
      trackEvent("makeup_fail", {
        status: response.status,
        errorCode: response.error,
      });
    }
    return response;
  }, [isSignedIn, setWallet]);

  const loadMissions = useCallback(async () => {
    if (!isSignedIn) {
      return unauthenticatedResponse();
    }
    const response = await apiGet("/api/missions");
    if (response.ok) {
      setMissions({
        daily: response.data?.daily || [],
        weekly: response.data?.weekly || [],
      });
    }
    return response;
  }, [isSignedIn]);

  const claimMission = useCallback(
    async (missionId) => {
      if (!isSignedIn) {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("auth:open"));
        }
        return unauthenticatedResponse();
      }
      trackEvent("mission_claim_click", { missionId });
      const response = await apiPost("/api/missions/claim", { missionId });
      if (response.ok) {
        trackEvent("mission_claim_success", { missionId });
        setMissions({
          daily: response.data?.daily || [],
          weekly: response.data?.weekly || [],
        });
        if (response.data?.wallet) {
          setWallet(response.data.wallet);
        }
      } else {
        trackEvent("mission_claim_fail", {
          missionId,
          status: response.status,
          errorCode: response.error,
        });
      }
      return response;
    },
    [isSignedIn, setWallet],
  );

  const report = useCallback(
    async (eventType) => {
      if (!isSignedIn) {
        return unauthenticatedResponse();
      }
      trackEvent("mission_progress_event", { eventType });
      const response = await apiPost("/api/missions/report", { eventType });
      if (response.ok) {
        setMissions({
          daily: response.data?.daily || [],
          weekly: response.data?.weekly || [],
        });
      }
      return response;
    },
    [isSignedIn],
  );

  const value = useMemo(
    () => ({
      rewards,
      missions,
      loadRewards,
      checkIn,
      makeUp,
      loadMissions,
      claimMission,
      report,
    }),
    [
      rewards,
      missions,
      loadRewards,
      checkIn,
      makeUp,
      loadMissions,
      claimMission,
      report,
    ],
  );

  return (
    <RewardsContext.Provider value={value}>{children}</RewardsContext.Provider>
  );
}

export function useRewardsStore() {
  const context = useContext(RewardsContext);
  if (!context) {
    throw new Error("useRewardsStore must be used within RewardsProvider");
  }
  return context;
}
