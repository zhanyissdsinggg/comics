"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { storefrontHomeIconButtonClass } from "../../common/StorefrontPagePrimitives";

function ButtonContent({
  children,
  icon: Icon = null,
  iconPosition = "start",
  iconOnly = false,
  suppressIconOnlyText = false,
}) {
  return (
    <>
      {Icon && iconPosition === "start" ? (
        <Icon aria-hidden="true" className="size-4" />
      ) : null}
      {iconOnly ? (
        suppressIconOnlyText ? null : <span className="sr-only">{children}</span>
      ) : (
        children
      )}
      {Icon && iconPosition === "end" ? (
        <Icon aria-hidden="true" className="size-4" />
      ) : null}
    </>
  );
}

export default function IconButton({
  href = "",
  children,
  icon = null,
  iconPosition = "start",
  iconOnly = false,
  className = "",
  type = "button",
  ...props
}) {
  const classes = cn(
    storefrontHomeIconButtonClass,
    iconOnly ? "h-11 w-11 min-h-0 px-0" : "px-4",
    className,
  );
  const accessibleLabel = typeof props["aria-label"] === "string"
    ? props["aria-label"].trim()
    : "";
  const content = (
    <ButtonContent
      icon={icon}
      iconPosition={iconPosition}
      iconOnly={iconOnly}
      suppressIconOnlyText={iconOnly && Boolean(accessibleLabel)}
    >
      {children}
    </ButtonContent>
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
