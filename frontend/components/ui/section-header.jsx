"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";

export default function SectionHeader({
  eyebrow = "",
  title,
  subtitle = "",
  actionLabel = "",
  actionHref = "",
  action = null,
  actionIcon: ActionIcon = null,
  className = "",
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="max-w-[42rem]">
        {eyebrow ? (
          <p className="gush-eyebrow">
            {eyebrow}
          </p>
        ) : null}
        <h2 className={cn("gush-section-title", eyebrow ? "mt-2" : "")}>
          {title}
        </h2>
        {subtitle ? (
          <p className="gush-section-subtitle mt-2.5">{subtitle}</p>
        ) : null}
      </div>

      {action ? <div className="self-start">{action}</div> : null}

      {!action && actionLabel && actionHref ? (
        <Link
          href={actionHref}
          className="gush-section-action inline-flex min-h-[44px] items-center gap-2 self-start text-sm font-extrabold"
        >
          <span>{actionLabel}</span>
          {ActionIcon ? <ActionIcon aria-hidden="true" className="size-4" /> : null}
        </Link>
      ) : null}
    </div>
  );
}
