"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiGet } from "./apiClient";
import { useAdultGateStore } from "../store/useAdultGateStore";

const InteractiveAvailabilityContext = createContext({
  showInteractiveNav: true,
  hasPublishedStories: true,
});

function normalizeBoolean(value, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeEnv(value) {
  return String(value || "").trim().toLowerCase();
}

function isProductionDeployment() {
  const deployEnv =
    normalizeEnv(process.env.NEXT_PUBLIC_DEPLOY_ENV) ||
    normalizeEnv(process.env.NODE_ENV);
  return deployEnv === "production";
}

export function InteractiveAvailabilityProvider({
  children,
  initialShowInteractiveNav = true,
}) {
  const { contentMode, hydrated } = useAdultGateStore();
  const [availability, setAvailability] = useState({
    showInteractiveNav: normalizeBoolean(initialShowInteractiveNav, true),
    hasPublishedStories: normalizeBoolean(initialShowInteractiveNav, true),
  });

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    let cancelled = false;
    apiGet("/api/interactive-stories", {
      suppressAuthModal: true,
      cacheMs: 0,
      bust: true,
    })
      .then((response) => {
        if (cancelled) {
          return;
        }
        const stories = Array.isArray(response?.data?.stories)
          ? response.data.stories
          : [];
        const hasPublishedStories = stories.length > 0;
        setAvailability({
          showInteractiveNav: hasPublishedStories || !isProductionDeployment(),
          hasPublishedStories,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setAvailability((current) => current);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [contentMode, hydrated]);

  const value = useMemo(
    () => availability,
    [availability],
  );

  return (
    <InteractiveAvailabilityContext.Provider value={value}>
      {children}
    </InteractiveAvailabilityContext.Provider>
  );
}

export function useInteractiveAvailability() {
  return useContext(InteractiveAvailabilityContext);
}
