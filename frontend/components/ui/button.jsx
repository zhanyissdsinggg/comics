"use client";

import * as React from "react";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-transparent text-sm font-semibold tracking-[-0.02em] transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out outline-none select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-300 focus-visible:ring-[3px] focus-visible:ring-slate-200/80 active:translate-y-px",
  {
    variants: {
      variant: {
        default:
          "bg-slate-950 text-white shadow-[0_14px_28px_rgba(15,23,42,0.12)] ring-1 ring-white/10 hover:bg-slate-800 hover:shadow-[0_18px_36px_rgba(15,23,42,0.16)]",
        outline:
          "border-[color:var(--gush-border)] bg-white text-[color:var(--gush-ink)] shadow-none hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)] hover:text-[color:var(--gush-ink-strong)] dark:bg-white/[0.04] dark:hover:bg-white/[0.08]",
        secondary:
          "border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] text-[color:var(--gush-ink)] shadow-none hover:border-[color:var(--gush-border-strong)] hover:bg-white hover:text-[color:var(--gush-ink-strong)] dark:bg-white/[0.05] dark:hover:bg-white/[0.08]",
        ghost:
          "bg-transparent text-[color:var(--gush-ink-soft)] shadow-none hover:bg-[rgba(29,29,31,0.03)] hover:text-[color:var(--gush-ink-strong)] dark:hover:bg-white/[0.06]",
        destructive:
          "bg-red-600 text-white hover:bg-red-500 focus-visible:ring-[rgba(220,38,38,0.18)]",
        link: "rounded-none border-transparent bg-transparent px-0 text-slate-700 shadow-none hover:text-slate-950 hover:underline",
      },
      size: {
        default: "h-10 px-4.5",
        xs: "h-7 px-2.5 text-xs",
        sm: "h-9 px-3.5 text-[0.82rem]",
        lg: "h-11 px-5.5 text-sm",
        icon: "size-10",
        "icon-xs": "size-7",
        "icon-sm": "size-9",
        "icon-lg": "size-11",
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
