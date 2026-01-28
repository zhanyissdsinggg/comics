"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SiteHeader from "../../components/layout/SiteHeader";
import { useAuthStore } from "../../store/useAuthStore";
import { useAdultGateStore } from "../../store/useAdultGateStore";
import LoginGateModal from "../../components/layout/LoginGateModal";
import AgeGateModal from "../../components/layout/AgeGateModal";
import { track } from "../../lib/analytics";

export default function AdultGatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSignedIn, signIn } = useAuthStore();
  const {
    confirmAge,
    enableAdultMode,
    ageRuleKey,
    legalAge,
    requestAdultToggle,
  } = useAdultGateStore();
  const [activeModal, setActiveModal] = useState(null);

  const reason = searchParams.get("reason") || "NEED_ADULT_MODE";
  const returnTo = searchParams.get("returnTo") || "/adult";

  const titleMap = useMemo(
    () => ({
      NEED_LOGIN: "Sign in required",
      NEED_AGE_CONFIRM: "Confirm your age",
      NEED_ADULT_MODE: "Enable adult mode",
    }),
    []
  );

  const descriptionMap = useMemo(
    () => ({
      NEED_LOGIN: "Please sign in before accessing adult content.",
      NEED_AGE_CONFIRM: "Confirm your age to continue.",
      NEED_ADULT_MODE: "Turn on 18+ mode to view adult content.",
    }),
    []
  );

  const handleLogin = () => {
    track("adult_gate_login", { reason });
    signIn();
    const status = requestAdultToggle(true);
    if (status === "NEED_AGE_CONFIRM") {
      setActiveModal("age");
      return;
    }
    track("adult_gate_enabled", { reason });
    router.replace(returnTo);
  };

  const handleAgeConfirm = (ruleKey) => {
    track("adult_gate_confirm", { reason, ruleKey });
    confirmAge(ruleKey);
    track("adult_gate_enabled", { reason });
    router.replace(returnTo);
  };

  const handleEnableAdult = () => {
    track("adult_gate_enabled", { reason });
    enableAdultMode();
    router.replace(returnTo);
  };

  const handleOpen = () => {
    if (reason === "NEED_LOGIN") {
      setActiveModal("login");
      return;
    }
    if (reason === "NEED_AGE_CONFIRM") {
      setActiveModal("age");
      return;
    }
    handleEnableAdult();
  };

  return (
    <div className="min-h-screen bg-neutral-950">
      <SiteHeader />
      <main className="mx-auto flex min-h-[70vh] max-w-6xl items-center justify-center px-4">
        <div className="w-full max-w-md rounded-3xl border border-neutral-900 bg-neutral-900/60 p-6 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">
            Adult Gate
          </p>
          <h1 className="mt-3 text-2xl font-semibold">{titleMap[reason]}</h1>
          <p className="mt-2 text-sm text-neutral-400">{descriptionMap[reason]}</p>
          <button
            type="button"
            onClick={handleOpen}
            className="mt-6 w-full rounded-full bg-white px-5 py-2 text-sm font-semibold text-neutral-900"
          >
            {reason === "NEED_LOGIN" ? "Sign in" : reason === "NEED_AGE_CONFIRM" ? "Confirm age" : "Enable 18+"}
          </button>
          {isSignedIn && reason === "NEED_LOGIN" ? (
            <p className="mt-4 text-xs text-neutral-500">You are already signed in.</p>
          ) : null}
        </div>
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
