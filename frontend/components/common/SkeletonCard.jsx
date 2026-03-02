/**
 * 老王的骨架屏组件 - 加载时显示，避免用户以为网站挂了
 */
export default function SkeletonCard() {
  return (
    <div className="animate-pulse">
      {/* 封面图骨架 */}
      <div className="bg-gray-700/50 rounded-lg aspect-[2/3] mb-3"></div>
      {/* 标题骨架 */}
      <div className="h-4 bg-gray-700/50 rounded w-3/4 mb-2"></div>
      {/* 副标题骨架 */}
      <div className="h-3 bg-gray-700/50 rounded w-1/2"></div>
    </div>
  );
}
