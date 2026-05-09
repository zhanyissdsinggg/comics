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
          "inline-flex items-center rounded-full border px-3.5 py-2 text-xs font-medium uppercase tracking-[0.16em] shadow-[0_10px_24px_rgba(8,6,20,0.18)]",
          active
            ? isLight
              ? "border-[rgba(29,29,31,0.14)] bg-[rgba(29,29,31,0.06)] text-slate-900"
              : "border-[rgba(255,79,154,0.28)] bg-[rgba(255,79,154,0.16)] text-white"
            : isLight
              ? "border-[rgba(29,29,31,0.12)] bg-white text-slate-700"
              : "border-white/10 bg-[rgba(255,255,255,0.04)] text-white/74",
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
        "inline-flex items-center rounded-full border px-3.5 py-2 text-xs font-medium uppercase tracking-[0.16em] shadow-[0_10px_24px_rgba(8,6,20,0.18)] transition-all duration-150 hover:-translate-y-0.5 active:-translate-y-0.5",
        active
          ? isLight
            ? "border-[rgba(29,29,31,0.14)] bg-[rgba(29,29,31,0.06)] text-slate-900"
            : "border-[rgba(255,79,154,0.28)] bg-[rgba(255,79,154,0.16)] text-white"
          : isLight
            ? "border-[rgba(29,29,31,0.12)] bg-white text-slate-700 hover:border-[rgba(29,29,31,0.18)] hover:bg-[rgba(29,29,31,0.04)]"
            : "border-white/10 bg-[rgba(255,255,255,0.04)] text-white/78 hover:border-white/16 hover:bg-[rgba(255,255,255,0.08)] hover:text-white",
        className,
      )}
    >
      {content}
    </button>
  );
}
