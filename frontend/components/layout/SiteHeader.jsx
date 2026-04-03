"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdultGateStore } from "../../store/useAdultGateStore";
import { useAuthStore } from "../../store/useAuthStore";
import { HomeProvider } from "../../store/useHomeStore";
import { getCookie } from "../../lib/cookies";
import { trackEvent } from "../../lib/trackEvent";
import HeaderLogo from "./HeaderLogo";
import HeaderNav from "./HeaderNav";
import HeaderSearch from "./HeaderSearch";

const HeaderActions = dynamic(() => import("./HeaderActionsRuntime"), {
  ssr: false,
  loading: () => <div className="hidden h-10 w-[10.5rem] sm:block" aria-hidden="true" />,
});
const HeaderModals = dynamic(() => import("./HeaderModalsRuntime"), {
  ssr: false,
});
const MobileBottomNav = dynamic(() => import("./MobileBottomNav"), {
  ssr: false,
});

export default function SiteHeader({ onSearch, variant = "default" }) {
  const router = useRouter();
  const { isAdultMode, legalAge, requestAdultToggle } = useAdultGateStore();
  const { isSignedIn, hydrated } = useAuthStore();
  const [activeModal, setActiveModal] = useState(null);
  const [authError, setAuthError] = useState("");
  const [pendingAdultToggle, setPendingAdultToggle] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const isHome = variant === "home";
  const isLight = variant === "light";

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem("mn_region") : null;
    const cookieRegion = getCookie("mn_region");
    if (typeof window !== "undefined" && stored !== cookieRegion) {
      window.localStorage.setItem("mn_region", stored || cookieRegion || "global");
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handler = (event) => {
      if (typeof event.stopImmediatePropagation === "function") {
        event.stopImmediatePropagation();
      }
      event.__mnAuthHandled = true;
      const returnTo = event?.detail?.returnTo || null;
      if (typeof window !== "undefined") {
        window.__mnAuthModalHandledAt = Date.now();
        if (returnTo) {
          window.sessionStorage.setItem("mn_return_to", returnTo);
        }
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
    const shouldOpenLogin =
      params.get("openLogin") === "1" || window.sessionStorage.getItem("mn_open_login") === "1";
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

  const handleAdultToggle = () => {
    trackEvent("adult_toggle_attempt", { isAdultMode });
    const cookieSignedIn = getCookie("mn_is_signed_in") === "1";
    const signedInForAdult = hydrated ? isSignedIn : isSignedIn || cookieSignedIn;
    const status = requestAdultToggle(signedInForAdult);

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
      trackEvent("adult_gate_enabled", { source: "header" });
      router.push("/adult");
    }

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

  const handleMenuClick = () => {
    setActiveModal("menu");
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
        data-site-header="1"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
        className={`sticky top-0 z-40 border-b transition-all duration-500 ease-out ${
          isHome
            ? scrolled
              ? "border-white/10 bg-[rgba(8,12,18,0.88)] shadow-[0_20px_48px_rgba(0,0,0,0.28)] backdrop-blur-2xl"
              : "border-white/6 bg-[rgba(8,12,18,0.56)] backdrop-blur-xl"
            : isLight
              ? scrolled
                ? "border-[color:var(--gush-border-strong)] bg-[rgba(251,247,240,0.9)] shadow-[var(--gush-shadow-header)] backdrop-blur-2xl"
                : "border-transparent bg-[rgba(251,247,240,0.6)] backdrop-blur-xl"
            : scrolled
              ? "border-white/10 bg-[rgba(17,16,15,0.92)] shadow-[0_20px_48px_rgba(0,0,0,0.28)] backdrop-blur-2xl"
              : "border-white/6 bg-[rgba(17,16,15,0.72)] backdrop-blur-xl"
        }`}
      >
        <div
          className={`relative mx-auto max-w-[1320px] px-3 sm:px-6 lg:px-8 ${
            isHome
              ? scrolled
                ? "before:absolute before:inset-x-6 before:bottom-0 before:h-px before:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.1),transparent)] before:content-['']"
                : ""
              : isLight
                ? scrolled
                  ? "before:absolute before:inset-x-6 before:bottom-0 before:h-px before:bg-[linear-gradient(90deg,transparent,rgba(36,30,20,0.12),transparent)] before:content-['']"
                  : ""
              : scrolled
                ? "before:absolute before:inset-x-6 before:bottom-0 before:h-px before:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.1),transparent)] before:content-['']"
                : ""
          }`}
        >
          <div className="flex min-h-[58px] items-center gap-2 py-2 sm:min-h-[64px] sm:gap-4 sm:py-2.5 lg:gap-6">
            <HeaderLogo variant={variant} />
            <HomeProvider>
              <HeaderNav variant={variant} />
            </HomeProvider>
            <div className="min-w-0 flex-1 md:max-w-md lg:max-w-[32rem] xl:max-w-[34rem]">
              <HeaderSearch onSearch={onSearch} variant={variant} />
            </div>
            <HeaderActions
              onWalletClick={handleWalletClick}
              onAdultToggleClick={handleAdultToggle}
              onLoginClick={handleLoginClick}
              onMenuClick={handleMenuClick}
              isAdultMode={isAdultMode}
              legalAge={legalAge}
              variant={variant}
            />
          </div>
        </div>
      </header>

      {activeModal ? (
        <HeaderModals
          activeModal={activeModal}
          onModalClose={handleModalClose}
          authError={authError}
          onAuthError={setAuthError}
          pendingAdultToggle={pendingAdultToggle}
          onPendingAdultToggleChange={setPendingAdultToggle}
          variant={variant}
        />
      ) : null}

      <MobileBottomNav />
    </>
  );
}
