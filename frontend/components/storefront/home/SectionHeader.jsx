"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { storefrontSecondaryButtonClass } from "../../common/StorefrontPagePrimitives";

export default function SectionHeader({
  eyebrow = "",
  title,
  description = "",
  actionLabel = "",
  actionHref = "",
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-[42rem]">
        {eyebrow ? (
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/46">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-2 font-display text-[1.82rem] font-semibold leading-[0.96] tracking-[-0.06em] text-white sm:text-[2.22rem]">
          {title}
        </h2>
        {description ? (
          <p className="mt-2.5 text-sm leading-[1.72] text-white/62">{description}</p>
        ) : null}
      </div>

      {actionLabel && actionHref ? (
        <Link
          href={actionHref}
          className={`${storefrontSecondaryButtonClass} min-h-[44px] self-start px-4 text-white/74`}
        >
          {actionLabel}
          <ArrowUpRight className="size-4" />
        </Link>
      ) : null}
    </div>
  );
}
