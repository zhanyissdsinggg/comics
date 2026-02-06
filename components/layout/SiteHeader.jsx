"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Home, Library, User, Receipt } from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { useWalletStore } from "../../store/useWalletStore";
import { useAdultGateStore } from "../../store/useAdultGateStore";
import { useHomeStore } from "../../store/useHomeStore";
import { useNotificationsStore } from "../../store/useNotificationsStore";
import { useBrandingStore } from "../../store/useBrandingStore";
import { getRegionConfig } from "../../lib/region/config";
import { getCookie } from "../../lib/cookies";
import TabButton from "../common/TabButton";
import Chip from "../common/Chip";
import SearchBar from "../common/SearchBar";
import LoginGateModal from "./LoginGateModal";
import AgeGateModal from "./AgeGateModal";
import { track } from "../../lib/analytics";
import ApiCacheDebug from "../common/ApiCacheDebug";

export default function SiteHeader({ onSearch }) {
  const router = useRouter();
  const { isSignedIn, signIn, signOut } = useAuthStore();
  const { paidPts, bonusPts, plan } = useWalletStore();
  const {
    isAdultMode,
    requestAdultToggle,
    confirmAge,
    ageRuleKey,
    legalAge,
    forceDisableAdultMode,
  } = useAdultGateStore();
  const { homeTab, setHomeTab } = useHomeStore();
  const { unreadCount, loadNotifications, loaded } = useNotificationsStore();
  const { branding } = useBrandingStore();
  const [activeModal, setActiveModal] = useState(null);
  const [pendingAdultToggle, setPendingAdultToggle] = useState(false);
  const [region, setRegion] = useState("global");
  const [authError, setAuthError] = useState("");
  const pathname = usePathname();
  const isLibrary = pathname === "/library";
  const isAdultHub = pathname === "/adult";

  useEffect(() => {
    const stored =
      typeof window !== "undefined"
        ? window.localStorage.getItem("mn_region")
        : null;
    const cookieRegion = getCookie("mn_region");
    setRegion(stored || cookieRegion || "global");
  }, []);

  useEffect(() => {
    if (!loaded) {
      loadNotifications(isAdultMode ? "1" : "0");
    }
  }, [loaded, loadNotifications, isAdultMode]);

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

  const handleTabClick = (tab) => {
    if (tab === "library") {
      router.push("/library");
      return;
    }
    setHomeTab(tab);
    router.push("/");
  };

  const handleAdultToggle = () => {
    const wasAdultMode = isAdultMode;
    track("adult_toggle_attempt", { isAdultMode });
    const status = requestAdultToggle(isSignedIn);
    if (status === "NEED_LOGIN") {
      setPendingAdultToggle(true);
      setActiveModal("login");
      return;
    }
    if (status === "NEED_AGE_CONFIRM") {
      setActiveModal("age");
      return;
    }
    if (!wasAdultMode) {
      track("adult_gate_enabled", { source: "header" });
    }
    setActiveModal(null);
  };

  const handleLogin = () => {
    if (typeof window !== "undefined") {
      const returnTo = `${window.location.pathname}${window.location.search || ""}`;
      window.sessionStorage.setItem("mn_return_to", returnTo);
    }
    setPendingAdultToggle(false);
    setActiveModal("login");
  };

  const handleAgeConfirm = (ruleKey) => {
    track("adult_gate_confirm", { source: "header", ruleKey });
    confirmAge(ruleKey);
    setActiveModal(null);
    track("adult_gate_enabled", { source: "header" });
  };

  const handleSignOut = () => {
    signOut();
    forceDisableAdultMode();
  };

  return (
    <>
      {/* 老王注释：玻璃态Header - 半透明背景 + 强模糊 + 微妙边框 + 阴影 */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-neutral-950/80 backdrop-blur-xl shadow-glass">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 md:py-4">
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="flex items-center gap-2 text-lg font-bold tracking-wide text-white"
            >
              {branding?.siteLogoUrl ? (
                <img
                  src={branding.siteLogoUrl}
                  alt="Site logo"
                  className="h-7 w-auto"
                />
              ) : (
                "MN"
              )}
            </button>
            <div className="hidden flex-1 items-center gap-4 md:flex">
              <button
                type="button"
                onClick={() => {
                  router.push("/");
                }}
                className="text-sm text-neutral-400 hover:text-white"
              >
                Home
              </button>
              <TabButton
                active={!isLibrary && !isAdultHub && homeTab === "comics"}
                onClick={() => handleTabClick("comics")}
              >
                Comics
              </TabButton>
              <TabButton
                active={!isLibrary && !isAdultHub && homeTab === "novels"}
                onClick={() => handleTabClick("novels")}
              >
                Novels
              </TabButton>
              <button
                type="button"
                onClick={() => {
                  router.push("/rankings");
                }}
                className="text-sm text-neutral-400 hover:text-white"
              >
                Rankings
              </button>
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              <button
                type="button"
                onClick={() => {
                  router.push("/notifications");
                }}
                className="relative min-h-[44px] min-w-[44px] rounded-full border border-neutral-800 bg-neutral-900/50 p-2 text-neutral-300 transition-all duration-300 hover:border-brand-primary/40 hover:bg-neutral-800 hover:text-white touch-manipulation active:scale-95"
                aria-label="Notifications"
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                <Bell size={16} />
                {unreadCount > 0 ? (
                  <>
                    {/* 老王注释：脉冲动画背景 */}
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 animate-ping rounded-full bg-red-500 opacity-75"></span>
                    {/* 老王注释：未读数量徽章 */}
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-lg">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  </>
                ) : null}
              </button>
              <button
                type="button"
                onClick={handleAdultToggle}
                className={`min-h-[44px] rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-300 touch-manipulation active:scale-95 ${
                  isAdultMode
                    ? "border-red-500 text-red-300"
                    : "border-neutral-700 text-neutral-300"
                }`}
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                18+ {isAdultMode ? "ON" : "OFF"}
              </button>
              {isSignedIn ? (
                <button
                  type="button"
                  onClick={() => router.push("/profile")}
                  className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border-2 border-emerald-500/20 bg-neutral-800 transition-all hover:border-emerald-500/40"
                  aria-label="Profile"
                  title="View Profile"
                >
                  <User size={16} className="text-neutral-300" />
                </button>
              ) : (
                <button type="button" onClick={handleLogin} className="text-sm text-neutral-200">
                  Sign in
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <SearchBar onSearch={onSearch} placeholder="Search series" />
          </div>
          <div className="no-scrollbar flex items-center gap-2 overflow-x-auto md:hidden">
            <button
              type="button"
              onClick={() => {
                router.push("/");
              }}
              className="whitespace-nowrap text-xs text-neutral-400"
            >
              Home
            </button>
            <TabButton
              active={!isLibrary && !isAdultHub && homeTab === "comics"}
              onClick={() => handleTabClick("comics")}
            >
              Comics
            </TabButton>
            <TabButton
              active={!isLibrary && !isAdultHub && homeTab === "novels"}
              onClick={() => handleTabClick("novels")}
            >
              Novels
            </TabButton>
            <button
              type="button"
              onClick={() => {
                router.push("/rankings");
              }}
              className="whitespace-nowrap text-xs text-neutral-400"
            >
              Rankings
            </button>
          </div>
        </div>
      </header>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-neutral-900 bg-neutral-950/90 px-3 pb-3 pt-2 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 rounded-2xl border border-neutral-900/80 bg-neutral-900/60 px-2 py-2 text-[11px] tracking-[0.02em] text-neutral-300 shadow-lg">
          <button
            type="button"
            onClick={() => router.push("/")}
            className={`flex min-w-[52px] flex-col items-center gap-1 rounded-xl px-3 py-2 ${
              pathname === "/" ? "bg-white text-neutral-900" : "text-neutral-200"
            }`}
            aria-label="Home"
          >
            <Home size={16} />
            <span className="text-[10px] uppercase tracking-[0.18em]">Home</span>
          </button>
          <button
            type="button"
            onClick={() => router.push("/library")}
            className={`flex min-w-[52px] flex-col items-center gap-1 rounded-xl px-3 py-2 ${
              pathname === "/library" ? "bg-white text-neutral-900" : "text-neutral-200"
            }`}
            aria-label="Library"
          >
            <Library size={16} />
            <span className="text-[10px] uppercase tracking-[0.18em]">Library</span>
          </button>
          <button
            type="button"
            onClick={() => router.push("/account")}
            className={`flex min-w-[52px] flex-col items-center gap-1 rounded-xl px-3 py-2 ${
              pathname === "/account" ? "bg-white text-neutral-900" : "text-neutral-200"
            }`}
            aria-label="Account"
          >
            <User size={16} />
            <span className="text-[10px] uppercase tracking-[0.18em]">Account</span>
          </button>
          <button
            type="button"
            onClick={() => router.push("/orders")}
            className={`flex min-w-[52px] flex-col items-center gap-1 rounded-xl px-3 py-2 ${
              pathname === "/orders" ? "bg-white text-neutral-900" : "text-neutral-200"
            }`}
            aria-label="Orders"
          >
            <Receipt size={16} />
            <span className="text-[10px] uppercase tracking-[0.18em]">Orders</span>
          </button>
          
        </div>
      </nav>

      <LoginGateModal
        open={activeModal === "login"}
        onClose={() => {
          setActiveModal(null);
          setPendingAdultToggle(false);
          setAuthError("");
        }}
        allowRegister
        title="Sign in"
        description="Enter your email and password."
        errorMessage={authError}
        onSubmit={async ({ email, password, mode }) => {
          const response = await signIn(email, password, mode);
          if (response?.status === 202) {
            setAuthError("");
            return response;
          }
          if (response.ok) {
            if (pendingAdultToggle) {
              const status = requestAdultToggle(true);
              if (status === "NEED_AGE_CONFIRM") {
                setActiveModal("age");
                return;
              }
            }
            setActiveModal(null);
            setPendingAdultToggle(false);
            setAuthError("");
            if (typeof window !== "undefined") {
              const returnTo = window.sessionStorage.getItem("mn_return_to");
              if (returnTo) {
                window.sessionStorage.removeItem("mn_return_to");
                router.push(returnTo);
              }
            }
            return;
          }
          setAuthError(
            mode === "register"
              ? "Registration failed. Try a different email."
              : "Invalid email or password."
          );
          return response;
        }}
      />
      <AgeGateModal
        open={activeModal === "age"}
        onClose={() => setActiveModal(null)}
        onConfirm={handleAgeConfirm}
        ageRuleKey={ageRuleKey}
        legalAge={legalAge}
      />
      <ApiCacheDebug />
    </>
  );
}
