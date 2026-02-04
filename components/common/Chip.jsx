/**
 * 老王注释：Chip标签组件，添加微妙的过渡效果
 */
export default function Chip({ children, className = "" }) {
  return (
    <span
      className={`rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1 text-xs text-neutral-300 transition-colors ${className}`.trim()}
    >
      {children}
    </span>
  );
}
