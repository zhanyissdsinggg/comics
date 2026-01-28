"use client";

import { useEffect, useState } from "react";
import SiteHeader from "../layout/SiteHeader";
import Rail from "../home/Rail";
import Skeleton from "../common/Skeleton";
import { useAdultGateStore } from "../../store/useAdultGateStore";
import { useAuthStore } from "../../store/useAuthStore";
import AdultGateBlockingPanel from "../series/AdultGateBlockingPanel";
import LoginGateModal from "../layout/LoginGateModal";
import AgeGateModal from "../layout/AgeGateModal";
import { track } from "../../lib/analytics";

const adultItems = [
  { id: "a1", title: "After Dark", subtitle: "Thriller", coverTone: "noir", badge: "18+" },
  { id: "a2", title: "Velvet Room", subtitle: "Drama", coverTone: "dusk", badge: "18+" },
  { id: "a3", title: "Crimson", subtitle: "Romance", coverTone: "warm", badge: "18+" },
];

export default function AdultHubPage() {
  const {
    isAdultMode,
    requestAdultToggle,
    confirmAge,
    ageRuleKey,
    legalAge,
    requireLoginForAdult,
    adultConfirmed,
  } = useAdultGateStore();
  const { isSignedIn, signIn } = useAuthStore();
  const [activeModal, setActiveModal] = useState(null);
  const panelStatus =
    requireLoginForAdult && !isSignedIn
      ? "NEED_LOGIN"
      : adultConfirmed
        ? "OK"
        : "NEED_AGE_CONFIRM";

  const handleGate = () => {
    const wasAdultMode = isAdultMode;
    track("adult_toggle_attempt", { source: "adult-hub" });
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
      track("adult_gate_enabled", { source: "adult-hub" });
    }
    setActiveModal(null);
  };

  const handleLogin = () => {
    track("adult_gate_login", { source: "adult-hub" });
    signIn();
    const status = requestAdultToggle(true);
    if (status === "NEED_AGE_CONFIRM") {
      setActiveModal("age");
      return;
    }
    setActiveModal(null);
  };

  const handleAgeConfirm = (ruleKey) => {
    track("adult_gate_confirm", { source: "adult-hub", ruleKey });
    confirmAge(ruleKey);
    setActiveModal(null);
    track("adult_gate_enabled", { source: "adult-hub" });
  };

  useEffect(() => {
    track("view_adult", {});
  }, []);

  return (
    <div className="min-h-screen bg-neutral-950">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 pb-12 pt-8 space-y-8">
        <section className="rounded-3xl border border-red-900/60 bg-gradient-to-br from-red-950 via-neutral-950 to-neutral-950 p-8">
          <h1 className="text-3xl font-bold">Adult Hub</h1>
          <p className="mt-2 text-sm text-neutral-400">
            Mature-only stories curated for you.
          </p>
        </section>

        {!isAdultMode ? (
          <AdultGateBlockingPanel
            status={panelStatus === "OK" ? "NEED_AGE_CONFIRM" : panelStatus}
            onOpenModal={handleGate}
          />
        ) : (
          <Rail title="Adult Spotlight" items={adultItems} tone="noir" />
        )}

        <Skeleton className="h-32 w-full rounded-2xl" />
      </main>

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
    </div>
  );
}
