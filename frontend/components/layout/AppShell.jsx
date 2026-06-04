"use client";

import { cn } from "@/lib/utils";

export default function AppShell({
  children,
  header = null,
  footer = null,
  className = "",
  contentClassName = "",
}) {
  return (
    <div className={cn("gush-app-shell", className)}>
      {header}
      <div className={cn("gush-app-shell-content", contentClassName)}>
        {children}
      </div>
      {footer}
    </div>
  );
}
