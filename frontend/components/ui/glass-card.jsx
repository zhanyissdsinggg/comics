import * as React from "react";

import { cn } from "@/lib/utils";

const GlassCard = React.forwardRef(function GlassCard(
  {
    as: Component = "div",
    className,
    interactive = true,
    ...props
  },
  ref,
) {
  return (
    <Component
      ref={ref}
      className={cn(
        "gush-glass-card",
        interactive && "gush-glass-card-hover",
        className,
      )}
      {...props}
    />
  );
});

export default GlassCard;
