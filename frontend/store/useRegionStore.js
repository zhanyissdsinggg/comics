"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiGet } from "../lib/apiClient";

const RegionContext = createContext(null);

const defaultConfig = {
  region: "global",
  countryCodes: [
    { code: "+1", label: "US" },
    { code: "+82", label: "KR" },
    { code: "+86", label: "CN" },
    { code: "+81", label: "JP" },
    { code: "+65", label: "SG" },
  ],
  lengthRules: {
    "+1": [10],
    "+82": [9, 10, 11],
    "+86": [11],
    "+81": [9, 10, 11],
    "+65": [8],
  },
};

export function RegionProvider({ children }) {
  const [config, setConfig] = useState(defaultConfig);

  const loadConfig = useCallback(async () => {
    const response = await apiGet("/api/regions/config");
    if (response.ok && response.data?.config) {
      setConfig({ ...defaultConfig, ...response.data.config });
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const value = useMemo(() => ({ config, loadConfig }), [config, loadConfig]);

  return <RegionContext.Provider value={value}>{children}</RegionContext.Provider>;
}

export function useRegionStore() {
  const context = useContext(RegionContext);
  if (!context) {
    throw new Error("useRegionStore must be used within RegionProvider");
  }
  return context;
}
