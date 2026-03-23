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
  const isLight = appearance === "light";

  if (!content) {
    return null;
  }

  if (!isClickable) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full border px-3.5 py-2 text-xs font-semibold",
          active
            ? isLight
              ? "border-[rgba(49,87,214,0.18)] bg-[rgba(49,87,214,0.08)] text-slate-950"
              : "border-emerald-400/30 bg-emerald-400/12 text-emerald-100"
            : isLight
              ? "border-black/8 bg-white text-slate-600"
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
        "inline-flex items-center rounded-full border px-3.5 py-2 text-xs font-semibold transition-all duration-200",
        active
          ? isLight
            ? "border-[rgba(49,87,214,0.18)] bg-[rgba(49,87,214,0.08)] text-slate-950 shadow-[0_10px_20px_rgba(49,87,214,0.08)]"
            : "border-emerald-400/30 bg-emerald-400/12 text-emerald-100 shadow-[0_18px_40px_rgba(16,185,129,0.12)]"
          : isLight
            ? "border-black/8 bg-white text-slate-600 hover:border-black/12 hover:bg-[rgba(246,243,237,0.92)] hover:text-slate-950"
            : "border-white/10 bg-white/[0.04] text-neutral-300 hover:border-white/20 hover:bg-white/[0.08] hover:text-white",
        className,
      )}
    >
      {content}
    </button>
  );
}
