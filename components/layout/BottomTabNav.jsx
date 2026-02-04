/**
 * 老王注释：移动端底部Tab导航组件
 * 提升移动端用户体验，快速访问主要功能
 */
"use client";

import { usePathname, useRouter } from "next/navigation";
import { memo } from "react";

const BottomTabNav = memo(function BottomTabNav() {
  const pathname = usePathname();
  const router = useRouter();

  const tabs = [
    {
      id: "home",
      label: "首页",
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      ),
      path: "/",
      isActive: pathname === "/",
    },
    {
      id: "library",
      label: "书架",
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          />
        </svg>
      ),
      path: "/library",
      isActive: pathname.startsWith("/library"),
    },
    {
      id: "store",
      label: "商店",
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
          />
        </svg>
      ),
      path: "/store",
      isActive: pathname.startsWith("/store"),
    },
    {
      id: "account",
      label: "我的",
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      ),
      path: "/account",
      isActive: pathname.startsWith("/account"),
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-neutral-800 bg-neutral-950/95 backdrop-blur-lg md:hidden">
      <div className="flex items-center justify-around">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => router.push(tab.path)}
            className={`flex min-h-[60px] flex-1 flex-col items-center justify-center gap-1 transition-all active:scale-95 ${
              tab.isActive
                ? "text-emerald-400"
                : "text-neutral-400 hover:text-neutral-300 active:text-emerald-400"
            }`}
            style={{ willChange: "transform" }}
          >
            <div className={`transition-transform ${tab.isActive ? "scale-110" : ""}`}>
              {tab.icon}
            </div>
            <span className="text-[10px] font-semibold">{tab.label}</span>
            {tab.isActive && (
              <div className="absolute bottom-0 h-0.5 w-12 rounded-full bg-emerald-400" />
            )}
          </button>
        ))}
      </div>
    </nav>
  );
});

export default BottomTabNav;
