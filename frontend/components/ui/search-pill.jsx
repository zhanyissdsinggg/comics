import { cn } from "@/lib/utils";

export default function SearchPill({
  children,
  focused = false,
  className = "",
  ...props
}) {
  return (
    <div
      data-focused={focused ? "true" : "false"}
      className={cn("gush-search-pill", className)}
      {...props}
    >
      {children}
    </div>
  );
}
