import { cn } from "@/lib/utils";

export default function FilterChip({
  children,
  className = "",
  active = false,
  onClick,
  type = "button",
}) {
  const classes = cn(
    "gush-filter-chip",
    active && "gush-filter-chip-active",
    className,
  );

  if (typeof onClick === "function") {
    return (
      <button type={type} onClick={onClick} className={classes}>
        {children}
      </button>
    );
  }

  return <span className={classes}>{children}</span>;
}
