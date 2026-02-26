"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SiteHeader from "../layout/SiteHeader";
import { useAuthStore } from "../../store/useAuthStore";
import { useAdultGateStore } from "../../store/useAdultGateStore";
import LoginGateModal from "../layout/LoginGateModal";
import AgeGateModal from "../layout/AgeGateModal";
import { track } from "../../lib/analytics";
import {
  ADULT_GATE_ACTION_LABELS,
  ADULT_GATE_DESCRIPTIONS,
  ADULT_GATE_TITLES,
} from "../../lib/adultGateCopy";

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
  const [authError, setAuthError] = useState("");

  const reason = searchParams.get("reason") || "NEED_ADULT_MODE";
  const returnTo = searchParams.get("returnTo") || "/adult";

  const titleMap = useMemo(() => ADULT_GATE_TITLES, []);
  const descriptionMap = useMemo(() => ADULT_GATE_DESCRIPTIONS, []);

  const handleLogin = async ({ email, password, mode }) => {
    track("adult_gate_login", { reason });
    const response = await signIn(email, password, mode);
    if (response?.status === 202) {
      setAuthError("");
      return response;
    }
    if (!response.ok) {
      setAuthError("Invalid email or password.");
      return;
    }
    const status = requestAdultToggle(true);
    if (status === "NEED_AGE_CONFIRM") {
      setActiveModal("age");
      return;
    }
    track("adult_gate_enabled", { reason });
    router.replace(returnTo);
    return response;
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

  useEffect(() => {
    track("adult_gate_blocked", { source: "adult-gate-page", reason, returnTo });
  }, [reason, returnTo]);

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
            {ADULT_GATE_ACTION_LABELS[reason] || "Continue"}
          </button>
          {isSignedIn && reason === "NEED_LOGIN" ? (
            <p className="mt-4 text-xs text-neutral-500">
              You are already signed in.
            </p>
          ) : null}
        </div>
      </main>

      <LoginGateModal
        open={activeModal === "login"}
        onClose={() => {
          setActiveModal(null);
          setAuthError("");
        }}
        onSubmit={handleLogin}
        errorMessage={authError}
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
