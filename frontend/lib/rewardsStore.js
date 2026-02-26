import { getUserIdFromCookies as getUserId } from "./serverStore";
import { getWallet, setWallet } from "./serverStore";

const rewardsByUser = new Map();
const missionsByUser = new Map();

const STREAK_REWARDS = [10, 12, 14, 16, 18, 20, 30];
const MAKEUP_COST = 5;

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function getWeekKey() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const week = Math.ceil(
    ((now - new Date(Date.UTC(year, 0, 1))) / 86400000 +
      new Date(Date.UTC(year, 0, 1)).getUTCDay() +
      1) /
      7
  );
  return `${year}-W${week}`;
}

function ensureRewards(userId) {
  if (!rewardsByUser.has(userId)) {
    rewardsByUser.set(userId, {
      lastCheckInDate: null,
      streakCount: 0,
      makeUpUsedToday: false,
    });
  }
  return rewardsByUser.get(userId);
}

function ensureMissions(userId) {
  if (!missionsByUser.has(userId)) {
    missionsByUser.set(userId, {
      dailyReset: getToday(),
      weeklyReset: getWeekKey(),
      daily: [
        { id: "read_once", title: "Read 1 episode", desc: "Read any episode", progress: 0, target: 1, reward: 5, claimed: false },
        { id: "follow_once", title: "Follow 1 series", desc: "Follow any series", progress: 0, target: 1, reward: 5, claimed: false },
        { id: "share_once", title: "Share 1 series", desc: "Share any series", progress: 0, target: 1, reward: 5, claimed: false },
      ],
      weekly: [
        { id: "read_ten", title: "Read 10 episodes", desc: "Read 10 episodes", progress: 0, target: 10, reward: 30, claimed: false },
        { id: "unlock_three", title: "Unlock 3 episodes", desc: "Unlock 3 episodes", progress: 0, target: 3, reward: 20, claimed: false },
      ],
    });
  }
  return missionsByUser.get(userId);
}

function resetIfNeeded(state) {
  const today = getToday();
  const week = getWeekKey();
  if (state.dailyReset !== today) {
    state.dailyReset = today;
    state.daily = state.daily.map((mission) => ({
      ...mission,
      progress: 0,
      claimed: false,
    }));
  }
  if (state.weeklyReset !== week) {
    state.weeklyReset = week;
    state.weekly = state.weekly.map((mission) => ({
      ...mission,
      progress: 0,
      claimed: false,
    }));
  }
}

export function getUserIdFromCookies(request) {
  return getUserId(request);
}

export function getRewardsState(userId) {
  const rewards = ensureRewards(userId);
  const today = getToday();
  const streakIndex = Math.min(rewards.streakCount, STREAK_REWARDS.length - 1);
  const todayReward = STREAK_REWARDS[streakIndex];
  return {
    ...rewards,
    today,
    todayReward,
    makeUpCost: MAKEUP_COST,
    canCheckIn: rewards.lastCheckInDate !== today,
  };
}

export function performCheckIn(userId) {
  const rewards = ensureRewards(userId);
  const today = getToday();
  if (rewards.lastCheckInDate === today) {
    return { ok: false, error: "ALREADY_CHECKED_IN" };
  }
  rewards.lastCheckInDate = today;
  rewards.streakCount += 1;
  rewards.makeUpUsedToday = false;
  const streakIndex = Math.min(rewards.streakCount - 1, STREAK_REWARDS.length - 1);
  const bonus = STREAK_REWARDS[streakIndex];
  const wallet = getWallet(userId);
  const nextWallet = { ...wallet, bonusPts: (wallet.bonusPts || 0) + bonus };
  setWallet(userId, nextWallet);
  return { ok: true, rewards: getRewardsState(userId), wallet: nextWallet };
}

export function makeUpCheckIn(userId) {
  const rewards = ensureRewards(userId);
  const today = getToday();
  if (rewards.makeUpUsedToday) {
    return { ok: false, error: "MAKEUP_USED" };
  }
  const wallet = getWallet(userId);
  if ((wallet.paidPts || 0) < MAKEUP_COST) {
    return { ok: false, error: "INSUFFICIENT_PTS" };
  }
  rewards.makeUpUsedToday = true;
  rewards.streakCount += 1;
  const nextWallet = { ...wallet, paidPts: wallet.paidPts - MAKEUP_COST };
  setWallet(userId, nextWallet);
  return { ok: true, rewards: getRewardsState(userId), wallet: nextWallet };
}

export function getMissionsState(userId) {
  const missions = ensureMissions(userId);
  resetIfNeeded(missions);
  return { daily: missions.daily, weekly: missions.weekly };
}

export function reportMissionEvent(userId, eventType) {
  const missions = ensureMissions(userId);
  resetIfNeeded(missions);
  const update = (missionId, delta) => {
    missions.daily.forEach((mission) => {
      if (mission.id === missionId && !mission.claimed) {
        mission.progress = Math.min(mission.target, mission.progress + delta);
      }
    });
    missions.weekly.forEach((mission) => {
      if (mission.id === missionId && !mission.claimed) {
        mission.progress = Math.min(mission.target, mission.progress + delta);
      }
    });
  };

  if (eventType === "READ_EPISODE") {
    update("read_once", 1);
    update("read_ten", 1);
  }
  if (eventType === "FOLLOW_SERIES") {
    update("follow_once", 1);
  }
  if (eventType === "SHARE_SERIES") {
    update("share_once", 1);
  }
  if (eventType === "UNLOCK_EPISODE") {
    update("unlock_three", 1);
  }
  return { ok: true, missions: getMissionsState(userId) };
}

export function claimMission(userId, missionId) {
  const missions = ensureMissions(userId);
  resetIfNeeded(missions);
  const all = [...missions.daily, ...missions.weekly];
  const mission = all.find((item) => item.id === missionId);
  if (!mission) {
    return { ok: false, error: "MISSION_NOT_FOUND" };
  }
  if (mission.claimed || mission.progress < mission.target) {
    return { ok: false, error: "MISSION_NOT_READY" };
  }
  mission.claimed = true;
  const wallet = getWallet(userId);
  const nextWallet = { ...wallet, bonusPts: (wallet.bonusPts || 0) + mission.reward };
  setWallet(userId, nextWallet);
  return { ok: true, missions: getMissionsState(userId), wallet: nextWallet };
}
