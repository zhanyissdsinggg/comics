"use client"

import * as React from "react"
import { cva } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-transparent text-sm font-semibold tracking-[-0.012em] transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out outline-none select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 focus-visible:ring-[3px] focus-visible:ring-[rgba(134,98,69,0.16)] active:translate-y-px",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--gush-ink-strong)] text-white shadow-[var(--gush-shadow-button)] ring-1 ring-black/5 hover:bg-[#241d18] hover:shadow-[0_20px_36px_rgba(22,19,16,0.16)]",
        outline:
          "border-[color:var(--gush-border-strong)] bg-[color:var(--gush-surface-strong)] text-[color:var(--gush-ink)] shadow-[0_2px_0_rgba(255,255,255,0.65)_inset] hover:border-[rgba(44,35,24,0.2)] hover:bg-[rgba(255,252,247,0.98)] hover:text-[color:var(--gush-ink-strong)]",
        secondary:
          "border-[color:var(--gush-border)] bg-[rgba(122,90,58,0.05)] text-[color:var(--gush-ink)] shadow-none hover:border-[rgba(44,35,24,0.12)] hover:bg-[rgba(122,90,58,0.08)] hover:text-[color:var(--gush-ink-strong)]",
        ghost:
          "bg-transparent text-[color:var(--gush-ink-soft)] shadow-none hover:bg-[rgba(44,35,24,0.05)] hover:text-[color:var(--gush-ink-strong)]",
        destructive:
          "bg-red-600 text-white hover:bg-red-500 focus-visible:ring-[rgba(220,38,38,0.18)]",
        link: "rounded-none border-transparent bg-transparent px-0 text-[var(--gush-accent,#3157d6)] shadow-none hover:text-[var(--gush-accent-strong,#2444af)] hover:underline",
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
  }
)

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
})

export { Button, buttonVariants }
