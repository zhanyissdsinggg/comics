"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function ThemeToggle({ variant = "default" }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const isLight =
    variant === "light" || variant === "home" || variant === "default";

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        aria-hidden="true"
        className={cn(
          "h-10 w-10 animate-pulse rounded-full border",
          isLight
            ? "border-[color:var(--gush-border)] bg-white"
            : "border-white/10 bg-white/[0.04]",
        )}
      />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      type="button"
      size="icon"
      variant="outline"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "relative h-10 w-10 rounded-full",
        isLight
          ? "border-[color:var(--gush-border)] bg-white text-slate-600 shadow-[0_8px_24px_rgba(15,23,42,0.05)] hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)] hover:text-slate-900 dark:border-white/10 dark:bg-white/[0.06] dark:text-neutral-200 dark:shadow-[0_14px_32px_rgba(0,0,0,0.24)] dark:hover:border-white/18 dark:hover:bg-white/[0.1] dark:hover:text-white"
          : "border-white/10 bg-white/[0.04] text-neutral-200 hover:border-white/20 hover:bg-white/[0.08] hover:text-white",
      )}
      aria-label={`Switch to ${isDark ? "day" : "night"} mode`}
      title={`Switch to ${isDark ? "day" : "night"} mode`}
      data-theme-toggle="1"
    >
      <Sun
        className={`absolute size-4 transition-all duration-300 ${
          isDark
            ? "rotate-90 scale-0 opacity-0"
            : "rotate-0 scale-100 opacity-100 text-[var(--gush-accent)]"
        }`}
      />
      <Moon
        className={`absolute size-4 transition-all duration-300 ${
          isDark
            ? "rotate-0 scale-100 opacity-100 text-[var(--gush-accent)]"
            : "-rotate-90 scale-0 opacity-0"
        }`}
      />
    </Button>
  );
}
