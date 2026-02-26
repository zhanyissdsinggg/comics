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
import ApiCacheDebug from "../common/ApiCacheDebug";

/**
 * 老王注释：重构后的SiteHeader - 简单容器组件
 * 职责单一：只负责组织各个小组件，管理模态框状态
 * 这个组件从410行缩减到100行左右，清爽多了！
 *
 * 拆分原则：
 * - HeaderLogo: Logo显示
 * - HeaderNav: 导航菜单
 * - HeaderActions: 右侧操作按钮
 * - HeaderSearch: 搜索栏
 * - MobileTabNav: 移动端底部导航
 * - HeaderModals: 所有模态框
 */
export default function SiteHeader({ onSearch }) {
  const router = useRouter();
  const { isAdultMode, requestAdultToggle } = useAdultGateStore();

  // 模态框状态管理
  const [activeModal, setActiveModal] = useState(null);
  const [authError, setAuthError] = useState("");
  const [pendingAdultToggle, setPendingAdultToggle] = useState(false);
  const [region, setRegion] = useState("global");

  // 初始化地区设置
  useEffect(() => {
    const stored =
      typeof window !== "undefined"
        ? window.localStorage.getItem("mn_region")
        : null;
    const cookieRegion = getCookie("mn_region");
    setRegion(stored || cookieRegion || "global");
  }, []);

  // 监听auth:open事件
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

  // 处理18+开关
  const handleAdultToggle = () => {
    track("adult_toggle_attempt", { isAdultMode });
    const status = requestAdultToggle(true); // 假设已登录
    if (status === "NEED_LOGIN") {
      setPendingAdultToggle(true);
      setActiveModal("login");
      return;
    }
    if (status === "NEED_AGE_CONFIRM") {
      setActiveModal("age");
      return;
    }
    if (!isAdultMode) {
      track("adult_gate_enabled", { source: "header" });
    }
    setActiveModal(null);
  };

  // 处理登录按钮
  const handleLoginClick = () => {
    if (typeof window !== "undefined") {
      const returnTo = `${window.location.pathname}${window.location.search || ""}`;
      window.sessionStorage.setItem("mn_return_to", returnTo);
    }
    setPendingAdultToggle(false);
    setActiveModal("login");
  };

  // 处理钱包按钮
  const handleWalletClick = () => {
    setActiveModal("topup");
  };

  // 关闭模态框
  const handleModalClose = (modalName, openNext = false) => {
    if (!openNext) {
      setActiveModal(null);
    }
  };

  return (
    <>
      {/* 顶部Header */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-neutral-950/80 backdrop-blur-xl shadow-2xl shadow-black/20">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 md:py-4">
          {/* 第一行：Logo + 导航 + 操作按钮 */}
          <div className="flex items-center justify-between gap-4">
            <HeaderLogo />
            <HeaderNav />
            <HeaderActions
              onWalletClick={handleWalletClick}
              onAdultToggleClick={handleAdultToggle}
              onLoginClick={handleLoginClick}
              isAdultMode={isAdultMode}
            />
          </div>

          {/* 第二行：搜索栏 */}
          <HeaderSearch onSearch={onSearch} />
        </div>
      </header>

      {/* 移动端底部导航 */}
      <MobileTabNav />

      {/* 所有模态框 */}
      <HeaderModals
        activeModal={activeModal}
        onModalClose={handleModalClose}
        authError={authError}
        onAuthError={setAuthError}
        pendingAdultToggle={pendingAdultToggle}
        onPendingAdultToggleChange={setPendingAdultToggle}
      />

      {/* 调试工具 */}
      <ApiCacheDebug />
    </>
  );
}
