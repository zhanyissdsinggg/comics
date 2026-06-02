import { useBackendMeta } from "../../hooks/useBackendMeta";

/**
 * 老王说：后端版本信息badge
 * 只在开发环境显示，生产环境隐藏（避免暴露技术栈信息）
 */
export default function BackendMetaBadge() {
  const meta = useBackendMeta();

  // 老王注释：生产环境不显示这个SB badge
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  if (!meta) {
    return null;
  }

  return (
    <div className="fixed bottom-2 right-2 z-40 rounded-full border border-white/10 bg-[rgba(11,10,16,0.84)] px-3 py-1 text-[10px] text-white/54 shadow-[0_14px_30px_rgba(8,6,20,0.24)] backdrop-blur-xl">
      {meta.name} v{meta.version}
    </div>
  );
}
