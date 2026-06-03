"use client";

import { ArrowUpRight } from "lucide-react";
import { storefrontHomeSectionEyebrowClass } from "../../common/StorefrontPagePrimitives";
import IconButton from "./IconButton";

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
        {eyebrow ? <p className={storefrontHomeSectionEyebrowClass}>{eyebrow}</p> : null}
        <h2 className="mt-2 font-display text-[1.82rem] font-semibold leading-[0.96] tracking-[-0.06em] text-[color:var(--gush-home-text-primary)] sm:text-[2.22rem]">
          {title}
        </h2>
        {description ? (
          <p className="mt-2.5 text-sm leading-[1.72] text-[color:var(--gush-home-text-secondary)]">
            {description}
          </p>
        ) : null}
      </div>

      {actionLabel && actionHref ? (
        <IconButton
          href={actionHref}
          icon={ArrowUpRight}
          iconPosition="end"
          className="self-start"
        >
          {actionLabel}
        </IconButton>
      ) : null}
    </div>
  );
}
