/**
 * 老王注释：IconButton图标按钮组件，添加触摸反馈和动画
 */
export default function IconButton({ label, children, onClick }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="inline-flex h-9 w-9 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-neutral-800 bg-neutral-900 text-neutral-200 transition-all hover:border-neutral-600 hover:bg-neutral-800 active:scale-95 active:bg-neutral-700"
      style={{ willChange: "transform" }}
    >
      {children}
    </button>
  );
}
