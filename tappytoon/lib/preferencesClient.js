"use client";

import { setCookie } from "./cookies";

const REGION_KEY = "mn_region";
const LANG_KEY = "mn_lang";
const HIDE_ADULT_KEY = "mn_hide_adult_history";
const DISPLAY_NAME_KEY = "mn_display_name";
const NOTIFY_NEW_KEY = "mn_notify_new_episode";
const NOTIFY_TTF_KEY = "mn_notify_ttf_ready";
const NOTIFY_PROMO_KEY = "mn_notify_promo";

export function applyPreferencesToStorage(preferences = {}) {
  if (typeof window !== "undefined") {
    if (preferences.region) {
      window.localStorage.setItem(REGION_KEY, preferences.region);
    }
    if (preferences.language) {
      window.localStorage.setItem(LANG_KEY, preferences.language);
    }
    if (typeof preferences.hideAdultHistory === "boolean") {
      window.localStorage.setItem(HIDE_ADULT_KEY, preferences.hideAdultHistory ? "1" : "0");
    }
    if (typeof preferences.displayName === "string") {
      window.localStorage.setItem(DISPLAY_NAME_KEY, preferences.displayName);
    }
    if (typeof preferences.notifyNewEpisode === "boolean") {
      window.localStorage.setItem(NOTIFY_NEW_KEY, preferences.notifyNewEpisode ? "1" : "0");
    }
    if (typeof preferences.notifyTtfReady === "boolean") {
      window.localStorage.setItem(NOTIFY_TTF_KEY, preferences.notifyTtfReady ? "1" : "0");
    }
    if (typeof preferences.notifyPromo === "boolean") {
      window.localStorage.setItem(NOTIFY_PROMO_KEY, preferences.notifyPromo ? "1" : "0");
    }
  }

  if (preferences.region) {
    setCookie(REGION_KEY, preferences.region);
  }
  if (preferences.language) {
    setCookie(LANG_KEY, preferences.language);
  }
  if (typeof preferences.notifyNewEpisode === "boolean") {
    setCookie(NOTIFY_NEW_KEY, preferences.notifyNewEpisode ? "1" : "0");
  }
  if (typeof preferences.notifyTtfReady === "boolean") {
    setCookie(NOTIFY_TTF_KEY, preferences.notifyTtfReady ? "1" : "0");
  }
  if (typeof preferences.notifyPromo === "boolean") {
    setCookie(NOTIFY_PROMO_KEY, preferences.notifyPromo ? "1" : "0");
  }
}

export function readPreferenceFlag(key, fallback = true) {
  if (typeof window === "undefined") {
    return fallback;
  }
  const raw = window.localStorage.getItem(key);
  if (raw === null) {
    return fallback;
  }
  return raw !== "0";
}
