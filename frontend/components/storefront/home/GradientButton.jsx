"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { storefrontHomePrimaryButtonClass } from "../../common/StorefrontPagePrimitives";

function ButtonContent({
  children,
  icon: Icon = null,
  iconPosition = "end",
}) {
  return (
    <>
      {Icon && iconPosition === "start" ? <Icon className="size-4" /> : null}
      {children}
      {Icon && iconPosition === "end" ? <Icon className="size-4" /> : null}
    </>
  );
}

export default function GradientButton({
  href = "",
  children,
  icon = null,
  iconPosition = "end",
  className = "",
  type = "button",
  ...props
}) {
  const content = (
    <ButtonContent icon={icon} iconPosition={iconPosition}>
      {children}
    </ButtonContent>
  );

  if (href) {
    return (
      <Link href={href} className={cn(storefrontHomePrimaryButtonClass, className)} {...props}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type}
      className={cn(storefrontHomePrimaryButtonClass, className)}
      {...props}
    >
      {content}
    </button>
  );
}
