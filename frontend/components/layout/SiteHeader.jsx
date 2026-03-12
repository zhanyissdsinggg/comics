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
 * Header state and modal orchestration for the public site shell.
 */
export default function SiteHeader({ onSearch }) {
  const { isAdultMode, requestAdultToggle } = useAdultGateStore();
  const { isSignedIn, hydrated } = useAuthStore();
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
      event.__mnAuthHandled = true;
      const returnTo = event?.detail?.returnTo || null;
      if (returnTo && typeof window !== "undefined") {
        window.sessionStorage.setItem("mn_return_to", returnTo);
      }
      setActiveModal("login");
      setAuthError("");
    };
    window.addEventListener("auth:open", handler, true);
    return () => window.removeEventListener("auth:open", handler, true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const shouldOpenLogin = params.get("openLogin") === "1" || window.sessionStorage.getItem("mn_open_login") === "1";
    if (!shouldOpenLogin) {
      return;
    }

    const returnTo = window.sessionStorage.getItem("mn_return_to") || params.get("returnTo") || "/";
    window.sessionStorage.removeItem("mn_open_login");
    window.sessionStorage.setItem("mn_return_to", returnTo);
    setPendingAdultToggle(false);
    setActiveModal("login");
    setAuthError("");
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
    const signedInForAdult = hydrated ? isSignedIn : isSignedIn || cookieSignedIn;
    const status = requestAdultToggle(signedInForAdult);
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
        {/* 闂佸ジ顣﹂懗鍓佹暜閸ャ劌顕辨俊顖氭惈椤曆囨煥濞戞瑯鍔塐S 26婵＄偛顑呯€涒晠鎮ч幖浣瑰剭闁告洦鍋勭粈瀣偠濞戞瀚扮紒鏃堫棑娴狅箓鍩€?- 闂佸搫娲﹀娆撳Φ閸ヮ剚鍎嶉柛鏇ㄥ灣瑜邦垶骞栨潏鍓х暠闁硅渹鍗冲鑽ゅ鐎ｎ剛宕?*/}
        <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-3 sm:gap-6 px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <HeaderLogo />

          {/* 濠碘剝顨呴惌鍌氼焽閹殿喒鍋撴担鍐棈闁?*/}
          <HeaderNav />

          {/* 闂佸ジ顣﹂懗鍓佹暜閸ャ劌顕辨俊顖氭惈椤曆囨煥濞戞瑧顣查柟顔肩－濡叉劙濮€閿涘嫬鐒?- iOS 26婵＄偛顑呯€涒晠鎮ч幖浣瑰剭闁告洦鍋呮俊鍥偡?*/}
          <div className="min-w-0 flex-1 md:max-w-xs lg:max-w-sm">
            <HeaderSearch onSearch={onSearch} />
          </div>

          {/* 闂佸憡鐟ラ崢鏍疾閸洖绠肩€广儱瀚粙濠囨煙缁嬫妯€闁?*/}
          <HeaderActions
            onWalletClick={handleWalletClick}
            onAdultToggleClick={handleAdultToggle}
            onLoginClick={handleLoginClick}
            isAdultMode={isAdultMode}
          />
        </div>
      </header>

      {/* 缂備礁顦抽褎鎱ㄩ埡鍐崥妞ゆ牗姘ㄦ穱娲⒑椤斿搫濡兼い鏇憾閹?*/}
      <MobileTabNav />

      {/* 濠碘槅鍨崜婵嬪焵椤戣法鍔嶆い?*/}
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
