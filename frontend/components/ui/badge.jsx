import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex h-5.5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] transition-all focus-visible:ring-[3px] focus-visible:ring-[rgba(49,87,214,0.16)] [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "border-[color:var(--gush-border)] bg-white text-slate-700",
        secondary:
          "border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] text-slate-600",
        destructive: "border-red-200 bg-red-50 text-red-600",
        outline: "border-black/10 bg-transparent text-slate-700",
        ghost: "border-transparent bg-transparent text-slate-600",
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
