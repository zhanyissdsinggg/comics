export function normalizeAdultParam(value) {
  if (value === "1" || value === 1 || value === true) {
    return "1";
  }
  return "0";
}

export function isAdultEnabled(value) {
  return normalizeAdultParam(value) === "1";
}

function safeLocalStorageGet(key, fallback) {
  if (typeof window === "undefined") {
    return fallback;
  }
  return window.localStorage.getItem(key) || fallback;
}

function safeLocalStorageSet(key, value) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(key, value);
}

export function readAdultState() {
  const ageRuleKey = safeLocalStorageGet("mn_age_rule", "global");
  const legalAge = ageRuleKey === "kr" ? 19 : 18;
  const adultConfirmed = safeLocalStorageGet("mn_adult_confirmed", "0") === "1";
  const isAdultMode = safeLocalStorageGet("mn_adult_mode", "0") === "1";
  const isSignedIn = safeLocalStorageGet("mn_signed_in", "0") === "1";

  return {
    isSignedIn,
    adultConfirmed,
    ageRuleKey,
    legalAge,
    isAdultMode,
  };
}

export function requestEnableAdult() {
  const requireLoginForAdult = true;
  const { isSignedIn, adultConfirmed, isAdultMode } = readAdultState();

  if (requireLoginForAdult && !isSignedIn) {
    return "NEED_LOGIN";
  }
  if (!adultConfirmed || !isAdultMode) {
    return "NEED_AGE_CONFIRM";
  }
  return "OK";
}

export function confirmAge() {
  safeLocalStorageSet("mn_adult_confirmed", "1");
  safeLocalStorageSet("mn_adult_mode", "1");
  return "OK";
}

export function mockSignIn() {
  safeLocalStorageSet("mn_signed_in", "1");
  return "OK";
}
