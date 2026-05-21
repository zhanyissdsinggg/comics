"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AGE_RULES } from "../lib/ageRules";
import { setCookie } from "../lib/cookies";
import { useAuthStore } from "./useAuthStore";
import { apiPost, invalidateApiCacheByPrefix } from "../lib/apiClient";
import {
  applyPreferencesToStorage,
  PREFERENCES_STORAGE_SYNC_EVENT,
  readStoredMatureVerification,
} from "../lib/preferencesClient";
import {
  CONTENT_MODE_ADULT,
  CONTENT_MODE_NORMAL,
  deriveContentModeFromAdultFlag,
  normalizeContentMode,
} from "../lib/contentMode";
import {
  isMatureVerificationActive,
  localGateAgeProvider,
  normalizeMatureVerificationStatus,
} from "../lib/verifyAgeProvider";
import { trackEvent } from "../lib/trackEvent";
import { requireLoginForAdult } from "../lib/adultGateConfig";

const AdultGateContext = createContext(null);
const CONFIRMED_KEY = "mn_adult_confirmed";
const RULE_KEY = "mn_age_rule";
const MODE_KEY = "mn_adult_mode";
const REGION_KEY = "mn_region";
const HIDE_ADULT_KEY = "mn_hide_adult_history";
const ADULT_STATE_UPDATED_AT_KEY = "mn_adult_state_updated_at";

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

