"use client";

import { cn } from "@/lib/utils";

export default function PageShell({
  children,
  theme = "default",
  className = "",
  contentClassName = "",
}) {
  if (theme === "home") {
    return (
      <main className={cn("gush-home-page", className)}>
        <div className={cn("gush-home-page-main", contentClassName)}>{children}</div>
      </main>
    );
  }

  return (
    <main className={cn("gush-page-shell text-white", className)}>
      <div className="gush-page-ambient" aria-hidden="true" />
      <div className={cn("gush-page-shell-inner", contentClassName)}>{children}</div>
    </main>
  );
}
