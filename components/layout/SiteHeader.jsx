"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { useWalletStore } from "../../store/useWalletStore";
import { useAdultGateStore } from "../../store/useAdultGateStore";
import { useHomeStore } from "../../store/useHomeStore";
import { useNotificationsStore } from "../../store/useNotificationsStore";
import TabButton from "../common/TabButton";
import Chip from "../common/Chip";
import LoginGateModal from "./LoginGateModal";
import AgeGateModal from "./AgeGateModal";
import { track } from "../../lib/analytics";

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
  const [activeModal, setActiveModal] = useState(null);
  const pathname = usePathname();
  const isLibrary = pathname === "/library";
  const isAdultHub = pathname === "/adult";

  useEffect(() => {
    if (!loaded) {
      loadNotifications();
    }
  }, [loaded, loadNotifications]);

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
    track("adult_gate_login", { source: "header" });
    signIn();
    const status = requestAdultToggle(true);
    if (status === "NEED_AGE_CONFIRM") {
      setActiveModal("age");
      return;
    }
    setActiveModal(null);
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
      <header className="sticky top-0 z-40 border-b border-neutral-900 bg-neutral-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="text-lg font-bold tracking-wide text-white"
            >
              MN
            </button>
            <div className="hidden flex-1 items-center gap-4 md:flex">
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
              <TabButton active={isLibrary} onClick={() => handleTabClick("library")}>
                Library
              </TabButton>
              <button
                type="button"
                onClick={() => router.push("/adult")}
                className={`text-sm ${isAdultHub ? "text-white" : "text-neutral-400 hover:text-white"}`}
              >
                Adult Hub
              </button>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 text-xs text-neutral-400 md:flex">
                <span>Paid {paidPts}</span>
                <span>Bonus {bonusPts}</span>
                <Chip>{plan}</Chip>
              </div>
              <button
                type="button"
                onClick={() => router.push("/notifications")}
                className="relative rounded-full border border-neutral-800 p-2 text-neutral-300 hover:text-white"
                aria-label="Notifications"
              >
                <Bell size={16} />
                {unreadCount > 0 ? (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                    {unreadCount}
                  </span>
                ) : null}
              </button>
              <button
                type="button"
                onClick={handleAdultToggle}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  isAdultMode
                    ? "border-red-500 text-red-300"
                    : "border-neutral-700 text-neutral-300"
                }`}
              >
                18+ {isAdultMode ? "ON" : "OFF"}
              </button>
              {isSignedIn ? (
                <button type="button" onClick={handleSignOut} className="text-sm text-neutral-200">
                  Sign out
                </button>
              ) : (
                <button type="button" onClick={handleLogin} className="text-sm text-neutral-200">
                  Sign in
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="search"
              placeholder="Search series"
              className="w-full rounded-full border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm text-neutral-200 placeholder:text-neutral-500"
              onChange={(event) => onSearch?.(event.target.value)}
            />
          </div>
          <div className="flex items-center gap-3 md:hidden">
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
            <TabButton active={isLibrary} onClick={() => handleTabClick("library")}>
              Library
            </TabButton>
          </div>
        </div>
      </header>

      <LoginGateModal
        open={activeModal === "login"}
        onClose={() => setActiveModal(null)}
        onConfirm={handleLogin}
      />
      <AgeGateModal
        open={activeModal === "age"}
        onClose={() => setActiveModal(null)}
        onConfirm={handleAgeConfirm}
        ageRuleKey={ageRuleKey}
        legalAge={legalAge}
      />
    </>
  );
}
