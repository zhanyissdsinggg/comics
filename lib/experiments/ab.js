"use client";

import { getCookie, setCookie } from "../cookies";
import { track } from "../analytics";

const USER_ID_KEY = "mn_user_id";
const exposureCache = new Set();

function hashString(input) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = (hash * 16777619) >>> 0;
  }
  return hash;
}

export function getOrCreateUserId() {
  if (typeof window === "undefined") {
    return "guest";
  }
  const fromCookie = getCookie(USER_ID_KEY);
  if (fromCookie) {
    return fromCookie;
  }
  const stored = window.localStorage.getItem(USER_ID_KEY);
  if (stored) {
    setCookie(USER_ID_KEY, stored);
    return stored;
  }
  const generated =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `uid_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
  window.localStorage.setItem(USER_ID_KEY, generated);
  setCookie(USER_ID_KEY, generated);
  return generated;
}

export function getBucket(userId, experimentId) {
  const key = `${userId}:${experimentId}`;
  const hash = hashString(key);
  const bucketIndex = hash % 3;
  if (bucketIndex === 0) {
    return "A";
  }
  if (bucketIndex === 1) {
    return "B";
  }
  return "C";
}

export function trackExposure(experimentId, bucket) {
  const key = `${experimentId}:${bucket}`;
  if (exposureCache.has(key)) {
    return;
  }
  exposureCache.add(key);
  track("experiment_exposure", { experimentId, bucket });
}
