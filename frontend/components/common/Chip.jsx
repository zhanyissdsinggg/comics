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
          "inline-flex items-center rounded-full border-[3px] px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.14em]",
          active
            ? isLight
              ? "border-black bg-[#ffe500] text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
              : "border-emerald-400/30 bg-emerald-400/12 text-emerald-100"
            : isLight
              ? "border-black bg-white text-black/68"
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
        "inline-flex items-center rounded-full border-[3px] px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition-all duration-200",
        active
          ? isLight
            ? "border-black bg-[#ffe500] text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
            : "border-emerald-400/30 bg-emerald-400/12 text-emerald-100 shadow-[0_18px_40px_rgba(16,185,129,0.12)]"
          : isLight
            ? "border-black bg-white text-black/68 hover:-translate-y-0.5 hover:bg-[#fff6cf] hover:text-black"
            : "border-white/10 bg-white/[0.04] text-neutral-300 hover:border-white/20 hover:bg-white/[0.08] hover:text-white",
        className,
      )}
    >
      {content}
    </button>
  );
}
