/**
 * 老王注释：页面过渡动画组件
 * 让页面切换更流畅，不那么生硬
 */
"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function PageTransition({ children }) {
  const pathname = usePathname();
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    // 老王注释：路径变化时触发过渡动画
    setIsTransitioning(true);
    const timer = setTimeout(() => {
      setIsTransitioning(false);
    }, 150);

    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <div
      className={`transition-opacity duration-150 ${
        isTransitioning ? "opacity-0" : "opacity-100"
      }`}
      style={{ willChange: "opacity" }}
    >
      {children}
    </div>
  );
}
