"use client";

import * as React from "react";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "gush-transition-base inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full border text-sm font-semibold tracking-[0.01em] shadow-[var(--gush-shadow-pill)] outline-none select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 hover:-translate-y-0.5 hover:shadow-[var(--gush-shadow-hover)] active:translate-y-px active:shadow-[var(--gush-shadow-press)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--gush-focus-cyan)]",
  {
    variants: {
      variant: {
        default:
          "border-[rgba(236,72,153,0.32)] [background:var(--gush-gradient-primary)] text-[color:var(--gush-button-text-dark)] shadow-[var(--gush-shadow-button)] hover:shadow-[var(--gush-shadow-button),var(--gush-shadow-glow)]",
        outline:
          "border-[color:var(--gush-glass-border)] [background:linear-gradient(180deg,var(--gush-panel-strong),var(--gush-panel-soft)),var(--gush-glass-bg)] text-[color:var(--gush-text)] shadow-[var(--gush-glass-shadow)] hover:border-[color:var(--gush-glass-border-strong)] hover:bg-[rgba(255,255,255,0.08)]",
        secondary:
          "border-[rgba(255,255,255,0.12)] [background:var(--gush-gradient-cyan)] text-white shadow-[var(--gush-shadow-cyan)] hover:shadow-[var(--gush-shadow-cyan-hover)]",
        ghost:
          "border-transparent bg-transparent text-[color:var(--gush-text-secondary)] shadow-none hover:bg-white/10 hover:text-[color:var(--gush-text)] hover:translate-y-0 hover:shadow-none",
        destructive:
          "border-[rgba(244,63,94,0.26)] [background:var(--gush-gradient-warm)] text-white shadow-[var(--gush-shadow-danger)] hover:shadow-[var(--gush-shadow-danger-hover)]",
        link:
          "border-transparent bg-transparent px-0 text-[color:var(--gush-text-secondary)] shadow-none hover:translate-y-0 hover:bg-transparent hover:text-[color:var(--gush-text)] hover:underline hover:shadow-none",
      },
      size: {
        default: "h-10 px-4 py-2",
        xs: "h-7 px-2.5 text-[10px]",
        sm: "h-9 px-3.5 text-[11px]",
        lg: "h-11 px-6 text-sm",
        icon: "size-10 p-0",
        "icon-xs": "size-7 p-0",
        "icon-sm": "size-9 p-0",
        "icon-lg": "size-11 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const Button = React.forwardRef(function Button(
  {
    className,
    variant = "default",
    size = "default",
    type = "button",
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
});

export { Button, buttonVariants };
