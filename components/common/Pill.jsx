/**
 * 老王注释：Pill标签组件，添加微妙的过渡效果
 */
export default function Pill({ children, className = "" }) {
  return (
    <span
      className={`rounded-full border border-neutral-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors ${className}`.trim()}
    >
      {children}
    </span>
  );
}
