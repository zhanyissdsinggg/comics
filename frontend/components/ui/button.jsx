"use client"

import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-transparent text-sm font-semibold transition-all duration-200 outline-none select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 focus-visible:ring-[3px] focus-visible:ring-[rgba(49,87,214,0.16)] active:translate-y-px",
  {
    variants: {
      variant: {
        default:
          "bg-slate-950 text-white shadow-[0_14px_28px_rgba(15,23,42,0.12)] hover:bg-slate-800",
        outline:
          "border-black/8 bg-white text-slate-700 shadow-[0_10px_22px_rgba(15,23,42,0.04)] hover:border-black/12 hover:bg-[rgba(250,248,244,0.96)] hover:text-slate-950",
        secondary:
          "border-transparent bg-[rgba(15,23,42,0.05)] text-slate-700 hover:bg-[rgba(15,23,42,0.08)] hover:text-slate-950",
        ghost:
          "bg-transparent text-slate-600 hover:bg-[rgba(15,23,42,0.05)] hover:text-slate-950",
        destructive:
          "bg-red-600 text-white hover:bg-red-500 focus-visible:ring-[rgba(220,38,38,0.18)]",
        link: "rounded-none border-transparent bg-transparent px-0 text-[var(--gush-accent,#3157d6)] shadow-none hover:text-[var(--gush-accent-strong,#2444af)] hover:underline",
      },
      size: {
        default: "h-10 px-4",
        xs: "h-7 px-2.5 text-xs",
        sm: "h-9 px-3.5 text-[0.82rem]",
        lg: "h-11 px-5 text-sm",
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
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props} />
  );
}

export { Button, buttonVariants }
