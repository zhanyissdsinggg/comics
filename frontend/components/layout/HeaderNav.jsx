"use client";

import { usePathname, useRouter } from "next/navigation";
import { useHomeStore } from "../../store/useHomeStore";
import TabButton from "../common/TabButton";

/**
 * HeaderNav - 顶部导航菜单
 * 桌面端：显示 Home / Comics / Novels / Rankings
 * 移动端：隐藏（由底部 MobileTabNav 负责）
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
  );
}
