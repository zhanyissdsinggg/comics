import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex h-5.5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] transition-all focus-visible:ring-[3px] focus-visible:ring-[rgba(49,87,214,0.16)] [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default:
          "border-white/12 bg-[rgba(255,255,255,0.035)] text-white/82 shadow-[0_10px_24px_rgba(8,6,20,0.16)] backdrop-blur-xl",
        secondary:
          "border-[rgba(43,33,65,0.12)] bg-[rgba(255,253,249,0.94)] text-[color:var(--gush-ink-strong)] shadow-[0_10px_22px_rgba(58,44,86,0.08)]",
        destructive:
          "border-rose-300/22 bg-[linear-gradient(135deg,rgba(244,63,94,0.14)_0%,rgba(255,255,255,0.88)_100%)] text-rose-700 dark:bg-[linear-gradient(135deg,rgba(244,63,94,0.22)_0%,rgba(17,24,39,0.9)_100%)] dark:text-rose-100",
        outline: "border-white/16 bg-transparent text-white/78",
        ghost: "border-transparent bg-transparent text-slate-600 dark:text-white/68",
        link: "rounded-none border-transparent bg-transparent px-0 text-[var(--gush-accent,#3157d6)] hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({ className, variant = "default", render, ...props }) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props,
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  });
}

export { Badge, badgeVariants };
