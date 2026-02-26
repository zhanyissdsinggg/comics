"use client";

import { usePathname, useRouter } from "next/navigation";
import { Home, Library, User, Receipt } from "lucide-react";

/**
 * 老王注释：移动端底部导航组件 - 只负责移动端底部Tab导航
 * 职责单一：显示移动端底部导航，处理导航点击
 * 这个组件只在移动端显示，桌面端隐藏
 */
export default function MobileTabNav() {
  const pathname = usePathname();
  const router = useRouter();

  const tabs = [
    {
      id: "home",
      label: "Home",
      icon: Home,
      path: "/",
      isActive: pathname === "/",
    },
    {
      id: "library",
      label: "Library",
      icon: Library,
      path: "/library",
      isActive: pathname === "/library",
    },
    {
      id: "account",
      label: "Account",
      icon: User,
      path: "/account",
      isActive: pathname === "/account",
    },
    {
      id: "orders",
      label: "Orders",
      icon: Receipt,
      path: "/orders",
      isActive: pathname === "/orders",
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/5 bg-neutral-950/90 px-3 pb-3 pt-2 backdrop-blur-xl md:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-around gap-2 rounded-[24px] border border-white/5 bg-neutral-900/60 backdrop-blur-md px-3 py-2.5 shadow-2xl shadow-black/20">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => router.push(tab.path)}
              className={`group flex items-center justify-center rounded-[16px] p-3 transition-all duration-300 ${
                tab.isActive
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                  : "text-neutral-200 hover:bg-white/5 active:scale-[0.95]"
              }`}
              aria-label={tab.label}
              aria-current={tab.isActive ? "page" : undefined}
            >
              <Icon size={20} className="transition-transform duration-300 group-hover:scale-110" />
            </button>
          );
        })}
      </div>
    </nav>
  );
}
