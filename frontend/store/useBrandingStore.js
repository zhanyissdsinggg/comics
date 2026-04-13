"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiGet } from "../lib/apiClient";

const BrandingContext = createContext(null);

const defaultBranding = {
  siteLogoUrl: "",
  faviconUrl: "",
  homeBannerUrl: "",
  updatedAt: null,
};
const DEPRECATED_BRANDING_HOSTS = new Set([
  "comics-production-07fa.up.railway.app",
]);

function sanitizeBrandingAssetUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }

  if (raw.startsWith("/")) {
    return raw;
  }

  try {
    const parsed = new URL(raw);
    if (DEPRECATED_BRANDING_HOSTS.has(parsed.hostname.toLowerCase())) {
      return "";
    }
    return parsed.toString();
  } catch {
    return "";
  }
}

function sanitizeBrandingPayload(value) {
  const candidate = value && typeof value === "object" ? value : {};

  return {
    ...defaultBranding,
    ...candidate,
    siteLogoUrl: sanitizeBrandingAssetUrl(candidate.siteLogoUrl),
    faviconUrl: sanitizeBrandingAssetUrl(candidate.faviconUrl),
    homeBannerUrl: sanitizeBrandingAssetUrl(candidate.homeBannerUrl),
  };
}

export function BrandingProvider({ children }) {
  const [branding, setBranding] = useState(defaultBranding);
  const [loaded, setLoaded] = useState(false);

  const loadBranding = useCallback(async () => {
    const response = await apiGet("/api/branding", { cacheMs: 60000 });
    if (response.ok && response.data?.branding) {
      setBranding(sanitizeBrandingPayload(response.data.branding));
      if (response.stale) {
        apiGet("/api/branding", {
          cacheMs: 60000,
          bust: true,
          dedupeMs: 0,
        }).then((freshResponse) => {
          if (freshResponse.ok && freshResponse.data?.branding) {
            setBranding(sanitizeBrandingPayload(freshResponse.data.branding));
          }
        });
      }
    }
    setLoaded(true);
    return response;
  }, []);

  useEffect(() => {
    if (!loaded) {
      loadBranding();
    }
  }, [loaded, loadBranding]);

  const value = useMemo(
    () => ({ branding, setBranding, loadBranding, loaded }),
    [branding, loadBranding, loaded]
  );

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export function useBrandingStore() {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error("useBrandingStore must be used within BrandingProvider");
  }
  return context;
}
