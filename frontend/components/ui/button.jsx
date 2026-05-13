"use client";

import * as React from "react";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap border-2 border-black text-sm font-semibold tracking-[0.01em] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all duration-150 ease-out outline-none select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none active:translate-x-0.5 active:translate-y-0.5 active:shadow-none focus-visible:ring-2 focus-visible:ring-black/30",
  {
    variants: {
      variant: {
        default: "bg-[#00E5FF] text-black",
        outline: "bg-white text-black hover:bg-white/90",
        secondary: "bg-[#FFE500] text-black",
        ghost:
          "border-transparent bg-transparent text-[var(--gush-ink-strong)] shadow-none hover:bg-black/10 hover:text-[var(--gush-ink-strong)] hover:translate-x-0 hover:translate-y-0 hover:shadow-none dark:hover:bg-white/10",
        destructive: "bg-[#FF007A] text-white",
        link: "border-transparent bg-transparent px-0 text-[var(--gush-ink-strong)] shadow-none hover:underline hover:text-[var(--gush-ink-strong)] hover:translate-x-0 hover:translate-y-0 hover:shadow-none",
      },
      size: {
        default: "h-10 rounded-md px-4 py-2",
        xs: "h-7 rounded-md px-2.5 text-[10px]",
        sm: "h-9 rounded-md px-3.5 text-[11px]",
        lg: "h-11 rounded-md px-6 text-sm",
        icon: "size-10 rounded-md p-0",
        "icon-xs": "size-7 rounded-md p-0",
        "icon-sm": "size-9 rounded-md p-0",
        "icon-lg": "size-11 rounded-md p-0",
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
