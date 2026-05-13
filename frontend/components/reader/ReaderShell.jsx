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
        "relative min-h-screen overflow-x-hidden pb-28",
        isComic ? "text-white" : "text-current",
        className,
      )}
    >
      {children}
    </main>
  );
}
