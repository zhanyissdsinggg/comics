import { memo } from "react";

/**
 * 老王注释：过期数据通知组件，提示用户当前显示的是缓存数据
 */
const StaleDataNotice = memo(function StaleDataNotice() {
  return (
    <section className="rounded-2xl border border-yellow-500/40 bg-yellow-500/10 p-4 text-sm text-yellow-200">
      Showing cached data. Reconnect to refresh.
    </section>
  );
});

export default StaleDataNotice;
