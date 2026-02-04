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

export function BrandingProvider({ children }) {
  const [branding, setBranding] = useState(defaultBranding);
  const [loaded, setLoaded] = useState(false);

  const loadBranding = useCallback(async () => {
    const response = await apiGet("/api/branding", { cacheMs: 60000 });
    if (response.ok && response.data?.branding) {
      setBranding({ ...defaultBranding, ...response.data.branding });
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
