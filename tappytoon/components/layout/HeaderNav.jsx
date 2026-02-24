"use client";

import { usePathname, useRouter } from "next/navigation";
import { useHomeStore } from "../../store/useHomeStore";
import TabButton from "../common/TabButton";

/**
 * 老王注释：导航菜单组件 - 只负责显示导航菜单
 * 职责单一：显示Home/Comics/Novels/Rankings菜单，处理菜单点击
 */
export default function HeaderNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { setHomeTab } = useHomeStore();

  const handleTabClick = (tab) => {
    if (tab === "library") {
      router.push("/library");
      return;
    }
    setHomeTab(tab);
    router.push("/");
  };

  return (
    <>
      {/* 桌面端导航菜单 */}
      <div className="hidden flex-1 items-center gap-4 md:flex">
        <button
          type="button"
          onClick={() => handleTabClick("home")}
          className="text-sm text-neutral-400 hover:text-white transition-colors"
          aria-label="Go to home"
        >
          Home
        </button>
        <TabButton
          active={pathname === "/comics"}
          onClick={() => router.push("/comics")}
        >
          Comics
        </TabButton>
        <TabButton
          active={pathname === "/novels"}
          onClick={() => router.push("/novels")}
        >
          Novels
        </TabButton>
        <button
          type="button"
          onClick={() => router.push("/rankings")}
          className="text-sm text-neutral-400 hover:text-white transition-colors"
          aria-label="Go to rankings"
        >
          Rankings
        </button>
      </div>

      {/* 移动端导航菜单（水平滚动） */}
      <div className="no-scrollbar flex items-center gap-2 overflow-x-auto md:hidden">
        <button
          type="button"
          onClick={() => handleTabClick("home")}
          className="whitespace-nowrap text-xs text-neutral-400 hover:text-white transition-colors"
          aria-label="Go to home"
        >
          Home
        </button>
        <TabButton
          active={pathname === "/comics"}
          onClick={() => router.push("/comics")}
        >
          Comics
        </TabButton>
        <TabButton
          active={pathname === "/novels"}
          onClick={() => router.push("/novels")}
        >
          Novels
        </TabButton>
        <button
          type="button"
          onClick={() => router.push("/rankings")}
          className="whitespace-nowrap text-xs text-neutral-400 hover:text-white transition-colors"
          aria-label="Go to rankings"
        >
          Rankings
        </button>
      </div>
    </>
  );
}
