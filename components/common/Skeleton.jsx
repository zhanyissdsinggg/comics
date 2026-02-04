/**
 * 老王注释：骨架屏组件，带shimmer闪烁动画
 * shimmer动画已经在globals.css里定义好了
 */
export default function Skeleton({ className = "" }) {
  return <div className={`skeleton ${className}`.trim()} />;
}
