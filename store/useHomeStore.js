"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const HomeContext = createContext(null);
const STORAGE_KEY = "mn_home_tab";

export function HomeProvider({ children }) {
  const [homeTab, setHomeTab] = useState("comics");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setHomeTab(stored);
    }
  }, []);

  const updateHomeTab = useCallback((tab) => {
    setHomeTab(tab);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, tab);
    }
  }, []);

  const value = useMemo(() => ({ homeTab, setHomeTab: updateHomeTab }), [homeTab, updateHomeTab]);

  return <HomeContext.Provider value={value}>{children}</HomeContext.Provider>;
}

export function useHomeStore() {
  const context = useContext(HomeContext);
  if (!context) {
    throw new Error("useHomeStore must be used within HomeProvider");
  }
  return context;
}