export function AdultGateProvider({ children, initialAdultState = null }) {
  const { hydrated: authHydrated, isSignedIn } = useAuthStore();
  const trustedInitialAdultState =
    initialAdultState?.adultConfirmed === true &&
    initialAdultState?.isAdultMode === true;
  const [adultConfirmed, setAdultConfirmed] = useState(
    initialAdultState?.adultConfirmed === true,
  );
  const [ageRuleKey, setAgeRuleKey] = useState(
    normalizeRuleKey(initialAdultState?.ageRuleKey || "global"),
  );
  const [isAdultMode, setIsAdultMode] = useState(
    initialAdultState?.isAdultMode === true,
  );
  const [matureVerification, setMatureVerification] = useState(
    normalizeMatureVerificationStatus(
      initialAdultState?.adultConfirmed === true
        ? {
            verified: true,
            provider: "server-session",
            region: normalizeRuleKey(initialAdultState?.ageRuleKey || "global"),
            expiresAt: null,
            referenceId: null,
            verifiedAt: null,
          }
        : null,
      normalizeRuleKey(initialAdultState?.ageRuleKey || "global"),
    ),
  );
  const [hydrated, setHydrated] = useState(false);
  const restoredModeRef = useRef("");
  const trustedInitialStateRef = useRef(
    initialAdultState?.adultConfirmed === true &&
      initialAdultState?.isAdultMode === true
      ? {
          confirmed: true,
          ruleKey: normalizeRuleKey(initialAdultState?.ageRuleKey || "global"),
          mode: true,
          verification: normalizeMatureVerificationStatus(
            {
              verified: true,
              provider: "server-session",
              region: normalizeRuleKey(
                initialAdultState?.ageRuleKey || "global",
              ),
              expiresAt: null,
              referenceId: null,
              verifiedAt: null,
            },
            normalizeRuleKey(initialAdultState?.ageRuleKey || "global"),
          ),
        }
      : null,
  );

  const clearCatalogModeCache = useCallback(() => {
    invalidateApiCacheByPrefix("/api/series");
    invalidateApiCacheByPrefix("/api/search");
    invalidateApiCacheByPrefix("/api/recommendations");
    invalidateApiCacheByPrefix("/api/rankings");
    invalidateApiCacheByPrefix("/api/notifications");
  }, []);

  const syncAdultPreferences = useCallback(
    async (nextState) => {
      if (!authHydrated || !isSignedIn) {
        return null;
      }

      const response = await apiPost(
        "/api/preferences",
        {
          preferences: {
            region: nextState.region,
            hideAdultHistory:
              typeof window !== "undefined" &&
              window.localStorage.getItem(HIDE_ADULT_KEY) === "1",
            matureModeEnabled: nextState.isAdultMode,
            matureVerification: nextState.matureVerification,
          },
        },
        {
          keepalive: true,
        },
      );

      if (response.ok && response.data?.preferences) {
        applyPreferencesToStorage(response.data.preferences);
      }

      return response;
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
      markUpdated = false,
    }) => {
      const normalizedRule = normalizeRuleKey(
        ruleKey || verification?.region || "global",
      );
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
        setCookie("mn_adult_confirmed", confirmed ? "1" : "0");
        setCookie("mn_age_rule", normalizedRule);
        setCookie("mn_adult_mode", mode ? "1" : "0");
        if (markUpdated) {
          const updatedAt = Date.now();
          window.localStorage.setItem(
            ADULT_STATE_UPDATED_AT_KEY,
            String(updatedAt),
          );
          window.__mnAdultStateUpdatedAt = updatedAt;
        }
      }

      applyPreferencesToStorage({
        region: normalizedRule,
        matureModeEnabled: Boolean(mode),
        matureVerification: normalizedVerification,
      });

      if (sync) {
        return syncAdultPreferences({
          region: normalizedRule,
          isAdultMode: Boolean(mode),
          matureVerification: normalizedVerification,
        });
      }

      return Promise.resolve(null);
    },
    [syncAdultPreferences],
  );

  useEffect(() => {
    if (!authHydrated) {
      const initialRule = normalizeRuleKey(initialAdultState?.ageRuleKey || "global");
      applyAdultState({
        confirmed: initialAdultState?.adultConfirmed === true,
        ruleKey: initialRule,
        mode: initialAdultState?.isAdultMode === true,
        verification:
          initialAdultState?.adultConfirmed === true
            ? {
                verified: true,
                provider: "server-session",
                region: initialRule,
                expiresAt: null,
                referenceId: null,
                verifiedAt: null,
              }
            : null,
        sync: false,
      });
      setHydrated(true);
      return;
    }

    const confirmed = readStorageValue(CONFIRMED_KEY, "0") === "1";
    const regionRule = readRegionRule();
    const storedRule = readStorageValue(RULE_KEY, regionRule);
    const rule = normalizeRuleKey(storedRule || regionRule);
    const mode = readStorageValue(MODE_KEY, "0") === "1";
    const verification = readStoredMatureVerification(rule);
    const verificationActive = isMatureVerificationActive(verification, rule);
    const allowRestoredAdultState =
      (isSignedIn || trustedInitialAdultState) && verificationActive;
    const restoredMode =
      mode && allowRestoredAdultState ? CONTENT_MODE_ADULT : CONTENT_MODE_NORMAL;
    applyAdultState({
      confirmed: confirmed && allowRestoredAdultState,
      ruleKey: rule,
      mode: mode && allowRestoredAdultState,
      verification: allowRestoredAdultState
        ? verification
        : normalizeMatureVerificationStatus(null, rule),
      sync: false,
    });
    if (restoredModeRef.current !== restoredMode) {
      restoredModeRef.current = restoredMode;
      trackEvent("content_mode_restore", {
        contentMode: restoredMode,
        ruleKey: rule,
      });
    }
    setHydrated(true);
  }, [
    applyAdultState,
    authHydrated,
    initialAdultState,
    isSignedIn,
    trustedInitialAdultState,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const handlePreferencesSync = (event) => {
      const nextPreferences = event?.detail?.preferences;
      if (!nextPreferences || typeof nextPreferences !== "object") {
        return;
      }

      const nextRule = normalizeRuleKey(
        nextPreferences.region || readRegionRule(),
      );
      const nextVerification = normalizeMatureVerificationStatus(
        nextPreferences.matureVerification,
        nextRule,
      );
      const nextVerified = isMatureVerificationActive(
        nextVerification,
        nextRule,
      );
      const nextMode =
        nextVerified && nextPreferences.matureModeEnabled === true;

      trustedInitialStateRef.current = nextVerified
        ? {
            confirmed: true,
            ruleKey: nextRule,
            mode: nextMode,
            verification: nextVerification,
          }
        : null;

      setAdultConfirmed(nextVerified);
      setAgeRuleKey(nextRule);
      setIsAdultMode(nextMode);
      setMatureVerification(
        nextVerified
          ? nextVerification
          : normalizeMatureVerificationStatus(null, nextRule),
      );
    };

    window.addEventListener(
      PREFERENCES_STORAGE_SYNC_EVENT,
      handlePreferencesSync,
    );
    return () => {
      window.removeEventListener(
        PREFERENCES_STORAGE_SYNC_EVENT,
        handlePreferencesSync,
      );
    };
  }, []);

  useEffect(() => {
    if (!hydrated || !authHydrated) {
      return;
    }

    const regionRule = readRegionRule();
    const verification = readStoredMatureVerification(regionRule);
    const verificationActive = isMatureVerificationActive(
      verification,
      regionRule,
    );
    const trustedInitialState = trustedInitialStateRef.current;
    const allowPersistedAdultState =
      (isSignedIn && verificationActive) || Boolean(trustedInitialState);
    const confirmed =
      readStorageValue(CONFIRMED_KEY, "0") === "1" && allowPersistedAdultState;
    const mode =
      readStorageValue(MODE_KEY, "0") === "1" && allowPersistedAdultState;
    const effectiveVerification =
      verificationActive && isSignedIn
        ? verification
        : trustedInitialState?.verification || normalizeMatureVerificationStatus(null, regionRule);
    const effectiveConfirmed =
      trustedInitialState?.confirmed === true ? true : confirmed;
    const effectiveMode = trustedInitialState?.mode === true ? true : mode;

    setAdultConfirmed(effectiveConfirmed);
    setAgeRuleKey(regionRule);
    setIsAdultMode(effectiveMode);
    setMatureVerification(
      allowPersistedAdultState
        ? effectiveVerification
        : normalizeMatureVerificationStatus(null, regionRule),
    );
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
      clearCatalogModeCache();
    };

    const handleRegionEvent = (event) => {
      const nextRule = event?.detail?.region || readRegionRule();
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
    clearCatalogModeCache,
    hydrated,
    matureVerification,
  ]);

  const contentMode = deriveContentModeFromAdultFlag(isAdultMode);
  const isNormalMode = contentMode === CONTENT_MODE_NORMAL;

  const resolveSignedInState = useCallback(
    (signedInOverride) => {
      if (typeof signedInOverride === "boolean") {
        return signedInOverride;
      }
      return isSignedIn;
    },
    [isSignedIn],
  );

  const exitAdultMode = useCallback(() => {
    const wasAdultMode = isAdultMode;
    trustedInitialStateRef.current = null;
    applyAdultState({
      confirmed: adultConfirmed,
      ruleKey: ageRuleKey,
      mode: false,
      verification: matureVerification,
      sync: true,
      markUpdated: true,
    });
    clearCatalogModeCache();
    if (wasAdultMode) {
      trackEvent("content_mode_exit_adult", {
        contentMode: CONTENT_MODE_NORMAL,
        ruleKey: ageRuleKey,
      });
    }
    return "OK";
  }, [
    adultConfirmed,
    ageRuleKey,
    applyAdultState,
    clearCatalogModeCache,
    isAdultMode,
    matureVerification,
  ]);

  const enterAdultMode = useCallback(
    (signedInOverride) => {
      const signedInForAdult = resolveSignedInState(signedInOverride);
      if (requireLoginForAdult && !signedInForAdult) {
        return "NEED_LOGIN";
      }
      if (!isMatureVerificationActive(matureVerification, ageRuleKey)) {
        return "NEED_AGE_CONFIRM";
      }
      trustedInitialStateRef.current = {
        confirmed: true,
        ruleKey: ageRuleKey,
        mode: true,
        verification: matureVerification,
      };
      applyAdultState({
        confirmed: true,
        ruleKey: ageRuleKey,
        mode: true,
        verification: matureVerification,
        sync: true,
        markUpdated: true,
      });
      clearCatalogModeCache();
      if (!isAdultMode) {
        trackEvent("content_mode_enter_adult", {
          contentMode: CONTENT_MODE_ADULT,
          ruleKey: ageRuleKey,
        });
      }
      return "OK";
    },
    [
      ageRuleKey,
      applyAdultState,
      clearCatalogModeCache,
      isAdultMode,
      matureVerification,
      resolveSignedInState,
    ],
  );

  const setContentMode = useCallback(
    (nextMode, options = {}) => {
      if (nextMode !== CONTENT_MODE_NORMAL && nextMode !== CONTENT_MODE_ADULT) {
        trackEvent("content_mode_invalid_state", {
          requestedMode: String(nextMode || ""),
          fallbackMode: CONTENT_MODE_NORMAL,
        });
      }

      const normalizedMode = normalizeContentMode(nextMode);
      if (normalizedMode === CONTENT_MODE_ADULT) {
        return enterAdultMode(options.isSignedIn);
      }
      return exitAdultMode();
    },
    [enterAdultMode, exitAdultMode],
  );

  const requestAdultToggle = useCallback(
    (signedInOverride) =>
      setContentMode(isAdultMode ? CONTENT_MODE_NORMAL : CONTENT_MODE_ADULT, {
        isSignedIn: signedInOverride,
      }),
    [isAdultMode, setContentMode],
  );

  const enableAdultMode = useCallback(
    () => enterAdultMode(true),
    [enterAdultMode],
  );

  const confirmAge = useCallback(
    async (ruleKey) => {
      const normalized = normalizeRuleKey(ruleKey || readRegionRule());
      const optimisticVerification = createOptimisticVerification(normalized);
      const wasAdultMode = isAdultMode;

      trustedInitialStateRef.current = {
        confirmed: true,
        ruleKey: normalized,
        mode: true,
        verification: optimisticVerification,
      };

      clearCatalogModeCache();
      await applyAdultState({
        confirmed: true,
        ruleKey: normalized,
        mode: true,
        verification: optimisticVerification,
        sync: true,
        markUpdated: true,
      });
      if (!wasAdultMode) {
        trackEvent("content_mode_enter_adult", {
          contentMode: CONTENT_MODE_ADULT,
          ruleKey: normalized,
        });
      }

      try {
        const verification = await localGateAgeProvider.verify({
          region: normalized,
          legalAge:
            AGE_RULES[normalized]?.legalAge || AGE_RULES.global.legalAge,
        });

        trustedInitialStateRef.current = {
          confirmed: true,
          ruleKey: normalized,
          mode: true,
          verification,
        };
        clearCatalogModeCache();
        await applyAdultState({
          confirmed: true,
          ruleKey: normalized,
          mode: true,
          verification,
          sync: true,
          markUpdated: true,
        });
      } catch {
        trustedInitialStateRef.current = {
          confirmed: true,
          ruleKey: normalized,
          mode: true,
          verification: optimisticVerification,
        };
        clearCatalogModeCache();
        await applyAdultState({
          confirmed: true,
          ruleKey: normalized,
          mode: true,
          verification: optimisticVerification,
          sync: true,
          markUpdated: true,
        });
      }

      return "OK";
    },
    [applyAdultState, clearCatalogModeCache, isAdultMode],
  );

  const forceDisableAdultMode = useCallback(() => {
    exitAdultMode();
  }, [exitAdultMode]);

  const value = useMemo(
    () => ({
      requireLoginForAdult,
      hydrated,
      contentMode,
      adultConfirmed,
      ageRuleKey,
      legalAge,
      isAdultMode,
      isNormalMode,
      matureVerification,
      setAgeRuleKey,
      setContentMode,
      enterAdultMode,
      exitAdultMode,
      requestAdultToggle,
      confirmAge,
      enableAdultMode,
      forceDisableAdultMode,
    }),
    [
      adultConfirmed,
      ageRuleKey,
      contentMode,
      enterAdultMode,
      exitAdultMode,
      forceDisableAdultMode,
      hydrated,
      isNormalMode,
      legalAge,
      isAdultMode,
      matureVerification,
      setContentMode,
      requestAdultToggle,
      confirmAge,
      enableAdultMode,
    ],
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
