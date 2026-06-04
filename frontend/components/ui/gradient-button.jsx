"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";

function ButtonContent({
  children,
  icon: Icon = null,
  iconPosition = "end",
}) {
  return (
    <>
      {Icon && iconPosition === "start" ? (
        <Icon aria-hidden="true" className="size-4" />
      ) : null}
      {children}
      {Icon && iconPosition === "end" ? (
        <Icon aria-hidden="true" className="size-4" />
      ) : null}
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
  const classes = cn("gush-button-gradient", className);
  const content = (
    <ButtonContent icon={icon} iconPosition={iconPosition}>
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
