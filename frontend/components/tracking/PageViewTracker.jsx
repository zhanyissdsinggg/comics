"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { trackPageView } from "../../lib/trackEvent";
import { useAdultGateStore } from "../../store/useAdultGateStore";

export default function PageViewTracker() {
  const pathname = usePathname();
  const { hydrated, contentMode } = useAdultGateStore();
  const lastTrackedPathRef = useRef("");

  useEffect(() => {
    if (!hydrated || !pathname) {
      return;
    }

    const pagePath = String(pathname || "").trim();
    if (!pagePath || lastTrackedPathRef.current === pagePath) {
      return;
    }

    lastTrackedPathRef.current = pagePath;
    trackPageView(pagePath, {
      contentMode,
    });
  }, [contentMode, hydrated, pathname]);

  return null;
}
