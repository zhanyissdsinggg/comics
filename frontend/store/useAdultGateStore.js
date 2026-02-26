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

const AdultGateContext = createContext(null);
const CONFIRMED_KEY = "mn_adult_confirmed";
const RULE_KEY = "mn_age_rule";
const MODE_KEY = "mn_adult_mode";

const requireLoginForAdult = true;

function readStorageValue(key, fallback) {
  if (typeof window === "undefined") {
    return fallback;
  }
  return window.localStorage.getItem(key) || fallback;
}

export function AdultGateProvider({ children }) {
  const [adultConfirmed, setAdultConfirmed] = useState(false);
  const [ageRuleKey, setAgeRuleKey] = useState("global");
  const [isAdultMode, setIsAdultMode] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const confirmed = readStorageValue(CONFIRMED_KEY, "0") === "1";
    const region =
      typeof window !== "undefined"
        ? window.localStorage.getItem("mn_region")
        : null;
    const rule = readStorageValue(RULE_KEY, region || "global");
    const mode = readStorageValue(MODE_KEY, "0") === "1";
    setAdultConfirmed(confirmed);
    setAgeRuleKey(rule);
    setIsAdultMode(mode);
    setHydrated(true);
  }, []);

  const legalAge = AGE_RULES[ageRuleKey]?.legalAge || AGE_RULES.global.legalAge;

  const persistAdultMode = useCallback((value) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(MODE_KEY, value ? "1" : "0");
    }
  }, []);

  const persistConfirmed = useCallback((value) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(CONFIRMED_KEY, value ? "1" : "0");
    }
  }, []);

  const persistAgeRule = useCallback((value) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(RULE_KEY, value);
    }
  }, []);

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

  const requestAdultToggle = useCallback(
    (isSignedIn) => {
      if (isAdultMode) {
        setIsAdultMode(false);
        persistAdultMode(false);
        return "OK";
      }
      if (requireLoginForAdult && !isSignedIn) {
        return "NEED_LOGIN";
      }
      if (!adultConfirmed) {
        return "NEED_AGE_CONFIRM";
      }
      setIsAdultMode(true);
      persistAdultMode(true);
      return "OK";
    },
    [adultConfirmed, isAdultMode, persistAdultMode]
  );

  const enableAdultMode = useCallback(() => {
    setIsAdultMode(true);
    persistAdultMode(true);
  }, [persistAdultMode]);

  const confirmAge = useCallback(
    (ruleKey) => {
      const normalized = AGE_RULES[ruleKey] ? ruleKey : "global";
      setAdultConfirmed(true);
      setAgeRuleKey(normalized);
      setIsAdultMode(true);
      persistConfirmed(true);
      persistAgeRule(normalized);
      persistAdultMode(true);
      return "OK";
    },
    [persistAdultMode, persistAgeRule, persistConfirmed]
  );

  const forceDisableAdultMode = useCallback(() => {
    setIsAdultMode(false);
    persistAdultMode(false);
  }, [persistAdultMode]);

  const value = useMemo(
    () => ({
      requireLoginForAdult,
      adultConfirmed,
      ageRuleKey,
      legalAge,
      isAdultMode,
      setAgeRuleKey,
      requestAdultToggle,
      confirmAge,
      enableAdultMode,
      forceDisableAdultMode,
    }),
    [
      adultConfirmed,
      ageRuleKey,
      legalAge,
      isAdultMode,
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
