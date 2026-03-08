"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useAdultGateStore } from "../../store/useAdultGateStore";
import { useAuthStore } from "../../store/useAuthStore";
import { getCookie } from "../../lib/cookies";
import { trackEvent } from "../../lib/trackEvent";
import HeaderLogo from "./HeaderLogo";
import HeaderNav from "./HeaderNav";
import MobileTabNav from "./MobileTabNav";
import HeaderActions from "./HeaderActions";

const HeaderSearch = dynamic(() => import("./HeaderSearch"), {
  ssr: false,
});

/**
 * NOTE: cleaned corrupted comment.
 * NOTE: cleaned corrupted comment.
 * - 婊氬姩鏃跺崐閫忔槑姣涚幓鐠冩晥鏋? * - 鍝佺墝鑹蹭笅鍒掔嚎瀵艰埅
 */
export default function SiteHeader({ onSearch }) {
  const { isAdultMode, requestAdultToggle } = useAdultGateStore();
  const { isSignedIn } = useAuthStore();
  const [activeModal, setActiveModal] = useState(null);
  const [authError, setAuthError] = useState("");
  const [pendingAdultToggle, setPendingAdultToggle] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [HeaderModalsComponent, setHeaderModalsComponent] = useState(null);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem("mn_region") : null;
    const cookieRegion = getCookie("mn_region");
    if (typeof window !== "undefined" && stored !== cookieRegion) {
      window.localStorage.setItem("mn_region", stored || cookieRegion || "global");
    }
  }, []);

  // Scroll state for translucent/sticky header style
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

  useEffect(() => {
    let cancelled = false;
    if (activeModal && !HeaderModalsComponent) {
      import("./HeaderModals")
        .then((mod) => {
          if (!cancelled) {
            setHeaderModalsComponent(() => mod.default);
          }
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, [activeModal, HeaderModalsComponent]);

  const handleAdultToggle = () => {
    trackEvent("adult_toggle_attempt", { isAdultMode });
    const cookieSignedIn = getCookie("mn_is_signed_in") === "1";
    const status = requestAdultToggle(isSignedIn || cookieSignedIn);
    if (status === "NEED_LOGIN") { setPendingAdultToggle(true); setActiveModal("login"); return; }
    if (status === "NEED_AGE_CONFIRM") { setActiveModal("age"); return; }
    if (!isAdultMode) { trackEvent("adult_gate_enabled", { source: "header" }); }
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
  const handleModalClose = (nextModal = null, openNext = false) => {
    if (openNext && nextModal) {
      setActiveModal(nextModal);
      return;
    }
    setActiveModal(null);
  };

  return (
    <>
      <header
        className={`sticky top-0 z-40 transition-all duration-500 ease-out ${
          scrolled
            ? "border-b border-white/10 bg-neutral-950/98 shadow-ios-lg backdrop-blur-2xl"
            : "border-b border-white/5 bg-neutral-950/90 backdrop-blur-xl"
        }`}
      >
        {/* 鑰佺帇浼樺寲锛歩OS 26椋庢牸鐨勫崟琛屽竷灞€ - 鏇村ぇ鐨勯珮搴﹀拰闂磋窛 */}
        <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-3 sm:gap-6 px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <HeaderLogo />

          {/* 妗岄潰瀵艰埅 */}
          <HeaderNav />

          {/* 鑰佺帇浼樺寲锛氭悳绱㈡爮 - iOS 26椋庢牸鐨勫渾瑙?*/}
          <div className="min-w-0 flex-1 md:max-w-xs lg:max-w-sm">
            <HeaderSearch onSearch={onSearch} />
          </div>

          {/* 鍙充晶鎿嶄綔鎸夐挳 */}
          <HeaderActions
            onWalletClick={handleWalletClick}
            onAdultToggleClick={handleAdultToggle}
            onLoginClick={handleLoginClick}
            isAdultMode={isAdultMode}
          />
        </div>
      </header>

      {/* 绉诲姩绔簳閮ㄥ鑸?*/}
      <MobileTabNav />

      {/* 妯℃€佹 */}
      {activeModal && HeaderModalsComponent ? (
        <HeaderModalsComponent
          activeModal={activeModal}
          onModalClose={handleModalClose}
          authError={authError}
          onAuthError={setAuthError}
          pendingAdultToggle={pendingAdultToggle}
          onPendingAdultToggleChange={setPendingAdultToggle}
        />
      ) : null}
    </>
  );
}
