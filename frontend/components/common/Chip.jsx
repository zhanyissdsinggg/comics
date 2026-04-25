import { cn } from "@/lib/utils";

export default function Chip({
  children,
  label,
  className = "",
  onClick,
  active = false,
  appearance = "default",
}) {
  const isClickable = typeof onClick === "function";
  const content = children ?? label;
  const isLight = appearance === "light" || appearance === "default";

  if (!content) {
    return null;
  }

  if (!isClickable) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full border px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.14em]",
          active
            ? isLight
              ? "border-black/12 bg-[#f6f7f9] text-black shadow-[0_10px_24px_rgba(15,23,42,0.08)]"
              : "border-emerald-400/30 bg-emerald-400/12 text-emerald-100"
            : isLight
              ? "border-black/10 bg-white text-black/68"
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
        "inline-flex items-center rounded-full border px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition-[background-color,border-color,box-shadow,transform] duration-200",
        active
          ? isLight
            ? "border-black/12 bg-[#f6f7f9] text-black shadow-[0_10px_24px_rgba(15,23,42,0.08)]"
            : "border-emerald-400/30 bg-emerald-400/12 text-emerald-100 shadow-[0_18px_40px_rgba(16,185,129,0.12)]"
          : isLight
            ? "border-black/10 bg-white text-black/68 shadow-[0_8px_18px_rgba(15,23,42,0.06)] hover:border-black/16 hover:bg-black/[0.03] hover:text-black hover:shadow-[0_10px_20px_rgba(15,23,42,0.08)] active:translate-y-px"
            : "border-white/10 bg-white/[0.04] text-neutral-300 hover:border-white/20 hover:bg-white/[0.08] hover:text-white",
        className,
      )}
    >
      {content}
    </button>
  );
}
