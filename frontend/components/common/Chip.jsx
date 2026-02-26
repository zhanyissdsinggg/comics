/**
 * 老王注释：Chip标签组件 - 添加悬停动画和品牌色
 */
export default function Chip({ children, className = "", onClick }) {
  const isClickable = typeof onClick === "function";

  return (
    <span
      onClick={onClick}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      className={`inline-block rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1 text-xs text-neutral-300 transition-all duration-300 ${
        isClickable
          ? "cursor-pointer hover:scale-105 hover:border-brand-primary/50 hover:bg-neutral-800 hover:text-brand-primary hover:shadow-glow-sm active:scale-95"
          : ""
      } ${className}`.trim()}
    >
      {children}
    </span>
  );
}
