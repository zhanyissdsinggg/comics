import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "gush-transition-base inline-flex h-5.5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] focus-visible:ring-[3px] focus-visible:ring-[color:var(--gush-focus-cyan)] [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default:
          "border-[color:var(--gush-border)] bg-[var(--gush-panel)] text-[color:var(--gush-text-secondary)] shadow-[var(--gush-shadow-pill)] backdrop-blur-xl",
        secondary:
          "border-[rgba(56,189,248,0.24)] bg-[rgba(56,189,248,0.12)] text-cyan-100 shadow-[0_10px_22px_rgba(58,44,86,0.08)]",
        destructive:
          "border-rose-300/22 [background:var(--gush-gradient-warm)] text-rose-100",
        outline: "border-[color:var(--gush-border-strong)] bg-transparent text-[color:var(--gush-text-secondary)]",
        ghost: "border-transparent bg-transparent text-[color:var(--gush-text-secondary)]",
        link: "rounded-none border-transparent bg-transparent px-0 text-[var(--gush-accent-strong)] hover:underline",
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
