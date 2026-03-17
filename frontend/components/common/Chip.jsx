import { cn } from "@/lib/utils";

export default function Chip({
  children,
  label,
  className = "",
  onClick,
  active = false,
}) {
  const isClickable = typeof onClick === "function";
  const content = children ?? label;

  if (!content) {
    return null;
  }

  if (!isClickable) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full border px-3.5 py-2 text-xs font-semibold tracking-[0.16em] uppercase",
          active
            ? "border-emerald-400/30 bg-emerald-400/12 text-emerald-100"
            : "border-white/10 bg-white/[0.04] text-neutral-300",
          className,
        )}
      >
        {content}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center rounded-full border px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition-all duration-200",
        active
          ? "border-emerald-400/30 bg-emerald-400/12 text-emerald-100 shadow-[0_18px_40px_rgba(16,185,129,0.12)]"
          : "border-white/10 bg-white/[0.04] text-neutral-300 hover:border-white/20 hover:bg-white/[0.08] hover:text-white",
        className,
      )}
    >
      {content}
    </button>
  );
}
