"use client";

import { useEffect, useState } from "react";

function isApplePlatform() {
  if (typeof navigator === "undefined") {
    return false;
  }

  const platform =
    navigator.userAgentData?.platform || navigator.platform || navigator.userAgent || "";
  return /mac|iphone|ipad|ipod/i.test(platform);
}

export function useSearchShortcutLabel() {
  const [shortcutLabel, setShortcutLabel] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(pointer: coarse), (hover: none)");
    const updateShortcut = () => {
      const isCompactViewport = window.innerWidth < 768;
      setShortcutLabel(
        mediaQuery.matches || isCompactViewport
          ? ""
          : isApplePlatform()
            ? "\u2318K"
            : "Ctrl+K"
      );
    };

    updateShortcut();
    window.addEventListener("resize", updateShortcut);

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", updateShortcut);
      return () => {
        window.removeEventListener("resize", updateShortcut);
        mediaQuery.removeEventListener("change", updateShortcut);
      };
    }

    mediaQuery.addListener(updateShortcut);
    return () => {
      window.removeEventListener("resize", updateShortcut);
      mediaQuery.removeListener(updateShortcut);
    };
  }, []);

  return shortcutLabel;
}
