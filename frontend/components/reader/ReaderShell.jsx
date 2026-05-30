"use client";

import { cn } from "../../lib/utils";

export default function ReaderShell({
  children,
  className = "",
  isComic = false,
}) {
  return (
    <main
      className={cn(
        "relative min-h-screen overflow-x-hidden bg-[linear-gradient(180deg,#090b10_0%,#0d1017_38%,#12141d_100%)] pb-28",
        isComic ? "text-white" : "text-current",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.04),transparent_42%),radial-gradient(circle_at_12%_10%,rgba(255,79,154,0.08),transparent_22%),radial-gradient(circle_at_84%_10%,rgba(103,232,249,0.06),transparent_18%)]" />
      {children}
    </main>
  );
}
