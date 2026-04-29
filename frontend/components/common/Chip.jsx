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
          "inline-flex items-center rounded-full border-2 px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.14em] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]",
          active
            ? isLight
              ? "border-black bg-[#FFE500] text-black"
              : "border-emerald-400/30 bg-emerald-400/12 text-emerald-100"
            : isLight
              ? "border-black bg-black text-white"
              : "border-white/20 bg-black text-neutral-200",
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
        "inline-flex items-center rounded-full border-2 px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.14em] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all duration-150 hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
        active
          ? isLight
            ? "border-black bg-[#FFE500] text-black"
            : "border-[#FFE500] bg-black text-white"
          : isLight
            ? "border-black bg-black text-white hover:bg-[#00E5FF] hover:text-black"
            : "border-white/20 bg-black text-white hover:border-[#00E5FF] hover:bg-[#111111]",
        className,
      )}
    >
      {content}
    </button>
  );
}
