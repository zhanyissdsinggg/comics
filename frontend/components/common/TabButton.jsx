// iOS风格Tab按钮组件 - 大圆角 + emerald色系 + 更大触摸区域
export default function TabButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative min-h-[44px] rounded-[12px] px-4 py-2.5 text-sm font-semibold transition-all duration-300 touch-manipulation active:scale-95 ${
        active
          ? "bg-emerald-500/10 text-emerald-400 shadow-lg shadow-emerald-500/20"
          : "text-neutral-400 hover:bg-white/5 hover:text-neutral-200"
      }`}
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      {children}
      {/* iOS风格选中态下划线 - emerald渐变 */}
      {active && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 animate-slide-up rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500" />
      )}
    </button>
  );
}
