"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAdultGateStore } from "../../store/useAdultGateStore";
import { useAuthStore } from "../../store/useAuthStore";
import { HomeProvider } from "../../store/useHomeStore";
import { getCookie } from "../../lib/cookies";
import { trackEvent } from "../../lib/trackEvent";
import HeaderLogo from "./HeaderLogo";
import HeaderNav from "./HeaderNav";
import MobileTabNav from "./MobileTabNav";
import HeaderActions from "./HeaderActions";

const HeaderSearch = dynamic(() => import("./HeaderSearch"), {
  ssr: false,
});

const UTILITY_LINKS = [
  { label: "Free episodes", href: "/rankings?type=ttf&window=all" },
  { label: "Weekly chart", href: "/rankings?type=popular&window=week" },
  { label: "Creator hub", href: "/creators" },
];

export default function SiteHeader({ onSearch }) {
  const { isAdultMode, legalAge, requestAdultToggle } = useAdultGateStore();
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
        className={`sticky top-0 z-40 border-b transition-all duration-500 ease-out ${
          scrolled
            ? "border-white/10 bg-neutral-950/90 shadow-[0_18px_60px_rgba(0,0,0,0.22)] backdrop-blur-2xl"
            : "border-white/6 bg-neutral-950/78 backdrop-blur-xl"
        }`}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/40 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.08),transparent_32%),radial-gradient(circle_at_85%_0%,rgba(34,211,238,0.06),transparent_24%)] opacity-90" />
        <div className="relative mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
          <div className="hidden items-center justify-between border-b border-white/6 py-2.5 lg:flex">
            <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-400">
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/[0.08] px-2.5 py-1 text-emerald-200">
                Editor's desk
              </span>
              <span>Official comics, weekly drops, and premium reading picks</span>
            </div>

            <div className="flex items-center gap-2">
              {UTILITY_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-neutral-300 transition-colors hover:border-white/16 hover:bg-white/[0.06] hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex min-h-[76px] items-center gap-3 py-3 sm:gap-6">
            <HeaderLogo />
            <HomeProvider>
              <HeaderNav />
            </HomeProvider>
            <div className="min-w-0 flex-1 md:max-w-sm lg:max-w-md xl:max-w-[36rem]">
              <HeaderSearch onSearch={onSearch} />
            </div>
            <HeaderActions
              onWalletClick={handleWalletClick}
              onAdultToggleClick={handleAdultToggle}
              onLoginClick={handleLoginClick}
              isAdultMode={isAdultMode}
              legalAge={legalAge}
            />
          </div>
        </div>
      </header>

      <MobileTabNav />

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
