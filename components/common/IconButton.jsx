/**
 * iOS风格IconButton图标按钮组件 - 大圆角 + emerald色系 + 触摸反馈
 */
export default function IconButton({ label, children, onClick }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="group inline-flex h-9 w-9 min-h-[44px] min-w-[44px] items-center justify-center rounded-[16px] border border-white/5 bg-white/5 backdrop-blur-md text-neutral-300 transition-all duration-300 hover:border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-400 hover:shadow-lg hover:shadow-emerald-500/20 active:scale-90 touch-manipulation"
      style={{ willChange: "transform", WebkitTapHighlightColor: "transparent" }}
    >
      <div className="transition-transform duration-300 group-hover:scale-110 group-active:scale-95">
        {children}
      </div>
    </button>
  );
}
