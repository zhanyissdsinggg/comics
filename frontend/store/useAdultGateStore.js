"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AGE_RULES } from "../lib/ageRules";
import { setCookie } from "../lib/cookies";
import { useAuthStore } from "./useAuthStore";
import { apiPost, invalidateApiCacheByPrefix } from "../lib/apiClient";
import {
  applyPreferencesToStorage,
  readStoredMatureVerification,
} from "../lib/preferencesClient";
import {
  isMatureVerificationActive,
  localGateAgeProvider,
  normalizeMatureVerificationStatus,
} from "../lib/verifyAgeProvider";

const AdultGateContext = createContext(null);
const CONFIRMED_KEY = "mn_adult_confirmed";
const RULE_KEY = "mn_age_rule";
const MODE_KEY = "mn_adult_mode";
const REGION_KEY = "mn_region";
const HIDE_ADULT_KEY = "mn_hide_adult_history";

const requireLoginForAdult = true;

function readStorageValue(key, fallback) {
  if (typeof window === "undefined") {
    return fallback;
  }
  return window.localStorage.getItem(key) || fallback;
}

function normalizeRuleKey(value) {
  return AGE_RULES[value] ? value : "global";
}

function readRegionRule() {
  if (typeof window === "undefined") {
    return "global";
  }
  return normalizeRuleKey(window.localStorage.getItem(REGION_KEY) || "global");
}

function createOptimisticVerification(ruleKey) {
  const now = new Date().toISOString();
  return {
    verified: true,
    provider: "local-gate",
    region: normalizeRuleKey(ruleKey || "global"),
    expiresAt: null,
    referenceId: null,
    verifiedAt: now,
  };
}

