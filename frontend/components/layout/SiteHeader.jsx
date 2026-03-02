"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdultGateStore } from "../../store/useAdultGateStore";
import { track } from "../../lib/analytics";
import { getCookie } from "../../lib/cookies";
import HeaderLogo from "./HeaderLogo";
import HeaderNav from "./HeaderNav";
import HeaderActions from "./HeaderActions";
import HeaderSearch from "./HeaderSearch";
import MobileTabNav from "./MobileTabNav";
import HeaderModals from "./HeaderModals";

/**
 * SiteHeader - 参考 Webtoon/Tapas 的导航栏设计
 * - 单行布局：Logo | Nav | SearchBar | Actions
 * - 滚动时半透明毛玻璃效果
 * - 品牌色下划线导航
 */
export default function SiteHeader({ onSearch }) {
  const router = useRouter();
  const { isAdultMode, requestAdultToggle } = useAdultGateStore();
  const [activeModal, setActiveModal] = useState(null);
  const [authError, setAuthError] = useState("");
  const [pendingAdultToggle, setPendingAdultToggle] = useState(false);
  const [region, setRegion] = useState("global");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem("mn_region") : null;
    const cookieRegion = getCookie("mn_region");
    setRegion(stored || cookieRegion || "global");
  }, []);

  // 滚动检测 - 滚动后加深背景
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handler = (event) => {
      const returnTo = event?.detail?.returnTo || null;
      if (returnTo && typeof window !== "undefined") {
        window.sessionStorage.setItem("mn_return_to", returnTo);
      }
      setActiveModal("login");
      setAuthError("");
    };
    window.addEventListener("auth:open", handler);
    return () => window.removeEventListener("auth:open", handler);
  }, []);

  const handleAdultToggle = () => {
    track("adult_toggle_attempt", { isAdultMode });
    const status = requestAdultToggle(true);
    if (status === "NEED_LOGIN") { setPendingAdultToggle(true); setActiveModal("login"); return; }
    if (status === "NEED_AGE_CONFIRM") { setActiveModal("age"); return; }
    if (!isAdultMode) { track("adult_gate_enabled", { source: "header" }); }
    setActiveModal(null);
  };

  const handleLoginClick = () => {
    if (typeof window !== "undefined") {
      const returnTo = `${window.location.pathname}${window.location.search || ""}`;
      window.sessionStorage.setItem("mn_return_to", returnTo);
    }
    setPendingAdultToggle(false);
    setActiveModal("login");
  };

  const handleWalletClick = () => setActiveModal("topup");
  const handleModalClose = (_, openNext = false) => { if (!openNext) setActiveModal(null); };

  return (
    <>
      <header
        className={`sticky top-0 z-40 transition-all duration-500 ease-out ${
          scrolled
            ? "border-b border-white/10 bg-neutral-950/98 shadow-ios-lg backdrop-blur-2xl"
            : "border-b border-white/5 bg-neutral-950/90 backdrop-blur-xl"
        }`}
      >
        {/* 老王优化：iOS 26风格的单行布局 - 更大的高度和间距 */}
        <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-6 px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <HeaderLogo />

          {/* 桌面导航 */}
          <HeaderNav />

          {/* 老王优化：搜索栏 - iOS 26风格的圆角 */}
          <div className="flex-1 md:max-w-xs lg:max-w-sm">
            <HeaderSearch onSearch={onSearch} />
          </div>

          {/* 右侧操作按钮 */}
          <HeaderActions
            onWalletClick={handleWalletClick}
            onAdultToggleClick={handleAdultToggle}
            onLoginClick={handleLoginClick}
            isAdultMode={isAdultMode}
          />
        </div>
      </header>

      {/* 移动端底部导航 */}
      <MobileTabNav />

      {/* 模态框 */}
      <HeaderModals
        activeModal={activeModal}
        onModalClose={handleModalClose}
        authError={authError}
        onAuthError={setAuthError}
        pendingAdultToggle={pendingAdultToggle}
        onPendingAdultToggleChange={setPendingAdultToggle}
      />
    </>
  );
}
