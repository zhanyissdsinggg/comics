"use client";

import * as React from "react";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap border-[3px] border-black text-sm font-black uppercase tracking-[0.06em] transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out outline-none select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black focus-visible:ring-[3px] focus-visible:ring-[rgba(255,0,122,0.18)] active:translate-y-px",
  {
    variants: {
      variant: {
        default:
          "bg-[#00e5ff] text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-[#00d2ea] hover:shadow-none",
        outline:
          "bg-white text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-[#ffe500] hover:shadow-none",
        secondary:
          "bg-[#ffe500] text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-[#ffd500] hover:shadow-none",
        ghost:
          "border-transparent bg-transparent text-[color:var(--gush-ink-soft)] shadow-none hover:bg-black hover:text-[#ffe500]",
        destructive:
          "bg-[#ff007a] text-white shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-[#e0006b] hover:shadow-none focus-visible:ring-[rgba(255,0,122,0.18)]",
        link: "rounded-none border-transparent bg-transparent px-0 text-black shadow-none hover:text-[#ff007a] hover:underline",
      },
      size: {
        default: "h-11 px-5",
        xs: "h-7 px-2.5 text-[10px]",
        sm: "h-9 px-3.5 text-[11px]",
        lg: "h-12 px-6 text-sm",
        icon: "size-11 px-0",
        "icon-xs": "size-7 px-0",
        "icon-sm": "size-9 px-0",
        "icon-lg": "size-12 px-0",
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