export function AdultGateProvider({ children }) {
  const { hydrated: authHydrated, isSignedIn } = useAuthStore();
  const [adultConfirmed, setAdultConfirmed] = useState(false);
  const [ageRuleKey, setAgeRuleKey] = useState("global");
  const [isAdultMode, setIsAdultMode] = useState(false);
  const [matureVerification, setMatureVerification] = useState(
    readStoredMatureVerification("global"),
  );
  const [hydrated, setHydrated] = useState(false);

  const clearAdultCatalogCache = useCallback(() => {
    invalidateApiCacheByPrefix("/api/series?adult=1");
    invalidateApiCacheByPrefix("/api/search?adult=1");
    invalidateApiCacheByPrefix("/api/search/hot?adult=1");
    invalidateApiCacheByPrefix("/api/search/keywords?adult=1");
    invalidateApiCacheByPrefix("/api/search/suggest");
    invalidateApiCacheByPrefix("/api/recommendations");
    invalidateApiCacheByPrefix("/api/rankings?adult=1");
    invalidateApiCacheByPrefix("/api/notifications?adult=1");
  }, []);

  const syncAdultPreferences = useCallback(
    (nextState) => {
      if (!authHydrated || !isSignedIn) {
        return;
      }

      void apiPost("/api/preferences", {
        preferences: {
          region: nextState.region,
          hideAdultHistory:
            typeof window !== "undefined" &&
            window.localStorage.getItem(HIDE_ADULT_KEY) === "1",
          matureModeEnabled: nextState.isAdultMode,
          matureVerification: nextState.matureVerification,
        },
      });
    },
    [authHydrated, isSignedIn],
  );

  const applyAdultState = useCallback(
    ({
      confirmed,
      ruleKey,
      mode,
      verification,
      sync = false,
    }) => {
      const normalizedRule = normalizeRuleKey(ruleKey || verification?.region || "global");
      const normalizedVerification = normalizeMatureVerificationStatus(
        verification,
        normalizedRule,
      );

      setAdultConfirmed(Boolean(confirmed));
      setAgeRuleKey(normalizedRule);
      setIsAdultMode(Boolean(mode));
      setMatureVerification(normalizedVerification);

      if (typeof window !== "undefined") {
        window.localStorage.setItem(CONFIRMED_KEY, confirmed ? "1" : "0");
        window.localStorage.setItem(RULE_KEY, normalizedRule);
        window.localStorage.setItem(MODE_KEY, mode ? "1" : "0");
      }

      applyPreferencesToStorage({
        region: normalizedRule,
        matureModeEnabled: Boolean(mode),
        matureVerification: normalizedVerification,
      });

      if (sync) {
        syncAdultPreferences({
          region: normalizedRule,
          isAdultMode: Boolean(mode),
          matureVerification: normalizedVerification,
        });
      }
    },
    [syncAdultPreferences],
  );

  useEffect(() => {
    const confirmed = readStorageValue(CONFIRMED_KEY, "0") === "1";
    const regionRule = readRegionRule();
    const storedRule = readStorageValue(RULE_KEY, regionRule);
    const rule = normalizeRuleKey(storedRule || regionRule);
    const mode = readStorageValue(MODE_KEY, "0") === "1";
    const verification = readStoredMatureVerification(rule);
    const verificationActive = isMatureVerificationActive(verification, rule);
    applyAdultState({
      confirmed: confirmed && verificationActive,
      ruleKey: rule,
      mode: mode && verificationActive,
      verification,
      sync: false,
    });
    setHydrated(true);
  }, [applyAdultState]);

  useEffect(() => {
    if (!hydrated || !authHydrated) {
      return;
    }

    const regionRule = readRegionRule();
    const verification = readStoredMatureVerification(regionRule);
    const verificationActive = isMatureVerificationActive(verification, regionRule);
    const confirmed = readStorageValue(CONFIRMED_KEY, "0") === "1" && verificationActive;
    const mode = readStorageValue(MODE_KEY, "0") === "1" && verificationActive;

    setAdultConfirmed(confirmed);
    setAgeRuleKey(regionRule);
    setIsAdultMode(mode);
    setMatureVerification(verification);
  }, [authHydrated, hydrated, isSignedIn]);

  const legalAge = AGE_RULES[ageRuleKey]?.legalAge || AGE_RULES.global.legalAge;

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    setCookie("mn_adult_confirmed", adultConfirmed ? "1" : "0");
  }, [adultConfirmed, hydrated]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    setCookie("mn_age_rule", ageRuleKey);
  }, [ageRuleKey, hydrated]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    setCookie("mn_adult_mode", isAdultMode ? "1" : "0");
  }, [hydrated, isAdultMode]);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") {
      return undefined;
    }

    const syncRegionRule = (nextRuleKey) => {
      const normalized = normalizeRuleKey(nextRuleKey);
      if (normalized === ageRuleKey) {
        return;
      }
      applyAdultState({
        confirmed: false,
        ruleKey: normalized,
        mode: false,
        verification: {
          ...matureVerification,
          verified: false,
          region: normalized,
          expiresAt: null,
          referenceId: null,
          verifiedAt: null,
        },
        sync: true,
      });
      clearAdultCatalogCache();
    };

    const handleRegionEvent = (event) => {
      const nextRule =
        event?.detail?.region ||
        readRegionRule();
      syncRegionRule(nextRule);
    };

    const handleStorage = (event) => {
      if (event.key === REGION_KEY) {
        syncRegionRule(event.newValue || "global");
      }
    };

    window.addEventListener("mn-region-change", handleRegionEvent);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("mn-region-change", handleRegionEvent);
      window.removeEventListener("storage", handleStorage);
    };
  }, [
    ageRuleKey,
    applyAdultState,
    clearAdultCatalogCache,
    hydrated,
    matureVerification,
  ]);

  const requestAdultToggle = useCallback(
    (isSignedIn) => {
      if (isAdultMode) {
        applyAdultState({
          confirmed: adultConfirmed,
          ruleKey: ageRuleKey,
          mode: false,
          verification: matureVerification,
          sync: true,
        });
        clearAdultCatalogCache();
        return "OK";
      }
      if (requireLoginForAdult && !isSignedIn) {
        return "NEED_LOGIN";
      }
      if (!isMatureVerificationActive(matureVerification, ageRuleKey)) {
        return "NEED_AGE_CONFIRM";
      }
      applyAdultState({
        confirmed: true,
        ruleKey: ageRuleKey,
        mode: true,
        verification: matureVerification,
        sync: true,
      });
      return "OK";
    },
    [
      adultConfirmed,
      ageRuleKey,
      applyAdultState,
      clearAdultCatalogCache,
      isAdultMode,
      matureVerification,
    ]
  );

  const enableAdultMode = useCallback(() => {
    if (!isMatureVerificationActive(matureVerification, ageRuleKey)) {
      return "NEED_AGE_CONFIRM";
    }
    applyAdultState({
      confirmed: true,
      ruleKey: ageRuleKey,
      mode: true,
      verification: matureVerification,
      sync: true,
    });
    return "OK";
  }, [ageRuleKey, applyAdultState, matureVerification]);

  const confirmAge = useCallback(
    async (ruleKey) => {
      const normalized = normalizeRuleKey(ruleKey || readRegionRule());
      const optimisticVerification = createOptimisticVerification(normalized);

      applyAdultState({
        confirmed: true,
        ruleKey: normalized,
        mode: true,
        verification: optimisticVerification,
        sync: true,
      });

      try {
        const verification = await localGateAgeProvider.verify({
          region: normalized,
          legalAge: AGE_RULES[normalized]?.legalAge || AGE_RULES.global.legalAge,
        });

        applyAdultState({
          confirmed: true,
          ruleKey: normalized,
          mode: true,
          verification,
          sync: true,
        });
      } catch {
        applyAdultState({
          confirmed: true,
          ruleKey: normalized,
          mode: true,
          verification: optimisticVerification,
          sync: true,
        });
      }

      return "OK";
    },
    [applyAdultState]
  );

  const forceDisableAdultMode = useCallback(() => {
    applyAdultState({
      confirmed: adultConfirmed,
      ruleKey: ageRuleKey,
      mode: false,
      verification: matureVerification,
      sync: true,
    });
    clearAdultCatalogCache();
  }, [
    adultConfirmed,
    ageRuleKey,
    applyAdultState,
    clearAdultCatalogCache,
    matureVerification,
  ]);

  const value = useMemo(
    () => ({
      requireLoginForAdult,
      hydrated,
      adultConfirmed,
      ageRuleKey,
      legalAge,
      isAdultMode,
      matureVerification,
      setAgeRuleKey,
      requestAdultToggle,
      confirmAge,
      enableAdultMode,
      forceDisableAdultMode,
    }),
    [
      adultConfirmed,
      ageRuleKey,
      hydrated,
      legalAge,
      isAdultMode,
      matureVerification,
      requestAdultToggle,
      confirmAge,
      enableAdultMode,
      forceDisableAdultMode,
    ]
  );

  return (
    <AdultGateContext.Provider value={value}>
      {children}
    </AdultGateContext.Provider>
  );
}

export function useAdultGateStore() {
  const context = useContext(AdultGateContext);
  if (!context) {
    throw new Error("useAdultGateStore must be used within AdultGateProvider");
  }
  return context;
}
