// 老王注释：Tab按钮组件 - 添加微交互动画
export default function TabButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative px-3 py-2 text-sm font-semibold transition-all duration-300 active:scale-95 ${
        active ? "text-brand-primary" : "text-neutral-400 hover:text-neutral-200"
      }`}
    >
      {children}
      {/* 老王注释：选中态下划线 - 品牌色渐变 */}
      {active && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 animate-slide-up rounded-full bg-brand-gradient" />
      )}
    </button>
  );
}
