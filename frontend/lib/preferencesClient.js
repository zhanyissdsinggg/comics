"use client";

import { setCookie } from "./cookies";
import {
  DEFAULT_MATURE_VERIFICATION_STATUS,
  normalizeMatureVerificationStatus,
} from "./verifyAgeProvider";

const REGION_KEY = "mn_region";
const LANG_KEY = "mn_lang";
const HIDE_ADULT_KEY = "mn_hide_adult_history";
const DISPLAY_NAME_KEY = "mn_display_name";
const NOTIFY_NEW_KEY = "mn_notify_new_episode";
const NOTIFY_TTF_KEY = "mn_notify_ttf_ready";
const NOTIFY_PROMO_KEY = "mn_notify_promo";
const ADULT_CONFIRMED_KEY = "mn_adult_confirmed";
const ADULT_MODE_KEY = "mn_adult_mode";
const ADULT_RULE_KEY = "mn_age_rule";
const MATURE_VERIFICATION_KEY = "mn_mature_verification";
const MATURE_PROVIDER_KEY = "mn_mature_provider";
const MATURE_EXPIRES_KEY = "mn_mature_expires_at";
const MATURE_REF_KEY = "mn_mature_reference_id";
const MATURE_VERIFIED_AT_KEY = "mn_mature_verified_at";
const MATURE_HIDDEN_KEY = "mn_mature_hidden";
const MATURE_STATUS_COOKIE = "mn_mature_status";

function persistStorageValue(key, value) {
  if (typeof window === "undefined") {
    return;
  }
  if (value === null || value === undefined || value === "") {
    window.localStorage.removeItem(key);
    return;
  }
  window.localStorage.setItem(key, String(value));
}

function buildMatureStatusCookieValue(preferences = {}) {
  const verification = normalizeMatureVerificationStatus(
    preferences.matureVerification,
    preferences.region || "global",
  );
  const matureModeEnabled = preferences.matureModeEnabled === true;
  const hideAdultHistory = preferences.hideAdultHistory === true;
  return JSON.stringify({
    verified: verification.verified,
    provider: verification.provider,
    region: verification.region,
    expiresAt: verification.expiresAt,
    referenceId: verification.referenceId,
    verifiedAt: verification.verifiedAt,
    matureModeEnabled,
    hideAdultHistory,
  });
}

export function applyPreferencesToStorage(preferences = {}) {
  if (typeof window !== "undefined") {
    if (preferences.region) {
      window.localStorage.setItem(REGION_KEY, preferences.region);
    }
    if (preferences.language) {
      window.localStorage.setItem(LANG_KEY, preferences.language);
    }
    if (typeof preferences.hideAdultHistory === "boolean") {
      window.localStorage.setItem(
        HIDE_ADULT_KEY,
        preferences.hideAdultHistory ? "1" : "0",
      );
    }
    if (typeof preferences.displayName === "string") {
      window.localStorage.setItem(DISPLAY_NAME_KEY, preferences.displayName);
    }
    if (typeof preferences.notifyNewEpisode === "boolean") {
      window.localStorage.setItem(
        NOTIFY_NEW_KEY,
        preferences.notifyNewEpisode ? "1" : "0",
      );
    }
    if (typeof preferences.notifyTtfReady === "boolean") {
      window.localStorage.setItem(
        NOTIFY_TTF_KEY,
        preferences.notifyTtfReady ? "1" : "0",
      );
    }
    if (typeof preferences.notifyPromo === "boolean") {
      window.localStorage.setItem(
        NOTIFY_PROMO_KEY,
        preferences.notifyPromo ? "1" : "0",
      );
    }

    if (typeof preferences.matureModeEnabled === "boolean") {
      window.localStorage.setItem(
        ADULT_MODE_KEY,
        preferences.matureModeEnabled ? "1" : "0",
      );
      window.localStorage.setItem(
        MATURE_HIDDEN_KEY,
        preferences.matureModeEnabled ? "0" : "1",
      );
    }

    const verification = normalizeMatureVerificationStatus(
      preferences.matureVerification,
      preferences.region || "global",
    );
    window.localStorage.setItem(
      ADULT_CONFIRMED_KEY,
      verification.verified ? "1" : "0",
    );
    window.localStorage.setItem(
      ADULT_RULE_KEY,
      verification.region || "global",
    );
    window.localStorage.setItem(
      MATURE_VERIFICATION_KEY,
      JSON.stringify(verification),
    );
    persistStorageValue(MATURE_PROVIDER_KEY, verification.provider);
    persistStorageValue(MATURE_EXPIRES_KEY, verification.expiresAt);
    persistStorageValue(MATURE_REF_KEY, verification.referenceId);
    persistStorageValue(MATURE_VERIFIED_AT_KEY, verification.verifiedAt);
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
  if (typeof preferences.matureModeEnabled === "boolean") {
    setCookie(ADULT_MODE_KEY, preferences.matureModeEnabled ? "1" : "0");
  }

  const verification = normalizeMatureVerificationStatus(
    preferences.matureVerification,
    preferences.region || "global",
  );
  setCookie(ADULT_CONFIRMED_KEY, verification.verified ? "1" : "0");
  setCookie(ADULT_RULE_KEY, verification.region || "global");
  setCookie(
    MATURE_STATUS_COOKIE,
    buildMatureStatusCookieValue({
      ...preferences,
      matureVerification: verification,
    }),
  );
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

export function readStoredMatureVerification(fallbackRegion = "global") {
  if (typeof window === "undefined") {
    return {
      ...DEFAULT_MATURE_VERIFICATION_STATUS,
      region: fallbackRegion || DEFAULT_MATURE_VERIFICATION_STATUS.region,
    };
  }

  const raw = window.localStorage.getItem(MATURE_VERIFICATION_KEY);
  try {
    return normalizeMatureVerificationStatus(
      raw ? JSON.parse(raw) : null,
      fallbackRegion,
    );
  } catch {
    return normalizeMatureVerificationStatus(null, fallbackRegion);
  }
}
