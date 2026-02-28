"use client";

import { usePathname, useRouter } from "next/navigation";
import { useHomeStore } from "../../store/useHomeStore";

const NAV_ITEMS = [
  { id: "home", label: "Home", href: "/" },
  { id: "comics", label: "Comics", href: "/comics" },
  { id: "novels", label: "Novels", href: "/novels" },
  { id: "rankings", label: "Rankings", href: "/rankings" },
];

/**
 * HeaderNav - 参考 Webtoon 的顶部导航
 * 激活项：品牌色下划线 + 白色文字
 * 非激活项：灰色文字 + hover时白色
 */
export default function HeaderNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { setHomeTab } = useHomeStore();

  const handleClick = (item) => {
    if (item.id === "home") {
      setHomeTab("home");
    }
    router.push(item.href);
  };

  return (
    <nav className="hidden flex-1 items-center gap-1 md:flex">
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => handleClick(item)}
            aria-label={`Go to ${item.label}`}
            className={`relative px-3 py-2 text-sm font-semibold transition-colors duration-200 ${
              isActive ? "text-white" : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            {item.label}
            {/* 下划线激活指示器 - 像 Webtoon */}
            {isActive && (
              <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-emerald-500" />
            )}
          </button>
        );
      })}
    </nav>
  );
}
