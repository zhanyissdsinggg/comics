"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function ThemeToggle({ variant = "default" }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const isLightVariant = variant === "light";

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        aria-hidden="true"
        className={cn(
          "h-10 w-10 animate-pulse rounded-full border",
          isLightVariant
            ? "border-[rgba(31,24,41,0.1)] bg-white/70"
            : "border-white/12 bg-[rgba(255,255,255,0.05)]",
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
        "relative h-10 w-10 rounded-full border transition-all duration-200",
        isLightVariant
          ? "border-[rgba(31,24,41,0.1)] bg-white/88 text-[#6b6178] shadow-[0_12px_26px_rgba(58,44,86,0.1)] hover:-translate-y-0.5 hover:border-[rgba(31,24,41,0.18)] hover:bg-white hover:text-[#1c1624]"
          : "border-white/12 bg-[rgba(255,255,255,0.05)] text-white/66 shadow-[0_14px_30px_rgba(8,6,20,0.24)] hover:-translate-y-0.5 hover:border-white/18 hover:bg-[rgba(255,255,255,0.08)] hover:text-white",
      )}
      aria-label={`Switch to ${isDark ? "day" : "night"} mode`}
      title={`Switch to ${isDark ? "day" : "night"} mode`}
      data-theme-toggle="1"
    >
      <Sun
        className={`absolute size-4 transition-all duration-300 ${
          isDark
            ? "rotate-90 scale-0 opacity-0"
            : "rotate-0 scale-100 opacity-100 text-[var(--gush-gold)]"
        }`}
      />
      <Moon
        className={`absolute size-4 transition-all duration-300 ${
          isDark
            ? "rotate-0 scale-100 opacity-100 text-[var(--gush-cyan)]"
            : "-rotate-90 scale-0 opacity-0"
        }`}
      />
    </Button>
  );
}
