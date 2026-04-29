"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function ThemeToggle({ variant = "default" }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const isLight = true;

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
            ? "border-white/20 bg-black"
            : "border-white/20 bg-black",
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
        "relative h-10 w-10 rounded-full border",
        isLight
          ? "border-white/20 bg-black text-white/70 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:border-white/30 hover:bg-[#111111] hover:text-white dark:border-white/10 dark:bg-black dark:text-neutral-200 dark:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:hover:border-white/20 dark:hover:bg-[#111111] dark:hover:text-white"
          : "border-white/20 bg-black text-white/70 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:border-white/30 hover:bg-[#111111] hover:text-white",
      )}
      aria-label={`Switch to ${isDark ? "day" : "night"} mode`}
      title={`Switch to ${isDark ? "day" : "night"} mode`}
      data-theme-toggle="1"
    >
      <Sun
        className={`absolute size-4 transition-all duration-300 ${
          isDark
            ? "rotate-90 scale-0 opacity-0"
            : "rotate-0 scale-100 opacity-100 text-amber-500"
        }`}
      />
      <Moon
        className={`absolute size-4 transition-all duration-300 ${
          isDark
            ? "rotate-0 scale-100 opacity-100 text-sky-500"
            : "-rotate-90 scale-0 opacity-0"
        }`}
      />
    </Button>
  );
}
