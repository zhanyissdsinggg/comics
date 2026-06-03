"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { storefrontHomeSearchPillClass } from "../../common/StorefrontPagePrimitives";

export default function SearchPill({
  href = "",
  label = "",
  icon: Icon = Search,
  showIcon = true,
  compact = false,
  className = "",
  children = null,
  type = "button",
  ...props
}) {
  const contentLabel = label || children;
  const classes = cn(
    storefrontHomeSearchPillClass,
    compact ? "min-h-[40px] px-3.5 text-[13px]" : "min-h-[48px] px-5",
    className,
  );
  const content = (
    <>
      {showIcon && Icon ? <Icon className={compact ? "size-3.5" : "size-4"} /> : null}
      <span className="truncate">{contentLabel}</span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={classes} {...props}>
        {content}
      </Link>
    );
  }

  return (
    <button type={type} className={classes} {...props}>
      {content}
    </button>
  );
}
