"use client";

import * as React from "react";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full border text-sm font-semibold tracking-[0.01em] shadow-[0_14px_30px_rgba(8,6,20,0.18)] transition-all duration-150 ease-out outline-none select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 hover:-translate-y-0.5 hover:shadow-[0_20px_38px_rgba(8,6,20,0.24)] active:translate-y-px active:shadow-[0_10px_20px_rgba(8,6,20,0.16)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(193,245,255,0.7)]",
  {
    variants: {
      variant: {
        default:
          "border-[rgba(255,79,154,0.32)] bg-[linear-gradient(135deg,#ff4f9a_0%,#ff7ab1_52%,#ff9cc0_100%)] text-[#1a0e16] shadow-[0_18px_36px_rgba(255,79,154,0.22)] hover:shadow-[0_24px_46px_rgba(255,79,154,0.28)]",
        outline:
          "border-[rgba(43,33,65,0.12)] bg-[linear-gradient(180deg,rgba(255,253,249,0.96)_0%,rgba(254,249,244,0.94)_100%)] text-[var(--gush-ink-strong)] shadow-[0_14px_32px_rgba(58,44,86,0.12)] hover:border-[rgba(43,33,65,0.18)] hover:bg-white",
        secondary:
          "border-[rgba(255,214,10,0.24)] bg-[linear-gradient(135deg,rgba(255,229,0,0.96)_0%,rgba(255,243,122,0.96)_100%)] text-[#191307] shadow-[0_16px_34px_rgba(255,210,51,0.2)] hover:shadow-[0_22px_42px_rgba(255,210,51,0.26)]",
        ghost:
          "border-transparent bg-transparent text-[var(--gush-ink-strong)] shadow-none hover:bg-black/8 hover:text-[var(--gush-ink-strong)] hover:translate-y-0 hover:shadow-none dark:text-white/78 dark:hover:bg-white/10 dark:hover:text-white",
        destructive:
          "border-[rgba(244,63,94,0.26)] bg-[linear-gradient(135deg,rgba(255,79,154,0.94)_0%,rgba(244,63,94,0.94)_100%)] text-white shadow-[0_18px_36px_rgba(244,63,94,0.2)] hover:shadow-[0_24px_46px_rgba(244,63,94,0.26)]",
        link:
          "border-transparent bg-transparent px-0 text-[var(--gush-ink-strong)] shadow-none hover:translate-y-0 hover:bg-transparent hover:underline hover:text-[var(--gush-ink-strong)] hover:shadow-none dark:text-white/82 dark:hover:text-white",
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
