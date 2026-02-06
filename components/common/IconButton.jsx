/**
 * 老王注释：IconButton图标按钮组件 - 添加触摸反馈、悬停动画和品牌色
 */
export default function IconButton({ label, children, onClick }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="group inline-flex h-9 w-9 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-neutral-800 bg-neutral-900 text-neutral-200 transition-all duration-300 hover:border-brand-primary/50 hover:bg-neutral-800 hover:text-brand-primary hover:shadow-glow-sm active:scale-90 active:bg-neutral-700"
      style={{ willChange: "transform" }}
    >
      <div className="transition-transform duration-300 group-hover:scale-110 group-active:scale-95">
        {children}
      </div>
    </button>
  );
}
