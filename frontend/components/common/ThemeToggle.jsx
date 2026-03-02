/**
 * 老王的主题切换按钮 - 欧美用户必备功能
 * 支持深色/浅色模式切换
 */
"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // 老王注释：避免服务端渲染时的hydration错误
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // 老王注释：服务端渲染时返回占位符
    return (
      <div className="w-10 h-10 rounded-lg bg-gray-800/50 animate-pulse" />
    );
  }

  const currentTheme = theme === "system" ? systemTheme : theme;
  const isDark = currentTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative p-2.5 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-all duration-200 group"
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      {/* 老王注释：太阳和月亮图标切换动画 */}
      <div className="relative w-5 h-5">
        <Sun
          size={20}
          className={`absolute inset-0 transition-all duration-300 ${
            isDark
              ? "rotate-90 scale-0 opacity-0"
              : "rotate-0 scale-100 opacity-100"
          } text-amber-400 group-hover:text-amber-300`}
        />
        <Moon
          size={20}
          className={`absolute inset-0 transition-all duration-300 ${
            isDark
              ? "rotate-0 scale-100 opacity-100"
              : "-rotate-90 scale-0 opacity-0"
          } text-blue-400 group-hover:text-blue-300`}
        />
      </div>
    </button>
  );
}
