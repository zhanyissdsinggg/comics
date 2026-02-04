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
import { track } from "../lib/analytics";

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

export function RewardsProvider({ children }) {
  const [rewards, setRewards] = useState(null);
  const [missions, setMissions] = useState({ daily: [], weekly: [] });
  const { setWallet } = useWalletStore();

  const loadRewards = useCallback(async () => {
    const response = await apiGet("/api/rewards");
    if (response.ok) {
      setRewards(normalizeRewards(response.data, response.data?.rewardPts));
    }
    return response;
  }, []);

  const checkIn = useCallback(async () => {
    track("checkin_click", {});
    const response = await apiPost("/api/rewards/checkin");
    if (response.ok) {
      track("checkin_success", {});
      setRewards(normalizeRewards(response.data?.state, response.data?.rewardPts));
      if (response.data?.wallet) {
        setWallet(response.data.wallet);
      }
    } else {
      track("checkin_fail", { status: response.status, errorCode: response.error });
    }
    return response;
  }, [setWallet]);

  const makeUp = useCallback(async () => {
    track("makeup_click", {});
    const response = await apiPost("/api/rewards/makeup");
    if (response.ok) {
      track("makeup_success", {});
      setRewards(normalizeRewards(response.data?.state, response.data?.rewardPts));
      if (response.data?.wallet) {
        setWallet(response.data.wallet);
      }
    } else {
      track("makeup_fail", { status: response.status, errorCode: response.error });
    }
    return response;
  }, [setWallet]);

  const loadMissions = useCallback(async () => {
    const response = await apiGet("/api/missions");
    if (response.ok) {
      setMissions({
        daily: response.data?.daily || [],
        weekly: response.data?.weekly || [],
      });
    }
    return response;
  }, []);

  const claimMission = useCallback(
    async (missionId) => {
      track("mission_claim_click", { missionId });
      const response = await apiPost("/api/missions/claim", { missionId });
      if (response.ok) {
        track("mission_claim_success", { missionId });
        setMissions({
          daily: response.data?.daily || [],
          weekly: response.data?.weekly || [],
        });
        if (response.data?.wallet) {
          setWallet(response.data.wallet);
        }
      } else {
        track("mission_claim_fail", { missionId, status: response.status, errorCode: response.error });
      }
      return response;
    },
    [setWallet]
  );

  const report = useCallback(async (eventType) => {
    track("mission_progress_event", { eventType });
    const response = await apiPost("/api/missions/report", { eventType });
    if (response.ok) {
      setMissions({
        daily: response.data?.daily || [],
        weekly: response.data?.weekly || [],
      });
    }
    return response;
  }, []);

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
    [rewards, missions, loadRewards, checkIn, makeUp, loadMissions, claimMission, report]
  );

  return <RewardsContext.Provider value={value}>{children}</RewardsContext.Provider>;
}

export function useRewardsStore() {
  const context = useContext(RewardsContext);
  if (!context) {
    throw new Error("useRewardsStore must be used within RewardsProvider");
  }
  return context;
}
