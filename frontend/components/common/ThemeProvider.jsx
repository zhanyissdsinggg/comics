"use client";

import { useEffect } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

function ThemeStateCleanup() {
  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    document.documentElement.classList.remove("dark");
    document.documentElement.classList.add("light");
    document.documentElement.style.colorScheme = "light";

    try {
      window.localStorage.removeItem("theme");
      window.localStorage.removeItem("next-theme");
    } catch {
      // Ignore storage cleanup failures and keep storefront pages on light mode.
    }
  }, []);

  return null;
}

export default function ThemeProvider({ children }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      forcedTheme="light"
      enableSystem={false}
      disableTransitionOnChange={false}
    >
      <ThemeStateCleanup />
      {children}
    </NextThemesProvider>
  );
}
